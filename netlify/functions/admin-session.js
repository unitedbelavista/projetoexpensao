const { isAuthenticated } = require('./_shared/auth');

exports.handler = async function (event) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authenticated: isAuthenticated(event) }),
  };
};
