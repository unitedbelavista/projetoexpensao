// Endpoint publico: POST /.netlify/functions/create-preference
// Cria uma oferta pendente no banco e uma preferencia de pagamento no
// Mercado Pago (Checkout Pro, restrito a Pix - sem cartao).
const { getSupabase } = require('./_shared/supabase');
const { getPreferenceApi } = require('./_shared/mercadopago');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { item_id: itemId, amount, payer_name: payerName } = body;

    const numericAmount = Number(amount);
    if (!itemId || !numericAmount || numericAmount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Item e valor valido sao obrigatorios.' }) };
    }
    if (numericAmount < 5) {
      return { statusCode: 400, body: JSON.stringify({ error: 'O valor minimo para ofertar e R$ 5,00.' }) };
    }

    const supabase = getSupabase();

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, name, active')
      .eq('id', itemId)
      .single();

    if (itemError || !item || !item.active) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Item nao encontrado.' }) };
    }

    const { data: contribution, error: insertError } = await supabase
      .from('contributions')
      .insert({
        item_id: itemId,
        amount: numericAmount,
        payer_name: payerName || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const siteUrl = process.env.SITE_URL || `https://${event.headers.host}`;

    const preferenceApi = getPreferenceApi();
    const preference = await preferenceApi.create({
      body: {
        items: [
          {
            id: item.id,
            title: `Oferta - ${item.name}`,
            quantity: 1,
            unit_price: numericAmount,
            currency_id: 'BRL',
          },
        ],
        payer: payerName ? { name: payerName } : undefined,
        external_reference: contribution.id,
        notification_url: `${siteUrl}/.netlify/functions/mp-webhook`,
        back_urls: {
          success: `${siteUrl}/?status=sucesso`,
          pending: `${siteUrl}/?status=pendente`,
          failure: `${siteUrl}/?status=falha`,
        },
        auto_return: 'approved',
        // A igreja decidiu que as ofertas sao so via Pix (sem cartao).
        // Isso restringe o checkout do Mercado Pago para mostrar so a
        // opcao de Pix (tecnicamente "bank_transfer" na API do MP).
        payment_methods: {
          excluded_payment_types: [
            { id: 'credit_card' },
            { id: 'debit_card' },
            { id: 'prepaid_card' },
            { id: 'ticket' },
            { id: 'atm' },
            { id: 'digital_wallet' },
            { id: 'digital_currency' },
            { id: 'voucher_card' },
          ],
          default_payment_method_id: 'pix',
        },
      },
    });

    await supabase
      .from('contributions')
      .update({ mp_preference_id: preference.id })
      .eq('id', contribution.id);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkout_url: preference.init_point }),
    };
  } catch (err) {
    console.error('create-preference error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao criar pagamento. Tente novamente.' }) };
  }
};
