// Protegido: confirmar/rejeitar/excluir uma oferta manualmente, depois que
// o administrador conferir o Pix na conta do banco da igreja.
// PUT    /.netlify/functions/admin-contributions   { id, status }
// DELETE /.netlify/functions/admin-contributions?id=...
const { getSupabase } = require('./_shared/supabase');
const { isAuthenticated } = require('./_shared/auth');

const ALLOWED_STATUSES = ['approved', 'pending', 'rejected'];

exports.handler = async function (event) {
  if (!isAuthenticated(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Nao autenticado.' }) };
  }

  const supabase = getSupabase();

  try {
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, status } = body;
      if (!id || !status) {
        return { statusCode: 400, body: JSON.stringify({ error: 'id e status sao obrigatorios.' }) };
      }
      if (!ALLOWED_STATUSES.includes(status)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'status invalido.' }) };
      }

      const { data, error } = await supabase
        .from('contributions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contribution: data }) };
    }

    if (event.httpMethod === 'DELETE') {
      const params = event.queryStringParameters || {};
      const id = params.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'id e obrigatorio.' }) };
      const { error } = await supabase.from('contributions').delete().eq('id', id);
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('admin-contributions error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao atualizar oferta.' }) };
  }
};
