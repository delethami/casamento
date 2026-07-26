const https = require('https');

exports.handler = async function(event) {
  try {
    const presenteId = event.queryStringParameters?.presente;
    const nomeComprador = decodeURIComponent(event.queryStringParameters?.nome || '');
    const body = event.body ? JSON.parse(event.body) : {};
    const paymentId = body.data?.id;

    if (!paymentId || !presenteId) {
      return { statusCode: 200, body: 'ok' };
    }

    // Buscar status do pagamento no MP
    const pagamento = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.mercadopago.com',
        path: `/v1/payments/${paymentId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });

    if (pagamento.status === 'approved') {
      // Salvar no Firebase
      await new Promise((resolve, reject) => {
        const firebaseData = JSON.stringify({ pago: true, nome: nomeComprador });
        const req = https.request({
          hostname: 'casamento-del-e-thami-default-rtdb.firebaseio.com',
          path: `/presentes/${presenteId}.json`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(firebaseData)
          }
        }, (res) => {
          res.on('data', () => {});
          res.on('end', resolve);
        });
        req.on('error', reject);
        req.write(firebaseData);
        req.end();
      });
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 200, body: 'ok' };
  }
};
