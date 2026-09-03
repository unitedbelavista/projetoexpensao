// Endpoint publico: POST /.netlify/functions/register-offer
// Registra uma oferta como "pendente". O pagamento em si acontece fora do
// site, via Pix direto no app do banco do ofertante (chave exibida na
// tela). O administrador confirma manualmente no painel depois de ver o
// Pix cair na conta da igreja - ver admin-contributions.js.
const { getSupabase } = require('./_shared/supabase');

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
        payment_method: 'pix',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, contribution_id: contribution.id }),
    };
  } catch (err) {
    console.error('register-offer error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao registrar oferta. Tente novamente.' }) };
  }
};
