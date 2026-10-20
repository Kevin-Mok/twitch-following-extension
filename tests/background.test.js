import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from '../src/background.js';
function harness(initial = {}) {
  const data = {...initial}; const session = {};
  const area = object => ({ get: async () => ({...object}), set: async values => Object.assign(object, values), remove: async keys => {for (const key of [].concat(keys)) delete object[key];}, setAccessLevel: async () => {} });
  const chrome = {runtime: {id:'abc',getURL:path=>'chrome-extension://abc/'+path,openOptionsPage:async()=>{}}, identity:{getRedirectURL:()=> 'https://abc.chromiumapp.org/'}, storage:{local:area(data),session:area(session)},alarms:{create:()=>{}}};
  return {chrome,data};
}
const setup={id:'abc',url:'chrome-extension://abc/options.html'};
const content={id:'abc',url:'https://www.twitch.tv/directory/category/fortnite',tab:{id:1}};
test('status never returns credentials and content cannot connect',async()=>{
 const {chrome}=harness({clientId:'client',token:'secret',account:{userId:'1',login:'kevin',expiresAt:Date.now()+300000}});
 const worker=createWorker(chrome,async()=>{throw Error('should not fetch');});
 const status=await worker.handle({type:'status'},content);
 assert.deepEqual(status,{ok:true,clientId:'client',account:'kevin',redirectUrl:'https://abc.chromiumapp.org/'});
 assert.equal((await worker.handle({type:'connect',clientId:'client'},content)).ok,false);
});
test('snapshot fails as a whole on pagination failure and never leaks remote details',async()=>{
 const {chrome}=harness({clientId:'client',token:'secret',account:{userId:'1',login:'kevin',expiresAt:Date.now()+300000}});
 const worker=createWorker(chrome,async url=>url.includes('/games?')?new Response(JSON.stringify({data:[{id:'10',name:'Fortnite'}]})):new Response('secret server error',{status:503}));
 const response=await worker.handle({type:'snapshot',category:'Fortnite'},content);
 assert.equal(response.ok,false);assert.doesNotMatch(response.error,/secret/);
});
test('disconnect clears credentials even when revocation fails',async()=>{
 const {chrome,data}=harness({clientId:'client',token:'secret',account:{userId:'1',login:'kevin'}});
 const worker=createWorker(chrome,async()=>{throw Error('offline');});
 assert.equal((await worker.handle({type:'disconnect'},setup)).ok,true);
 assert.equal(data.token,undefined);assert.equal(data.account,undefined);
});
test('401 clears authorization and asks for reconnection',async()=>{
 const {chrome,data}=harness({clientId:'client',token:'secret',account:{userId:'1',login:'kevin',expiresAt:Date.now()+300000}});
 const worker=createWorker(chrome,async()=>new Response('',{status:401}));
 const response=await worker.handle({type:'snapshot',category:'Fortnite'},content);
 assert.equal(response.ok,false);assert.match(response.error,/Connect Twitch/);assert.equal(data.token,undefined);
});
test('snapshot paginates and only loads avatars for the verified category',async()=>{
 const {chrome}=harness({clientId:'client',token:'secret',account:{userId:'1',login:'kevin',expiresAt:Date.now()+300000}});
 const calls=[];
 const stream=(id,game)=>({user_id:id,user_login:'user'+id,user_name:'User',game_id:game,title:'Live',viewer_count:10,thumbnail_url:'https://static-cdn.jtvnw.net/a.jpg',language:'en',tags:[]});
 const worker=createWorker(chrome,async url=>{
  calls.push(url);const parsed=new URL(url);
  if(parsed.pathname.endsWith('/games'))return Response.json({data:[{id:'10',name:'Fortnite'}]});
  if(parsed.pathname.endsWith('/users')) {assert.deepEqual(parsed.searchParams.getAll('id'),['2']);return Response.json({data:[{id:'2',profile_image_url:'https://static-cdn.jtvnw.net/avatar.jpg'}]});}
  return Response.json(parsed.searchParams.has('after')?{data:[stream('3','20')],pagination:{}}:{data:[stream('2','10')],pagination:{cursor:'next'}});
 });
 const response=await worker.handle({type:'snapshot',category:'Fortnite'},content);
 assert.equal(response.ok,true);assert.equal(response.streams.length,1);assert.equal(response.streams[0].user_id,'2');assert.equal(response.gameId,'10');assert.equal(calls.length,4);assert.ok(calls[2].includes('after=next'));
});
test('outdated snapshot response cannot survive disconnect',async()=>{
 const {chrome}=harness({clientId:'client',token:'secret',account:{userId:'1',login:'kevin',expiresAt:Date.now()+300000}});
 let release;const blocked=new Promise(resolve=>release=resolve);let entered;const started=new Promise(resolve=>entered=resolve);
 const worker=createWorker(chrome,async url=>{if(url.includes('/games?')){entered();await blocked;return Response.json({data:[{id:'10',name:'Fortnite'}]});}return Response.json({data:[],pagination:{}});});
 const pending=worker.handle({type:'snapshot',category:'Fortnite'},content);await started;
 await worker.handle({type:'disconnect'},setup);release();
 assert.equal((await pending).ok,false);
});
test('OAuth connects using matching generated state and validates identity',async()=>{
 const {chrome,data}=harness();
 chrome.identity.launchWebAuthFlow=async({url})=>{const state=new URL(url).searchParams.get('state');return `https://abc.chromiumapp.org/#state=${state}&access_token=secret&token_type=bearer`;};
 const worker=createWorker(chrome,async(url,options)=>{assert.equal(url,'https://id.twitch.tv/oauth2/validate');assert.equal(options.headers.Authorization,'OAuth secret');return Response.json({client_id:'client',user_id:'1',login:'kevin',expires_in:3600,scopes:['user:read:follows']});});
 assert.deepEqual(await worker.handle({type:'connect',clientId:'client'},setup),{ok:true,account:'kevin'});assert.equal(data.token,'secret');assert.equal(data.account.userId,'1');
});
test('rate limits are actionable and do not erase a valid account',async()=>{
 const {chrome,data}=harness({clientId:'client',token:'secret',account:{userId:'1',login:'kevin',expiresAt:Date.now()+300000}});
 const worker=createWorker(chrome,async()=>new Response('',{status:429}));
 const response=await worker.handle({type:'snapshot',category:'Fortnite'},content);
 assert.equal(response.ok,false);assert.match(response.error,/rate limit/);assert.equal(data.token,'secret');
});
test('OAuth rejects tampered state without storing a token',async()=>{
 const {chrome,data}=harness();
 chrome.identity.launchWebAuthFlow=async()=> 'https://abc.chromiumapp.org/#state=wrong&access_token=secret&token_type=bearer';
 const worker=createWorker(chrome,async()=>{throw Error('must not request');});
 assert.equal((await worker.handle({type:'connect',clientId:'client'},setup)).ok,false);assert.equal(data.token,undefined);
});
test('periodic validation rejects a changed identity',async()=>{
 const {chrome,data}=harness({clientId:'client',token:'secret',account:{userId:'1',login:'kevin',expiresAt:Date.now()+300000}});
 const worker=createWorker(chrome,async()=>Response.json({client_id:'client',user_id:'2',login:'other',expires_in:3600,scopes:['user:read:follows']}));
 await worker.checkAuthorization();assert.equal(data.token,undefined);assert.equal(data.account,undefined);
});
test('account changes notify open tabs without exposing credentials',async()=>{
 const {chrome}=harness();const delivered=[];
 chrome.tabs={query:async()=>[{id:1},{id:2}],sendMessage:async(id,message)=>{delivered.push({id,message});if(id===2)throw Error('No receiver');}};
 chrome.identity.launchWebAuthFlow=async({url})=>`https://abc.chromiumapp.org/#state=${new URL(url).searchParams.get('state')}&access_token=secret&token_type=bearer`;
 const worker=createWorker(chrome,async()=>Response.json({client_id:'client',user_id:'1',login:'kevin',expires_in:3600,scopes:['user:read:follows']}));
 assert.equal((await worker.handle({type:'connect',clientId:'client'},setup)).ok,true);
 assert.equal(delivered.length,4);
 assert.ok(delivered.every(item=>JSON.stringify(item.message)==='{"type":"accountChanged"}'));
 assert.equal((await worker.handle({type:'disconnect'},setup)).ok,true);
 assert.equal(delivered.length,6);
});
test('missing authorization returns reconnect without invalidating its own UI request',async()=>{
 const {chrome}=harness();const messages=[];
 chrome.tabs={query:async()=>[{id:1}],sendMessage:async(id,message)=>messages.push(message)};
 const worker=createWorker(chrome,async()=>{throw Error('must not fetch');});
 const result=await worker.handle({type:'snapshot',category:'Fortnite'},content);
 assert.match(result.error,/Connect Twitch/);assert.equal(messages.length,0);
});

function deferred() {
 let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};
}
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
function connected() { return {clientId:'client',token:'secret',account:{userId:'1',login:'kevin',expiresAt:Date.now()+300000}}; }
function authorize(chrome) {
 const launched=[];
 chrome.identity.launchWebAuthFlow=async({url})=>{
  const params=new URL(url).searchParams;const client=params.get('client_id');launched.push(client);
  return `https://abc.chromiumapp.org/#state=${params.get('state')}&access_token=${client}&token_type=bearer`;
 };
 return launched;
}
function validationResponse(url,options) {
 if(url.endsWith('/revoke'))return new Response('');
 const client=options.headers.Authorization.slice('OAuth '.length);
 return Response.json({client_id:client,user_id:'1',login:client,expires_in:3600,scopes:['user:read:follows']});
}
test('disconnect invalidates a snapshot while its initial credential read is pending',async()=>{
 const {chrome}=harness(connected());const entered=deferred(),release=deferred();const get=chrome.storage.local.get;let first=true;const calls=[];
 chrome.storage.local.get=async keys=>{const saved=await get(keys);if(first){first=false;entered.resolve();await release.promise;}return saved;};
 const worker=createWorker(chrome,async url=>{calls.push(url);return url.includes('/games?')?Response.json({data:[{id:'10',name:'Fortnite'}]}):Response.json({data:[],pagination:{}});});
 const pending=worker.handle({type:'snapshot',category:'Fortnite'},content);await entered.promise;
 await worker.handle({type:'disconnect'},setup);release.resolve();
 assert.equal((await pending).ok,false);assert.equal(calls.filter(url=>url.startsWith('https://api.twitch.tv/')).length,0);
});
test('a connect waiting for tab notification cannot overwrite a newer connection',async()=>{
 const {chrome,data}=harness();const entered=deferred(),release=deferred();let first=true;
 chrome.tabs={query:async()=>{if(first){first=false;entered.resolve();await release.promise;}return [];},sendMessage:async()=>{}};
 const launched=authorize(chrome);const worker=createWorker(chrome,validationResponse);
 const old=worker.handle({type:'connect',clientId:'older'},setup);await entered.promise;
 assert.equal((await worker.handle({type:'connect',clientId:'newer'},setup)).ok,true);release.resolve();
 assert.equal((await old).ok,false);assert.equal(data.clientId,'newer');assert.equal(data.token,'newer');assert.deepEqual(launched,['newer']);
});
test('a delayed disconnect read cannot erase a newer connection',async()=>{
 const {chrome,data}=harness(connected());const entered=deferred(),release=deferred();const get=chrome.storage.local.get;let first=true;
 chrome.storage.local.get=async keys=>{const saved=await get(keys);if(first){first=false;entered.resolve();await release.promise;}return saved;};
 authorize(chrome);const worker=createWorker(chrome,validationResponse);
 const old=worker.handle({type:'disconnect'},setup);await entered.promise;
 const newer=worker.handle({type:'connect',clientId:'newer'},setup);await nextTurn();release.resolve();
 await old;assert.equal((await newer).ok,true);assert.equal(data.token,'newer');assert.equal(data.account.login,'newer');
});
test('disconnect wins over an authorization credential write already in flight',async()=>{
 const {chrome,data}=harness();const entered=deferred(),release=deferred();const set=chrome.storage.local.set;
 chrome.storage.local.set=async values=>{if(values.token){entered.resolve();await release.promise;}return set(values);};
 authorize(chrome);const worker=createWorker(chrome,validationResponse);
 const connection=worker.handle({type:'connect',clientId:'client'},setup);await entered.promise;
 const removal=worker.handle({type:'disconnect'},setup);await nextTurn();release.resolve();
 await Promise.all([connection,removal]);assert.equal(data.token,undefined);assert.equal(data.account,undefined);
});
test('disconnect wins over a validation account write already in flight',async()=>{
 const {chrome,data}=harness(connected());const entered=deferred(),release=deferred();const set=chrome.storage.local.set;
 chrome.storage.local.set=async values=>{if(values.account){entered.resolve();await release.promise;}return set(values);};
 const worker=createWorker(chrome,async url=>url.endsWith('/revoke')?new Response(''):Response.json({client_id:'client',user_id:'1',login:'kevin',expires_in:3600,scopes:['user:read:follows']}));
 const validation=worker.checkAuthorization();await entered.promise;
 const removal=worker.handle({type:'disconnect'},setup);await nextTurn();release.resolve();
 await Promise.all([validation,removal]);assert.equal(data.token,undefined);assert.equal(data.account,undefined);
});
test('a delayed credential clear cannot delete the next connection OAuth state',async()=>{
 const {chrome,data}=harness(connected());const entered=deferred(),release=deferred();const remove=chrome.storage.local.remove;let first=true;
 chrome.storage.local.remove=async keys=>{await remove(keys);if(first){first=false;entered.resolve();await release.promise;}};
 const flowEntered=deferred(),flowRelease=deferred();
 chrome.identity.launchWebAuthFlow=async({url})=>{flowEntered.resolve();await flowRelease.promise;return `https://abc.chromiumapp.org/#state=${new URL(url).searchParams.get('state')}&access_token=newer&token_type=bearer`;};
 const worker=createWorker(chrome,validationResponse);const old=worker.handle({type:'disconnect'},setup);await entered.promise;
 const newer=worker.handle({type:'connect',clientId:'newer'},setup);await nextTurn();release.resolve();await old;await flowEntered.promise;flowRelease.resolve();
 assert.equal((await newer).ok,true);assert.equal(data.token,'newer');
});

test('snapshot rejects corrupt persisted credentials before contacting Twitch',async()=>{
 const corrupt=[
  {account:{expiresAt:Date.now()+300000}},
  {token:{value:'secret'}},
  {token:''},
  {clientId:{value:'client'}},
  {account:{userId:1,login:'kevin',expiresAt:Date.now()+300000}},
  {account:{userId:'1',login:['kevin'],expiresAt:Date.now()+300000}},
  {account:{userId:'1',login:'kevin',expiresAt:'future'}}
 ];
 for(const invalid of corrupt){
  const {chrome,data}=harness({...connected(),...invalid});const calls=[];
  const worker=createWorker(chrome,async url=>{calls.push(url);return url.includes('/games?')?Response.json({data:[{id:'10',name:'Fortnite'}]}):Response.json({data:[],pagination:{}});});
  const result=await worker.handle({type:'snapshot',category:'Fortnite'},content);
  assert.equal(result.ok,false);assert.match(result.error,/Connect Twitch/);assert.deepEqual(calls,[]);assert.equal(data.token,undefined);assert.equal(data.account,undefined);
 }
});
test('periodic validation clears malformed saved tokens without sending them',async()=>{
 const {chrome,data}=harness({...connected(),token:{value:'secret'}});const calls=[];
 const worker=createWorker(chrome,async url=>{calls.push(url);return new Response('',{status:401});});
 await worker.checkAuthorization();assert.deepEqual(calls,[]);assert.equal(data.token,undefined);assert.equal(data.account,undefined);
});
test('setup status clears corrupt authorization and returns a usable disconnected state',async()=>{
 const {chrome,data}=harness({...connected(),account:{login:'kevin'}});
 const worker=createWorker(chrome,async()=>{throw Error('must not request');});
 assert.deepEqual(await worker.handle({type:'status'},setup),{ok:true,clientId:'client',account:null,redirectUrl:'https://abc.chromiumapp.org/'});
 assert.equal(data.token,undefined);assert.equal(data.account,undefined);
});
test('setup status never returns a malformed saved client ID',async()=>{
 const {chrome}=harness({clientId:{value:'client'}});const messages=[];
 chrome.tabs={query:async()=>[{id:1}],sendMessage:async(id,message)=>messages.push(message)};
 const worker=createWorker(chrome,async()=>{throw Error('must not request');});
 assert.deepEqual(await worker.handle({type:'status'},setup),{ok:true,clientId:'',account:null,redirectUrl:'https://abc.chromiumapp.org/'});
 assert.deepEqual(messages,[]);
});
test('disconnect removes corrupt stored authorization without transmitting it for revocation',async()=>{
 const {chrome,data}=harness({...connected(),token:{value:'secret'}});const calls=[];
 const worker=createWorker(chrome,async url=>{calls.push(url);return new Response('');});
 assert.equal((await worker.handle({type:'disconnect'},setup)).ok,true);assert.deepEqual(calls,[]);assert.equal(data.token,undefined);
});
test('a delayed periodic validation failure cannot clear a newer connected account',async()=>{
 const {chrome,data}=harness(connected());const entered=deferred(),release=deferred();
 authorize(chrome);
 const worker=createWorker(chrome,async(url,options)=>{
  if(options.headers.Authorization==='OAuth secret'){entered.resolve();await release.promise;return new Response('',{status:401});}
  return validationResponse(url,options);
 });
 const validation=worker.checkAuthorization();await entered.promise;
 assert.equal((await worker.handle({type:'connect',clientId:'newer'},setup)).ok,true);release.resolve();await validation;
 assert.equal(data.token,'newer');assert.equal(data.clientId,'newer');assert.equal(data.account.login,'newer');
});
