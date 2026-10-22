// Protegido: atualizar os textos e configuracoes editaveis da pagina
// publica (titulo, texto de introducao, pilares, fundo da landing,
// fontes e dados do Pix).
// PUT /.netlify/functions/admin-site-content
// { hero_title, hero_lead, hero_background_url, pillars_title, pillars,
//   heading_font, body_font, pix_key, pix_merchant_name, pix_merchant_city,
//   pix_intro_text, amount_warning_text }
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
    const {
      hero_title: heroTitle,
      hero_lead: heroLead,
      hero_background_url: heroBackgroundUrl,
      hero_title_color: heroTitleColor,
      hero_eyebrow_color: heroEyebrowColor,
      hero_lead_color: heroLeadColor,
      pillars_title: pillarsTitle,
      pillars,
      heading_font: headingFont,
      body_font: bodyFont,
      pix_key: pixKey,
      pix_merchant_name: pixMerchantName,
      pix_merchant_city: pixMerchantCity,
      pix_intro_text: pixIntroText,
      amount_warning_text: amountWarningText,
    } = body;

    const updates = {};
    if (heroTitle !== undefined) updates.hero_title = heroTitle;
    if (heroLead !== undefined) updates.hero_lead = heroLead;
    if (heroBackgroundUrl !== undefined) updates.hero_background_url = heroBackgroundUrl;
    if (heroTitleColor !== undefined) updates.hero_title_color = heroTitleColor;
    if (heroEyebrowColor !== undefined) updates.hero_eyebrow_color = heroEyebrowColor;
    if (heroLeadColor !== undefined) updates.hero_lead_color = heroLeadColor;
    if (pillarsTitle !== undefined) updates.pillars_title = pillarsTitle;
    if (pillars !== undefined) {
      if (!Array.isArray(pillars)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'pillars deve ser uma lista.' }) };
      }
      updates.pillars = pillars;
    }
    if (headingFont !== undefined) updates.heading_font = headingFont;
    if (bodyFont !== undefined) updates.body_font = bodyFont;
    if (pixKey !== undefined) updates.pix_key = pixKey;
    if (pixMerchantName !== undefined) updates.pix_merchant_name = pixMerchantName;
    if (pixMerchantCity !== undefined) updates.pix_merchant_city = pixMerchantCity;
    if (pixIntroText !== undefined) updates.pix_intro_text = pixIntroText;
    if (amountWarningText !== undefined) updates.amount_warning_text = amountWarningText;
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
