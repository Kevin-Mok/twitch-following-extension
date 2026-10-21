export function parseCallback(callback, redirect, state) {
  const url = new URL(callback);
  const expected = new URL(redirect);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.search !== expected.search) throw new Error('Invalid OAuth callback.');
  const params = new URLSearchParams(url.hash.slice(1));
  const token = params.get('access_token');
  if (!state || params.getAll('state').length !== 1 || params.get('state') !== state
    || params.has('error') || params.getAll('access_token').length !== 1
    || !token || !/^[a-zA-Z0-9]+$/.test(token) || params.get('token_type')?.toLowerCase() !== 'bearer') throw new Error('Invalid OAuth callback.');
  return token;
}
export function validateIdentity(data, clientId, expectedUserId) {
  if (!data || data.client_id !== clientId || typeof data.user_id !== 'string'
    || !/^\d+$/.test(data.user_id) || typeof data.login !== 'string' || !/^[a-zA-Z0-9_]+$/.test(data.login)
    || !Array.isArray(data.scopes) || !data.scopes.includes('user:read:follows')
    || !Number.isSafeInteger(data.expires_in) || data.expires_in <= 0
    || (expectedUserId && data.user_id !== expectedUserId)) throw new Error('Invalid Twitch authorization.');
  return {userId:data.user_id,login:data.login,expiresAt:Date.now()+data.expires_in*1000};
}
export function allowedMessage(message, sender, extensionId) {
  if (!message || typeof message !== 'object' || Array.isArray(message) || sender?.id !== extensionId) return false;
  const setup = sender.url === `chrome-extension://${extensionId}/options.html`;
  let content = false;
  try { const url = new URL(sender.url); content = Boolean(sender.tab) && url.origin === 'https://www.twitch.tv'; } catch { return false; }
  if (!setup && !content) return false;
  const keys = Object.keys(message).sort().join(',');
  switch(message.type) {
    case 'status': return keys === 'type';
    case 'connect': return setup && keys === 'clientId,type' && typeof message.clientId === 'string' && /^[a-zA-Z0-9]{3,100}$/.test(message.clientId);
    case 'disconnect': return setup && keys === 'type';
    case 'pollAuthorization': return setup && keys === 'type';
    case 'openOptions': return content && keys === 'type';
    case 'snapshot': return content && keys === 'category,type' && typeof message.category === 'string' && message.category.trim().length > 0 && message.category.length <= 200;
    default: return false;
  }
}
