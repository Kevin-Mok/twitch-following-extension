import { validateIdentity, allowedMessage } from './auth.js';
import { collectFollowed, loadAvatars } from './core.js';
import { TWITCH_CLIENT_ID } from './config.js';

const reconnect = 'Connect Twitch again in the extension setup.';
const authorizationEnded = 'Twitch authorization expired or was declined. Connect again to get a new code.';
class SafeError extends Error {}
const validClientId = value => typeof value === 'string' && /^[a-zA-Z0-9]{3,100}$/.test(value);
const validToken = value => typeof value === 'string' && /^[a-zA-Z0-9]+$/.test(value);
function validStoredAuthorization(saved) {
  const account = saved.account;
  return validClientId(saved.clientId) && validToken(saved.token)
    && account !== null && typeof account === 'object' && !Array.isArray(account)
    && typeof account.userId === 'string' && /^\d+$/.test(account.userId)
    && typeof account.login === 'string' && /^[a-zA-Z0-9_]+$/.test(account.login)
    && Number.isFinite(account.expiresAt) && account.expiresAt > Date.now();
}
function pendingView(pending) {
  return {userCode:pending.userCode,verificationUri:pending.verificationUri,expiresAt:pending.expiresAt,interval:pending.interval};
}
function validActivationUri(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'www.twitch.tv' && !url.port
      && !url.username && !url.password && url.pathname === '/activate' && !url.hash;
  } catch { return false; }
}
function validPending(pending) {
  return pending && typeof pending.id === 'string' && validClientId(pending.clientId)
    && typeof pending.deviceCode === 'string' && pending.deviceCode.length > 0 && pending.deviceCode.length <= 2048
    && typeof pending.userCode === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(pending.userCode)
    && validActivationUri(pending.verificationUri) && Number.isSafeInteger(pending.interval) && pending.interval > 0
    && Number.isFinite(pending.expiresAt) && Number.isFinite(pending.nextPollAt);
}
export function createWorker(chrome, fetcher = fetch) {
  let generation = 0;
  let credentialWrites = Promise.resolve();
  const polling = new Set();
  const ready = Promise.all([
    chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),
    chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})
  ]).then(() => chrome.storage.local.remove(['token','account']));
  function assertCurrent(version) {
    if (version !== generation) throw new SafeError('Account changed. Please retry.');
  }
  function changeCredentials(version, change) {
    // Finish storage transitions before a newer account can replace them.
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
    const local = await chrome.storage.local.get('clientId');
    assertCurrent(version);
    const session = await chrome.storage.session.get(['token','account','pendingOAuth']);
    assertCurrent(version);
    return {...session,clientId:TWITCH_CLIENT_ID || local.clientId};
  }
  async function rawRequest(url, options = {}) {
    try { return await fetcher(url,{...options,signal:AbortSignal.timeout(20000)}); }
    catch { throw new SafeError('Twitch could not be reached. Check your connection and retry.'); }
  }
  function checkResponse(response) {
    if (response.status === 401) throw new SafeError(reconnect);
    if (response.status === 429) throw new SafeError('Twitch rate limit reached. Wait a minute and retry.');
    if (!response.ok) throw new SafeError('Twitch request failed. Please retry.');
    return response;
  }
  async function responseJson(response) {
    try { return await response.json(); }
    catch { throw new SafeError('Twitch returned an invalid response. Please retry.'); }
  }
  async function json(url, options) {
    return responseJson(checkResponse(await rawRequest(url,options)));
  }
  const form = values => ({method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values).toString()});
  async function notifyAccountChanged() {
    if (!chrome.tabs) return;
    try {
      const tabs = await chrome.tabs.query({});
      await Promise.all(tabs.filter(tab => Number.isInteger(tab.id)).map(tab =>
        chrome.tabs.sendMessage(tab.id,{type:'accountChanged'}).catch(() => {})));
    } catch { /* Closed tabs and pages without a receiver need no notification. */ }
  }
  async function removeCredentials() {
    await chrome.storage.session.remove(['token','account','pendingOAuth']);
  }
  async function clear(version) {
    await changeCredentials(version,removeCredentials);
    await notifyAccountChanged();
  }
  async function validate(saved) {
    if (!validStoredAuthorization(saved)) throw new SafeError(reconnect);
    const data = await json('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${saved.token}`}});
    try { return validateIdentity(data,saved.clientId,saved.account.userId); }
    catch { throw new SafeError(reconnect); }
  }
  async function checkAuthorization() {
    const version = generation;
    try {
      await ready;
      const saved = await readCredentials(version);
      if (!Object.hasOwn(saved,'token') && !Object.hasOwn(saved,'account')) return;
      const account = await validate(saved);
      await changeCredentials(version,() => chrome.storage.session.set({account}));
    } catch(error) {
      if (version === generation && error.message === reconnect) await clear(++generation).catch(() => {});
    }
  }
  async function handle(message,sender) {
    if (!allowedMessage(message,sender,chrome.runtime.id)) return {ok:false,error:'Unsupported extension request.'};
    const operationVersion = message.type === 'connect' || message.type === 'disconnect' ? ++generation : generation;
    let hadCredentials = false;
    let pollingId;
    try {
      await ready;
      assertCurrent(operationVersion);
      if (message.type === 'openOptions') { await chrome.runtime.openOptionsPage(); return {ok:true}; }
      if (message.type === 'disconnect') {
        const saved = await changeCredentials(operationVersion,async () => {
          const credentials = await chrome.storage.session.get(['token','account']);
          assertCurrent(operationVersion);
          const local = await chrome.storage.local.get('clientId');
          assertCurrent(operationVersion);
          await removeCredentials();
          return {...credentials,clientId:TWITCH_CLIENT_ID || local.clientId};
        });
        await notifyAccountChanged();
        if (operationVersion === generation && validToken(saved.token) && validClientId(saved.clientId)) {
          try { checkResponse(await rawRequest('https://id.twitch.tv/oauth2/revoke',form({client_id:saved.clientId,token:saved.token}))); }
          catch { /* Local authorization is already removed. */ }
        }
        return {ok:true};
      }
      if (message.type === 'connect') {
        const clientId = TWITCH_CLIENT_ID || message.clientId;
        if (!validClientId(clientId) || (TWITCH_CLIENT_ID && message.clientId !== TWITCH_CLIENT_ID)) throw new SafeError('Use the Twitch application configured for this extension.');
        await changeCredentials(operationVersion,async () => {
          await removeCredentials();
          assertCurrent(operationVersion);
          await chrome.storage.local.set({clientId});
        });
        await notifyAccountChanged();
        assertCurrent(operationVersion);
        const data = await json('https://id.twitch.tv/oauth2/device',form({client_id:clientId,scopes:'user:read:follows'}));
        assertCurrent(operationVersion);
        const interval = data?.interval === undefined ? 5 : data.interval;
        const pending = {id:crypto.randomUUID(),clientId,deviceCode:data?.device_code,userCode:data?.user_code,verificationUri:data?.verification_uri,interval,expiresAt:Date.now()+data?.expires_in*1000,nextPollAt:Date.now()+interval*1000};
        if (!Number.isSafeInteger(data?.expires_in) || data.expires_in <= 0 || !validPending(pending)) throw new SafeError('Twitch returned invalid activation details. Please connect again.');
        await changeCredentials(operationVersion,() => chrome.storage.session.set({pendingOAuth:pending}));
        return {ok:true,pending:pendingView(pending)};
      }
      if (message.type === 'pollAuthorization') {
        let shouldPoll = false;
        const state = await changeCredentials(operationVersion,async () => {
          const saved = await chrome.storage.session.get(['pendingOAuth','token','account']);
          assertCurrent(operationVersion);
          const {pendingOAuth} = saved;
          if (pendingOAuth === undefined) {
            const local = await chrome.storage.local.get('clientId');
            assertCurrent(operationVersion);
            if (validStoredAuthorization({...saved,clientId:TWITCH_CLIENT_ID || local.clientId})) return {account:saved.account.login};
          }
          if (!validPending(pendingOAuth) || pendingOAuth.expiresAt <= Date.now()) {
            await chrome.storage.session.remove('pendingOAuth');
            throw new SafeError(authorizationEnded);
          }
          if (pendingOAuth.nextPollAt > Date.now() || polling.has(pendingOAuth.id)) return {pending:pendingOAuth};
          shouldPoll = true;
          pollingId = pendingOAuth.id;
          polling.add(pollingId);
          const updated = {...pendingOAuth,nextPollAt:Date.now()+pendingOAuth.interval*1000};
          await chrome.storage.session.set({pendingOAuth:updated});
          return {pending:updated};
        });
        if (state.account) return {ok:true,account:state.account};
        const pending = state.pending;
        if (!shouldPoll) return {ok:true,pending:pendingView(pending)};
        const response = await rawRequest('https://id.twitch.tv/oauth2/token',form({client_id:pending.clientId,scopes:'user:read:follows',device_code:pending.deviceCode,grant_type:'urn:ietf:params:oauth:grant-type:device_code'}));
        assertCurrent(operationVersion);
        const data = await responseJson(response);
        assertCurrent(operationVersion);
        const error = data?.error || data?.message;
        if (!response.ok) {
          if (response.status === 400 && (error === 'authorization_pending' || error === 'slow_down')) {
            const interval = pending.interval + (error === 'slow_down' ? 5 : 0);
            const updated = {...pending,interval,nextPollAt:Date.now()+interval*1000};
            await changeCredentials(operationVersion,async () => {
              const {pendingOAuth} = await chrome.storage.session.get('pendingOAuth');
              assertCurrent(operationVersion);
              if (pendingOAuth?.id !== pending.id || pendingOAuth.expiresAt <= Date.now()) throw new SafeError(authorizationEnded);
              await chrome.storage.session.set({pendingOAuth:updated});
            });
            return {ok:true,pending:pendingView(updated)};
          }
          if (response.status === 429) throw new SafeError('Twitch rate limit reached. Wait a minute and reconnect.');
          throw new SafeError(authorizationEnded);
        }
        if (!validToken(data?.access_token) || data?.token_type?.toLowerCase() !== 'bearer') throw new SafeError(authorizationEnded);
        const validated = await json('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${data.access_token}`}});
        assertCurrent(operationVersion);
        let account;
        try { account = validateIdentity(validated,pending.clientId); } catch { throw new SafeError(reconnect); }
        await changeCredentials(operationVersion,async () => {
          const {pendingOAuth} = await chrome.storage.session.get('pendingOAuth');
          assertCurrent(operationVersion);
          if (pendingOAuth?.id !== pending.id || pending.expiresAt <= Date.now()) throw new SafeError(authorizationEnded);
          await chrome.storage.session.set({token:data.access_token,account});
          assertCurrent(operationVersion);
          await chrome.storage.session.remove('pendingOAuth');
        });
        await notifyAccountChanged();
        assertCurrent(operationVersion);
        return {ok:true,account:account.login};
      }
      const saved = await readCredentials(operationVersion);
      hadCredentials = Object.hasOwn(saved,'token') || Object.hasOwn(saved,'account');
      const valid = validStoredAuthorization(saved);
      if (message.type === 'status') {
        if (hadCredentials && !valid) {
          const clearedVersion = ++generation;
          await clear(clearedVersion);
          assertCurrent(clearedVersion);
        }
        const pending = validPending(saved.pendingOAuth) && saved.pendingOAuth.expiresAt > Date.now() ? pendingView(saved.pendingOAuth) : null;
        return {ok:true,clientId:validClientId(saved.clientId) ? saved.clientId : '',configured:Boolean(TWITCH_CLIENT_ID),account:valid ? saved.account.login : null,pending:sender.url === `chrome-extension://${chrome.runtime.id}/options.html` ? pending : null};
      }
      if (!valid) throw new SafeError(reconnect);
      const api = async (path,params) => {
        assertCurrent(operationVersion);
        const data = await json(`https://api.twitch.tv/helix/${path}?${new URLSearchParams(params)}`,{headers:{'Client-Id':saved.clientId,Authorization:`Bearer ${saved.token}`}});
        assertCurrent(operationVersion);
        return data;
      };
      const games = await api('games',{name:message.category});
      const game = games?.data?.find(item => typeof item.id === 'string' && /^\d+$/.test(item.id) && item.name?.toLowerCase() === message.category.toLowerCase());
      if (!game) throw new SafeError('This Twitch category could not be verified. Please reload and retry.');
      const streams = (await collectFollowed(cursor => api('streams/followed',{user_id:saved.account.userId,first:'100',...(cursor ? {after:cursor} : {})}))).filter(stream => stream.game_id === game.id);
      const avatars = await loadAvatars(streams.map(stream => stream.user_id),ids => api('users',ids.map(id => ['id',id])));
      assertCurrent(operationVersion);
      return {ok:true,streams,avatars,gameId:game.id,accountVersion:operationVersion};
    } catch(error) {
      if (message.type === 'pollAuthorization' && operationVersion === generation) await changeCredentials(operationVersion,() => chrome.storage.session.remove('pendingOAuth')).catch(() => {});
      if (hadCredentials && operationVersion === generation && error instanceof SafeError && error.message === reconnect) await clear(++generation).catch(() => {});
      return {ok:false,error:error instanceof SafeError ? error.message : 'Twitch data could not be loaded safely. Please retry.'};
    } finally {
      if (pollingId) polling.delete(pollingId);
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
  chrome.action?.onClicked.addListener(() => { void chrome.runtime.openOptionsPage(); });
  chrome.runtime.onStartup.addListener(() => { void worker.checkAuthorization(); });
  chrome.runtime.onInstalled.addListener(() => { void worker.checkAuthorization(); });
  chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'validate-twitch') void worker.checkAuthorization(); });
  chrome.alarms.create('validate-twitch',{periodInMinutes:60});
  void worker.checkAuthorization();
}
