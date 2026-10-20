import { parseCallback, validateIdentity, allowedMessage } from './auth.js';
import { collectFollowed, loadAvatars } from './core.js';

const reconnect = 'Connect Twitch again in the extension setup.';
class SafeError extends Error {}
const validClientId = value => typeof value === 'string' && /^[a-zA-Z0-9]{3,100}$/.test(value);
const validToken = value => typeof value === 'string' && /^[a-zA-Z0-9]+$/.test(value);
function validStoredAuthorization(saved) {
  const account = saved.account;
  return validClientId(saved.clientId) && validToken(saved.token)
    && account !== null && typeof account === 'object' && !Array.isArray(account)
    && typeof account.userId === 'string' && /^\d+$/.test(account.userId)
    && typeof account.login === 'string' && /^[a-zA-Z0-9_]+$/.test(account.login)
    && Number.isFinite(account.expiresAt) && account.expiresAt > 0;
}
export function createWorker(chrome, fetcher = fetch) {
  let generation = 0;
  let credentialWrites = Promise.resolve();
  const ready = Promise.all([
    chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),
    chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})
  ]);
  const redirect = () => chrome.identity.getRedirectURL();
  function assertCurrent(version) {
    if (version !== generation) throw new SafeError('Account changed. Please retry.');
  }
  function changeCredentials(version, change) {
    // Chrome storage writes are asynchronous; finish them before a newer account can replace them.
    const result = credentialWrites.then(async () => {
      assertCurrent(version);
      const value = await change();
      assertCurrent(version);
      return value;
    });
    credentialWrites = result.catch(() => {});
    return result;
  }
  async function readCredentials(version) {
    await credentialWrites;
    assertCurrent(version);
    const saved = await chrome.storage.local.get(['clientId','token','account']);
    assertCurrent(version);
    return saved;
  }
  async function request(url, options = {}) {
    let response;
    try { response = await fetcher(url, {...options,signal:AbortSignal.timeout(20000)}); }
    catch { throw new SafeError('Twitch could not be reached. Check your connection and retry.'); }
    if (response.status === 401) throw new SafeError(reconnect);
    if (response.status === 429) throw new SafeError('Twitch rate limit reached. Wait a minute and retry.');
    if (!response.ok) throw new SafeError('Twitch request failed. Please retry.');
    return response;
  }
  async function json(url, options) {
    try { return await (await request(url,options)).json(); }
    catch (error) { if (error instanceof SafeError) throw error; throw new SafeError('Twitch returned an invalid response. Please retry.'); }
  }
  async function notifyAccountChanged() {
    if (!chrome.tabs) return;
    try {
      const tabs = await chrome.tabs.query({});
      await Promise.all(tabs.filter(tab => Number.isInteger(tab.id)).map(tab =>
        chrome.tabs.sendMessage(tab.id,{type:'accountChanged'}).catch(() => {})));
    } catch { /* Closed tabs and pages without a receiver need no notification. */ }
  }
  async function removeCredentials() {
    await chrome.storage.local.remove(['token','account']);
    await chrome.storage.session.remove('pendingOAuth');
  }
  async function clear(version) {
    await changeCredentials(version, removeCredentials);
    await notifyAccountChanged();
  }
  async function validate(saved) {
    if (!validStoredAuthorization(saved)) throw new SafeError(reconnect);
    const data = await json('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${saved.token}`}});
    try { return validateIdentity(data,saved.clientId,saved.account.userId); }
    catch { throw new SafeError(reconnect); }
  }
  async function checkAuthorization() {
    await ready;
    const version = generation;
    try {
      const saved = await readCredentials(version);
      if (!Object.hasOwn(saved,'token') && !Object.hasOwn(saved,'account')) return;
      assertCurrent(version);
      const account = await validate(saved);
      await changeCredentials(version, () => chrome.storage.local.set({account}));
    } catch(error) {
      if (version === generation && error.message === reconnect) await clear(++generation).catch(() => {});
    }
  }
  async function handle(message,sender) {
    if (!allowedMessage(message,sender,chrome.runtime.id)) return {ok:false,error:'Unsupported extension request.'};
    await ready;
    let operationVersion = generation;
    let hadCredentials = false;
    try {
      if (message.type === 'openOptions') { await chrome.runtime.openOptionsPage(); return {ok:true}; }
      if (message.type === 'disconnect') {
        const version = ++generation;
        operationVersion = version;
        const saved = await changeCredentials(version, async () => {
          const credentials = await chrome.storage.local.get(['clientId','token','account']);
          assertCurrent(version);
          await removeCredentials();
          return credentials;
        });
        await notifyAccountChanged();
        if (version === generation && validToken(saved.token) && validClientId(saved.clientId)) {
          try { await request('https://id.twitch.tv/oauth2/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:saved.clientId,token:saved.token}).toString()}); } catch { /* Local authorization is already removed. */ }
        }
        return {ok:true};
      }
      if (message.type === 'connect') {
        const version = ++generation;
        operationVersion = version;
        const state = crypto.randomUUID();
        const redirectUrl = redirect();
        await changeCredentials(version, async () => {
          await removeCredentials();
          await chrome.storage.local.set({clientId:message.clientId});
          await chrome.storage.session.set({pendingOAuth:{state,redirectUrl,clientId:message.clientId}});
        });
        await notifyAccountChanged();
        assertCurrent(version);
        const url = new URL('https://id.twitch.tv/oauth2/authorize');
        url.search = new URLSearchParams({client_id:message.clientId,redirect_uri:redirectUrl,response_type:'token',scope:'user:read:follows',state}).toString();
        let callback;
        try { callback = await chrome.identity.launchWebAuthFlow({url:url.href,interactive:true}); }
        catch { throw new SafeError('Twitch connection was cancelled or could not open. Please retry.'); }
        assertCurrent(version);
        const {pendingOAuth} = await chrome.storage.session.get('pendingOAuth');
        if (version !== generation || pendingOAuth?.state !== state || pendingOAuth.redirectUrl !== redirectUrl || pendingOAuth.clientId !== message.clientId) throw new SafeError('Account changed. Please retry.');
        let token;
        try { token = parseCallback(callback,redirectUrl,state); } catch { throw new SafeError('Twitch authorization could not be verified. Please connect again.'); }
        const data = await json('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token}`}});
        let account;
        try { account = validateIdentity(data,message.clientId); } catch { throw new SafeError(reconnect); }
        await changeCredentials(version, async () => {
          await chrome.storage.local.set({token,account});
          await chrome.storage.session.remove('pendingOAuth');
        });
        await notifyAccountChanged();
        assertCurrent(version);
        return {ok:true,account:account.login};
      }
      const version = operationVersion;
      const saved = await readCredentials(version);
      assertCurrent(version);
      hadCredentials = Object.hasOwn(saved,'token') || Object.hasOwn(saved,'account');
      const valid = validStoredAuthorization(saved);
      if (message.type === 'status') {
        if (hadCredentials && !valid) {
          const clearedVersion = ++generation;
          await clear(clearedVersion);
          assertCurrent(clearedVersion);
        }
        return {ok:true,clientId:validClientId(saved.clientId) ? saved.clientId : '',account:valid ? saved.account.login : null,redirectUrl:redirect()};
      }
      if (!valid || saved.account.expiresAt <= Date.now()) throw new SafeError(reconnect);
      const api = async (path,params) => {
        assertCurrent(version);
        const data = await json(`https://api.twitch.tv/helix/${path}?${new URLSearchParams(params)}`,{headers:{'Client-Id':saved.clientId,Authorization:`Bearer ${saved.token}`}});
        assertCurrent(version);
        return data;
      };
      const games = await api('games',{name:message.category});
      const game = games?.data?.find(item => typeof item.id === 'string' && /^\d+$/.test(item.id) && item.name?.toLowerCase() === message.category.toLowerCase());
      if (!game) throw new SafeError('This Twitch category could not be verified. Please reload and retry.');
      const streams = (await collectFollowed(cursor => api('streams/followed',{user_id:saved.account.userId,first:'100',...(cursor ? {after:cursor} : {})}))).filter(stream => stream.game_id === game.id);
      const avatars = await loadAvatars(streams.map(stream => stream.user_id),ids => api('users',ids.map(id => ['id',id])));
      assertCurrent(version);
      return {ok:true,streams,avatars,gameId:game.id,accountVersion:version};
    } catch(error) {
      if (hadCredentials && operationVersion === generation && error instanceof SafeError && error.message === reconnect) await clear(++generation).catch(() => {});
      return {ok:false,error:error instanceof SafeError ? error.message : 'Twitch data could not be loaded safely. Please retry.'};
    }
  }
  return {handle,checkAuthorization};
}
if (globalThis.chrome?.runtime?.onMessage) {
  const worker = createWorker(chrome);
  chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
    worker.handle(message,sender).then(sendResponse,() => sendResponse({ok:false,error:'Extension setup could not be loaded. Please retry.'}));
    return true;
  });
  chrome.runtime.onStartup.addListener(() => { void worker.checkAuthorization(); });
  chrome.runtime.onInstalled.addListener(() => { void worker.checkAuthorization(); });
  chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'validate-twitch') void worker.checkAuthorization(); });
  chrome.alarms.create('validate-twitch',{periodInMinutes:60});
  void worker.checkAuthorization();
}
