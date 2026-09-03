// Protegido: upload da foto de um item para o Supabase Storage.
// POST /.netlify/functions/admin-upload-image
// { filename, content_type, data_base64 }
// Retorna { image_url } com o link publico da imagem enviada, para ser
// usado no campo "image_url" do item (admin-items.js).
const { getSupabase } = require('./_shared/supabase');
const { isAuthenticated } = require('./_shared/auth');

const BUCKET = 'item-images';
const MAX_BYTES = 4 * 1024 * 1024; // 4MB (o corpo da requisicao em base64 fica ~33% maior)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

exports.handler = async function (event) {
  if (!isAuthenticated(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Nao autenticado.' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { filename, content_type: contentType, data_base64: dataBase64 } = body;

    if (!filename || !contentType || !dataBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Arquivo invalido.' }) };
    }
    if (!ALLOWED_TYPES.includes(contentType)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Use uma imagem JPG, PNG, WEBP ou GIF.' }) };
    }

    const buffer = Buffer.from(dataBase64, 'base64');
    if (!buffer.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Arquivo invalido.' }) };
    }
    if (buffer.length > MAX_BYTES) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Imagem muito grande (maximo 4MB).' }) };
    }

    const ext = (filename.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabase = getSupabase();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: false });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: data.publicUrl }),
    };
  } catch (err) {
    console.error('admin-upload-image error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao enviar a imagem.' }) };
  }
};
