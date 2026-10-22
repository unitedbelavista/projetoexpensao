// Endpoint publico: GET /.netlify/functions/site-content
// Retorna os textos e configuracoes editaveis da pagina publica (titulo,
// texto de introducao, pilares, fundo da landing, fontes e dados do Pix) -
// editados pelo administrador em admin-site-content.js.
const { getSupabase } = require('./_shared/supabase');

exports.handler = async function () {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('site_content')
      .select(
        'hero_title, hero_lead, hero_background_url, hero_text_color, pillars_title, pillars, ' +
        'heading_font, body_font, pix_key, pix_merchant_name, pix_merchant_city, ' +
        'pix_intro_text, amount_warning_text'
      )
      .eq('id', 1)
      .single();
    if (error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hero_title: data.hero_title,
        hero_lead: data.hero_lead,
        hero_background_url: data.hero_background_url || '',
        hero_text_color: data.hero_text_color || '#f2ede8',
        pillars_title: data.pillars_title,
        pillars: data.pillars || [],
        heading_font: data.heading_font || 'Playfair Display',
        body_font: data.body_font || 'Montserrat',
        pix_key: data.pix_key || '',
        pix_merchant_name: data.pix_merchant_name || '',
        pix_merchant_city: data.pix_merchant_city || '',
        pix_intro_text: data.pix_intro_text || '',
        amount_warning_text: data.amount_warning_text || '',
      }),
    };
  } catch (err) {
    console.error('site-content error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao carregar conteudo do site.' }) };
  }
};
