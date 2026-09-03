// Protegido: atualizar os textos editaveis da pagina publica (titulo,
// texto de introducao e pilares).
// PUT /.netlify/functions/admin-site-content
// { hero_title, hero_lead, pillars_title, pillars: [{title, text}] }
const { getSupabase } = require('./_shared/supabase');
const { isAuthenticated } = require('./_shared/auth');

exports.handler = async function (event) {
  if (!isAuthenticated(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Nao autenticado.' }) };
  }
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { hero_title: heroTitle, hero_lead: heroLead, pillars_title: pillarsTitle, pillars } = body;

    const updates = {};
    if (heroTitle !== undefined) updates.hero_title = heroTitle;
    if (heroLead !== undefined) updates.hero_lead = heroLead;
    if (pillarsTitle !== undefined) updates.pillars_title = pillarsTitle;
    if (pillars !== undefined) {
      if (!Array.isArray(pillars)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'pillars deve ser uma lista.' }) };
      }
      updates.pillars = pillars;
    }
    updates.updated_at = new Date().toISOString();

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('site_content')
      .update(updates)
      .eq('id', 1)
      .select()
      .single();
    if (error) throw error;

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: data }) };
  } catch (err) {
    console.error('admin-site-content error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao salvar conteudo do site.' }) };
  }
};
