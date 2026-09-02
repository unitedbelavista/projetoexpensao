const { createSessionCookie } = require('./_shared/auth');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { password } = JSON.parse(event.body || '{}');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return { statusCode: 500, body: JSON.stringify({ error: 'ADMIN_PASSWORD nao configurado no servidor.' }) };
    }

    if (!password || password !== adminPassword) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Senha incorreta.' }) };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createSessionCookie(),
      },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('admin-login error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao autenticar.' }) };
  }
};
