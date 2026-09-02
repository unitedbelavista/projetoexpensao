// Webhook do Mercado Pago: configure a notification_url para
// https://SEU-SITE/.netlify/functions/mp-webhook no painel do Mercado Pago
// (isso ja e enviado automaticamente em cada preferencia criada acima).
const { getSupabase } = require('./_shared/supabase');
const { getPaymentApi } = require('./_shared/mercadopago');

exports.handler = async function (event) {
  try {
    const params = event.queryStringParameters || {};
    let paymentId = params['data.id'] || params.id;
    let type = params.type || params.topic;

    if ((!paymentId || !type) && event.body) {
      try {
        const body = JSON.parse(event.body);
        type = type || body.type;
        paymentId = paymentId || (body.data && body.data.id);
      } catch (parseErr) {
        // corpo nao era JSON valido - ignora e segue com o que veio na query string
      }
    }

    if (type !== 'payment' || !paymentId) {
      // Outros tipos de notificacao (merchant_order, etc.) sao ignorados.
      return { statusCode: 200, body: 'ignored' };
    }

    const paymentApi = getPaymentApi();
    const payment = await paymentApi.get({ id: paymentId });

    const externalReference = payment.external_reference;
    const status = payment.status; // approved | pending | in_process | rejected | cancelled | refunded
    const paymentMethod = payment.payment_type_id; // pix | credit_card | debit_card | ...

    if (!externalReference) {
      return { statusCode: 200, body: 'sem external_reference' };
    }

    const supabase = getSupabase();
    await supabase
      .from('contributions')
      .update({
        status,
        payment_method: paymentMethod,
        mp_payment_id: String(payment.id),
        updated_at: new Date().toISOString(),
      })
      .eq('id', externalReference);

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('mp-webhook error', err);
    // Responde 200 mesmo assim para o Mercado Pago nao ficar reenviando em loop
    // por causa de um erro nosso; os detalhes ficam no log da function.
    return { statusCode: 200, body: 'error-logged' };
  }
};
