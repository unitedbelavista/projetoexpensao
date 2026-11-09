// Dashboard protegido: totais + lista de ofertas recentes
// GET /.netlify/functions/admin-summary
//
// Regra de contagem (igual à da página pública, em items.js): toda oferta
// que não está "rejected" conta no valor arrecadado - inclusive as que
// ainda estão "em análise" (status "pending", default de toda oferta
// nova). "in_review" abaixo é só a fatia informativa de quanto desse
// arrecadado ainda não foi confirmado pelo admin.
const { getSupabase } = require('./_shared/supabase');
const { isAuthenticated } = require('./_shared/auth');

exports.handler = async function (event) {
  if (!isAuthenticated(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Nao autenticado.' }) };
  }

  try {
    const supabase = getSupabase();

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, name, target_amount, active')
      .order('sort_order', { ascending: true });
    if (itemsError) throw itemsError;

    const { data: contributions, error: contribError } = await supabase
      .from('contributions')
      .select('id, item_id, amount, payer_name, status, payment_method, created_at')
      .order('created_at', { ascending: false });
    if (contribError) throw contribError;

    const byItem = {};
    (items || []).forEach((item) => {
      byItem[item.id] = {
        ...item,
        target_amount: Number(item.target_amount),
        raised_amount: 0,
        in_review_amount: 0,
      };
    });

    let totalRaised = 0;
    let totalInReview = 0;
    let totalTarget = 0;

    (items || []).forEach((item) => {
      totalTarget += Number(item.target_amount);
    });

    (contributions || []).forEach((c) => {
      const bucket = byItem[c.item_id];
      const amount = Number(c.amount);
      if (c.status === 'rejected' || c.status === 'cancelled') return;

      // approved + pending/in_process (ou qualquer status futuro que nao
      // seja rejeitado) contam no arrecadado - a oferta soma assim que e
      // registrada, nao so depois de confirmada.
      if (bucket) bucket.raised_amount += amount;
      totalRaised += amount;

      if (c.status !== 'approved') {
        if (bucket) bucket.in_review_amount += amount;
        totalInReview += amount;
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: Object.values(byItem),
        contributions: (contributions || []).slice(0, 100),
        totals: {
          target: Number(totalTarget.toFixed(2)),
          raised: Number(totalRaised.toFixed(2)),
          in_review: Number(totalInReview.toFixed(2)),
          remaining: Number((totalTarget - totalRaised).toFixed(2)),
        },
      }),
    };
  } catch (err) {
    console.error('admin-summary error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao carregar resumo.' }) };
  }
};
