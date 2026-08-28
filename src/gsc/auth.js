import crypto from 'node:crypto';

function base64url(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return input.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function parseServiceAccount(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) throw new Error('client_email/private_key ausentes');
    return parsed;
  } catch (error) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON inválido: ${error.message}`);
  }
}

export function createSignedJwt(serviceAccount, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
    iat: nowSeconds,
    exp: nowSeconds + 3600
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), serviceAccount.private_key);
  return `${unsigned}.${base64url(signature)}`;
}

export async function getAccessToken(serviceAccount) {
  const assertion = createSignedJwt(serviceAccount);
  const tokenUrl = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  if (!response.ok) throw new Error(`OAuth Google respondeu ${response.status}: ${await response.text()}`);
  const data = await response.json();
  if (!data.access_token) throw new Error('Google OAuth não retornou access_token');
  return data.access_token;
}
