const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { presenteId, presenteNome, preco, nomeComprador } = JSON.parse(event.body);

  const payload = JSON.stringify({
    items: [{
      title: presenteNome,
      quantity: 1,
      unit_price: preco,
      currency_id: 'BRL'
    }],
    payer: { name: nomeComprador },
    back_urls: {
      success: `https://casamentodelethami.netlify.app/?pagamento=sucesso&presente=${presenteId}&nome=${encodeURIComponent(nomeComprador)}`,
      failure: `https://casamentodelethami.netlify.app/?pagamento=falha`,
      pending: `https://casamentodelethami.netlify.app/?pagamento=pendente`
    },
    auto_return: 'approved',
    statement_descriptor: 'Del e Thami'
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.mercadopago.com',
      path: '/checkout/preferences',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        if (response.init_point) {
          resolve({
            statusCode: 200,
            body: JSON.stringify({ url: response.init_point })
          });
        } else {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ erro: 'Erro ao criar pagamento' })
          });
        }
      });
    });
    req.on('error', () => resolve({ statusCode: 500, body: 'Erro de conexão' }));
    req.write(payload);
    req.end();
  });
};
