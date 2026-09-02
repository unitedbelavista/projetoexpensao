// CRUD protegido de itens: GET / POST / PUT / DELETE
// /.netlify/functions/admin-items
const { getSupabase } = require('./_shared/supabase');
const { isAuthenticated } = require('./_shared/auth');

exports.handler = async function (event) {
  if (!isAuthenticated(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Nao autenticado.' }) };
  }

  const supabase = getSupabase();

  try {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: data }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { name, description, image_url: imageUrl, target_amount: targetAmount, sort_order: sortOrder } = body;
      if (!name || !targetAmount) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Nome e valor alvo sao obrigatorios.' }) };
      }
      const { data, error } = await supabase
        .from('items')
        .insert({
          name,
          description: description || null,
          image_url: imageUrl || null,
          target_amount: Number(targetAmount),
          sort_order: sortOrder != null ? Number(sortOrder) : 0,
        })
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: data }) };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, ...fields } = body;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'id e obrigatorio.' }) };

      const allowed = ['name', 'description', 'image_url', 'target_amount', 'active', 'sort_order'];
      const updates = {};
      allowed.forEach((key) => {
        if (fields[key] !== undefined) updates[key] = fields[key];
      });
      if (updates.target_amount !== undefined) updates.target_amount = Number(updates.target_amount);
      if (updates.sort_order !== undefined) updates.sort_order = Number(updates.sort_order);

      const { data, error } = await supabase.from('items').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: data }) };
    }

    if (event.httpMethod === 'DELETE') {
      const params = event.queryStringParameters || {};
      const id = params.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'id e obrigatorio.' }) };
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('admin-items error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao processar itens.' }) };
  }
};
