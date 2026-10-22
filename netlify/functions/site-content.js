// Endpoint publico: GET /.netlify/functions/site-content
// Retorna os textos e configuracoes editaveis da pagina publica (titulo,
// texto de introducao, pilares, fundo da landing, cores, fontes e dados
// do Pix) - editados pelo administrador em admin-site-content.js.
//
// Usamos select('*') (em vez de listar colunas) de proposito: se algum
// dia uma migracao de SQL (sql/phase6_*.sql) ainda nao tiver rodado no
// banco, um select com uma coluna nova inexistente quebraria a consulta
// inteira e devolveria erro 500 - inclusive para os campos antigos que
// ja funcionavam. Com '*' a consulta sempre funciona com o que existir
// na tabela, e cada campo novo aqui embaixo ja tem um valor padrao via
// "|| ''" / "|| 'valor'" caso ainda nao exista na coluna.
const { getSupabase } = require('./_shared/supabase');

exports.handler = async function () {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
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
        hero_title_color: data.hero_title_color || '#f2ede8',
        hero_eyebrow_color: data.hero_eyebrow_color || '#b09080',
        hero_lead_color: data.hero_lead_color || '#f2ede8',
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
