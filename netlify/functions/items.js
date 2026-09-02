// Endpoint publico: GET /.netlify/functions/items
// Retorna os itens ativos com o valor ja arrecadado (somente ofertas aprovadas).
const { getSupabase } = require('./_shared/supabase');

exports.handler = async function () {
  try {
    const supabase = getSupabase();

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, name, description, image_url, target_amount, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (itemsError) throw itemsError;

    const { data: contributions, error: contribError } = await supabase
      .from('contributions')
      .select('item_id, amount')
      .eq('status', 'approved');

    if (contribError) throw contribError;

    const raisedByItem = {};
    (contributions || []).forEach((c) => {
      raisedByItem[c.item_id] = (raisedByItem[c.item_id] || 0) + Number(c.amount);
    });

    const result = (items || []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      image_url: item.image_url,
      target_amount: Number(item.target_amount),
      raised_amount: Number((raisedByItem[item.id] || 0).toFixed(2)),
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: result }),
    };
  } catch (err) {
    console.error('items error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao carregar itens.' }) };
  }
};
