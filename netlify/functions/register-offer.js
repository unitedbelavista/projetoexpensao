// Endpoint publico: POST /.netlify/functions/register-offer
// Registra uma oferta com status "pending" (exibido no painel/público como
// "em análise"). O valor já entra na soma do "arrecadado" imediatamente,
// mesmo antes de qualquer confirmação - é assim de propósito, para o
// progresso do item refletir toda oferta registrada. O pagamento em si
// acontece fora do site, via Pix direto no app do banco do ofertante
// (chave exibida na tela). O administrador confere o Pix na conta da
// igreja e confirma ou rejeita manualmente no painel depois - ver
// admin-contributions.js. Só uma oferta "rejected" sai da soma; a ação de
// confirmar/rejeitar pode ser revertida a qualquer momento.
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

    // O nome pode ser exigido ou nao, dependendo do toggle "Exigir nome de
    // quem esta ofertando" no painel admin (site_content.require_payer_name).
    // Validamos no servidor (nao só no navegador) para a regra valer de
    // verdade. Se a consulta falhar por qualquer motivo (ex: coluna ainda
    // nao migrada), caímos no padrão mais seguro: exigir o nome.
    let requirePayerName = true;
    try {
      const { data: content } = await supabase.from('site_content').select('require_payer_name').eq('id', 1).single();
      if (content && (content.require_payer_name === false)) {
        requirePayerName = false;
      }
    } catch (err) {
      // mantém o padrao (exigir nome) se a consulta falhar
    }

    if (requirePayerName && !String(payerName || '').trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Por favor, informe seu nome para registrar a oferta.' }) };
    }

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
