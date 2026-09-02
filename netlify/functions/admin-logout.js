const { clearSessionCookie } = require('./_shared/auth');

exports.handler = async function () {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
    },
    body: JSON.stringify({ ok: true }),
  };
};
