// Endpoint publico: GET /.netlify/functions/site-content
// Retorna os textos editaveis da pagina publica (titulo, texto de
// introducao e os pilares da igreja) - editados pelo administrador em
// admin-site-content.js.
const { getSupabase } = require('./_shared/supabase');

exports.handler = async function () {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('site_content')
      .select('hero_title, hero_lead, pillars_title, pillars')
      .eq('id', 1)
      .single();
    if (error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hero_title: data.hero_title,
        hero_lead: data.hero_lead,
        pillars_title: data.pillars_title,
        pillars: data.pillars || [],
      }),
    };
  } catch (err) {
    console.error('site-content error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao carregar conteudo do site.' }) };
  }
};
