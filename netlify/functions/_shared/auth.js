const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'united_admin_session';
const SESSION_HOURS = 12;

function getSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET nao configurado nas variaveis de ambiente.');
  return secret;
}

function createSessionCookie() {
  const token = jwt.sign({ role: 'admin' }, getSecret(), { expiresIn: `${SESSION_HOURS}h` });
  const maxAge = SESSION_HOURS * 60 * 60;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  });
  return out;
}

function isAuthenticated(event) {
  try {
    const header = (event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
    const cookies = parseCookies(header);
    const token = cookies[COOKIE_NAME];
    if (!token) return false;
    const payload = jwt.verify(token, getSecret());
    return Boolean(payload && payload.role === 'admin');
  } catch (err) {
    return false;
  }
}

module.exports = { createSessionCookie, clearSessionCookie, isAuthenticated, COOKIE_NAME };
