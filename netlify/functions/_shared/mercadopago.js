const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

let client;

function getClient() {
  if (!client) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error('MP_ACCESS_TOKEN nao configurado nas variaveis de ambiente.');
    client = new MercadoPagoConfig({ accessToken });
  }
  return client;
}

function getPreferenceApi() {
  return new Preference(getClient());
}

function getPaymentApi() {
  return new Payment(getClient());
}

module.exports = { getPreferenceApi, getPaymentApi };
