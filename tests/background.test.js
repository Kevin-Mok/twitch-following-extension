import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from '../src/background.js';
const setup={id:'abc',url:'chrome-extension://abc/options.html'};
const content={id:'abc',url:'https://www.twitch.tv/directory/category/fortnite',tab:{id:1}};
const device=()=>({device_code:'deviceSecret',user_code:'ABCD1234',verification_uri:'https://www.twitch.tv/activate',expires_in:1800,interval:5});
const identity=(client='client')=>({client_id:client,user_id:'1',login:client,expires_in:3600,scopes:['user:read:follows']});
const connected=()=>({token:'secret',account:{userId:'1',login:'kevin',expiresAt:Date.now()+300000}});
function harness(initial={},localInitial={clientId:'client'}) {
 const local={...localInitial},session={...initial},access=[];
 const area=(object,name)=>({get:async()=>({...object}),set:async values=>Object.assign(object,values),remove:async keys=>{for(const key of [].concat(keys))delete object[key];},setAccessLevel:async value=>access.push([name,value.accessLevel])});
 const chrome={runtime:{id:'abc',openOptionsPage:async()=>{}},storage:{local:area(local,'local'),session:area(session,'session')}};
 return {chrome,local,session,access};
}
function deferred(){let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};}
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
const noFetch=async()=>{throw Error('must not fetch');};
async function begin(worker){return worker.handle({type:'connect',clientId:'client'},setup);}
function flowFetcher(tokenResponse=()=>Response.json({access_token:'secret',token_type:'bearer',refresh_token:'ignored'})) {
 return async(url,options)=>{
  if(url.endsWith('/device'))return Response.json(device());
  if(url.endsWith('/token'))return tokenResponse();
  if(url.endsWith('/validate'))return Response.json(identity());
  if(url.endsWith('/revoke'))return new Response('');
  throw Error('Unexpected URL');
 };
}
test('status exposes no credentials, trusts storage only to extension, and rejects content auth',async()=>{
 const {chrome,access}=harness(connected());const worker=createWorker(chrome,noFetch);
 assert.deepEqual(await worker.handle({type:'status'},content),{ok:true,clientId:'client',configured:false,account:'kevin',pending:null});
 assert.deepEqual(access.sort(),[['local','TRUSTED_CONTEXTS'],['session','TRUSTED_CONTEXTS']]);
 for(const message of [{type:'connect',clientId:'client'},{type:'pollAuthorization'},{type:'disconnect'}])assert.equal((await worker.handle(message,content)).ok,false);
});
test('legacy persistent authorization is purged, never migrated or transmitted',async()=>{
 const {chrome,local,session}=harness({}, {clientId:'client',...connected()});const worker=createWorker(chrome,noFetch);
 assert.equal((await worker.handle({type:'status'},setup)).account,null);
 assert.deepEqual(local,{clientId:'client'});assert.deepEqual(session,{});
 assert.match((await worker.handle({type:'snapshot',category:'Fortnite'},content)).error,/Connect Twitch/);
});
test('session loss requires reconnection while preserving public client configuration',async()=>{
 const {chrome,local,session}=harness(connected());session.token=undefined;delete session.account;
 const result=await createWorker(chrome,noFetch).handle({type:'status'},setup);
 assert.equal(result.account,null);assert.equal(result.clientId,'client');assert.deepEqual(local,{clientId:'client'});
});
test('device connect posts the scope and exposes only the user activation fields',async()=>{
 const {chrome,local,session}=harness();const calls=[];
 const worker=createWorker(chrome,async(url,options)=>{calls.push({url,options});return Response.json(device());});
 const result=await begin(worker);
 assert.equal(result.ok,true);assert.deepEqual(Object.keys(result.pending).sort(),['expiresAt','interval','userCode','verificationUri']);
 assert.equal(result.pending.userCode,'ABCD1234');assert.equal(result.pending.verificationUri,'https://www.twitch.tv/activate');assert.equal(result.pending.interval,5);
 assert.ok(result.pending.expiresAt>Date.now()+1700000);assert.equal(session.pendingOAuth.deviceCode,'deviceSecret');
 assert.deepEqual(local,{clientId:'client'});assert.equal(calls[0].url,'https://id.twitch.tv/oauth2/device');assert.equal(calls[0].options.method,'POST');
 assert.equal(calls[0].options.headers['Content-Type'],'application/x-www-form-urlencoded');
 assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0].options.body)),{client_id:'client',scopes:'user:read:follows'});
 assert.deepEqual((await worker.handle({type:'status'},setup)).pending,result.pending);
});
test('device validation rejects malicious activation URLs and malformed responses',async()=>{
 const userInfoUri=new URL('https://www.twitch.tv/activate');userInfoUri.username='fixture';
 const spoofedOriginUri=new URL('https://evil.example/activate');spoofedOriginUri.username='www.twitch.tv';
 const invalid=[{device_code:''},{user_code:''},{expires_in:0},{expires_in:'1800'},{interval:0},{interval:-1},{verification_uri:'https://evil.example/activate'},{verification_uri:spoofedOriginUri.href},{verification_uri:'http://www.twitch.tv/activate'},{verification_uri:'https://www.twitch.tv:444/activate'},{verification_uri:userInfoUri.href},{verification_uri:'https://www.twitch.tv/other'}];
 for(const patch of invalid){
  const {chrome,session}=harness();const worker=createWorker(chrome,async()=>Response.json({...device(),...patch}));
  const result=await begin(worker);assert.equal(result.ok,false,JSON.stringify(patch));assert.equal(session.pendingOAuth,undefined);
 }
});
test('device flow uses default five-second interval when Twitch omits it',async()=>{
 const {chrome}=harness();const worker=createWorker(chrome,async()=>{const value=device();delete value.interval;return Response.json(value);});
 assert.equal((await begin(worker)).pending.interval,5);
});
test('poll respects server interval, validates approved token, and stores bearer only in session',async()=>{
 const {chrome,local,session}=harness();const calls=[];
 const worker=createWorker(chrome,async(url,options)=>{calls.push({url,options});return flowFetcher()(url,options);});
 await begin(worker);assert.ok((await worker.handle({type:'pollAuthorization'},setup)).pending);assert.equal(calls.length,1);
 session.pendingOAuth.nextPollAt=0;
 assert.deepEqual(await worker.handle({type:'pollAuthorization'},setup),{ok:true,account:'client'});
 assert.equal(session.token,'secret');assert.equal(session.account.userId,'1');assert.equal(session.pendingOAuth,undefined);assert.equal(session.refresh_token,undefined);
 assert.deepEqual(local,{clientId:'client'});
 const tokenRequest=calls.find(call=>call.url.endsWith('/token'));
 assert.deepEqual(Object.fromEntries(new URLSearchParams(tokenRequest.options.body)),{client_id:'client',scopes:'user:read:follows',device_code:'deviceSecret',grant_type:'urn:ietf:params:oauth:grant-type:device_code'});
 assert.equal(calls.find(call=>call.url.endsWith('/validate')).options.headers.Authorization,'OAuth secret');
 assert.equal(JSON.stringify(await worker.handle({type:'status'},setup)).includes('secret'),false);
});
test('pending authorization waits; slow_down increases the polling interval',async()=>{
 for(const error of [{message:'authorization_pending'},{error:'authorization_pending'},{error:'slow_down'}]){
  const {chrome,session}=harness();let polls=0;
  const worker=createWorker(chrome,flowFetcher(()=>{polls++;return Response.json(error,{status:400});}));await begin(worker);session.pendingOAuth.nextPollAt=0;
  const result=await worker.handle({type:'pollAuthorization'},setup);assert.equal(result.ok,true);assert.equal(result.pending.interval,error.error==='slow_down'?10:5);
  await worker.handle({type:'pollAuthorization'},setup);assert.equal(polls,1);
 }
});
test('expired, denied, and malformed token responses stop authorization without leaking Twitch details',async()=>{
 for(const reply of [()=>Response.json({error:'access_denied',message:'deviceSecret'},{status:400}),()=>Response.json({message:'invalid device code',details:'deviceSecret'},{status:400}),()=>Response.json({error:'expired_token'},{status:400}),()=>Response.json({access_token:{value:'secret'},token_type:'bearer'}),()=>Response.json({access_token:'secret',token_type:'other'}),()=>new Response('deviceSecret',{status:400})]){
  const {chrome,local,session}=harness();const worker=createWorker(chrome,flowFetcher(reply));await begin(worker);session.pendingOAuth.nextPollAt=0;
  const result=await worker.handle({type:'pollAuthorization'},setup);assert.equal(result.ok,false);assert.doesNotMatch(result.error,/deviceSecret/);assert.equal(session.pendingOAuth,undefined);assert.equal(session.token,undefined);assert.deepEqual(local,{clientId:'client'});
 }
});
test('pending expiry prevents any token request and clears setup state',async()=>{
 const {chrome,session}=harness();let calls=0;const worker=createWorker(chrome,async()=>{calls++;return Response.json(device());});await begin(worker);session.pendingOAuth.expiresAt=Date.now()-1;
 assert.equal((await worker.handle({type:'pollAuthorization'},setup)).ok,false);assert.equal(calls,1);assert.equal(session.pendingOAuth,undefined);
});
test('token identity must match requested client and required scope before storage',async()=>{
 for(const patch of [{client_id:'wrong'},{scopes:[]},{user_id:''},{expires_in:0}]){
  const {chrome,session}=harness();const worker=createWorker(chrome,async(url,options)=>url.endsWith('/validate')?Response.json({...identity(),...patch}):flowFetcher()(url,options));
  await begin(worker);session.pendingOAuth.nextPollAt=0;assert.equal((await worker.handle({type:'pollAuthorization'},setup)).ok,false);assert.equal(session.token,undefined);assert.equal(session.pendingOAuth,undefined);
 }
});
test('disconnect cancels pending authorization and clears credentials even if revocation fails',async()=>{
 const {chrome,session,local}=harness(connected());let revoked=false;
 const worker=createWorker(chrome,async(url,options)=>{assert.equal(url,'https://id.twitch.tv/oauth2/revoke');assert.equal(new URLSearchParams(options.body).get('token'),'secret');revoked=true;throw Error('offline');});
 assert.deepEqual(await worker.handle({type:'disconnect'},setup),{ok:true});assert.equal(revoked,true);assert.deepEqual(session,{});assert.deepEqual(local,{clientId:'client'});
 const pendingWorker=createWorker(chrome,flowFetcher());await begin(pendingWorker);await pendingWorker.handle({type:'disconnect'},setup);assert.deepEqual(session,{});
});
test('snapshot fails as a whole on pagination failure and never leaks remote details',async()=>{
 const {chrome}=harness(connected());const worker=createWorker(chrome,async url=>url.includes('/games?')?Response.json({data:[{id:'10',name:'Fortnite'}]}):new Response('secret server error',{status:503}));
 const response=await worker.handle({type:'snapshot',category:'Fortnite'},content);assert.equal(response.ok,false);assert.doesNotMatch(response.error,/secret/);
});
test('401 clears session authorization and asks for reconnection',async()=>{
 const {chrome,session}=harness(connected());const worker=createWorker(chrome,async()=>new Response('',{status:401}));
 const response=await worker.handle({type:'snapshot',category:'Fortnite'},content);assert.equal(response.ok,false);assert.match(response.error,/Connect Twitch/);assert.equal(session.token,undefined);
});
test('snapshot paginates and only loads avatars for the verified category',async()=>{
 const {chrome}=harness(connected());const calls=[];const stream=(id,game)=>({user_id:id,user_login:'user'+id,user_name:'User',game_id:game,title:'Live',viewer_count:10,thumbnail_url:'https://static-cdn.jtvnw.net/a.jpg',language:'en',tags:[]});
 const worker=createWorker(chrome,async url=>{calls.push(url);const parsed=new URL(url);
  if(parsed.pathname.endsWith('/games'))return Response.json({data:[{id:'10',name:'Fortnite'}]});
  if(parsed.pathname.endsWith('/users')){assert.deepEqual(parsed.searchParams.getAll('id'),['2']);return Response.json({data:[{id:'2',profile_image_url:'https://static-cdn.jtvnw.net/avatar.jpg'}]});}
  return Response.json(parsed.searchParams.has('after')?{data:[stream('3','20')],pagination:{}}:{data:[stream('2','10')],pagination:{cursor:'next'}});
 });
 const response=await worker.handle({type:'snapshot',category:'Fortnite'},content);assert.equal(response.ok,true);assert.equal(response.streams.length,1);assert.equal(response.streams[0].user_id,'2');assert.equal(response.gameId,'10');assert.equal(calls.length,4);
});
test('rate limits remain actionable without erasing a connected account',async()=>{
 const {chrome,session}=harness(connected());const worker=createWorker(chrome,async()=>new Response('',{status:429}));const response=await worker.handle({type:'snapshot',category:'Fortnite'},content);
 assert.match(response.error,/rate limit/);assert.equal(session.token,'secret');
});
test('periodic validation rejects changed identity and malformed saved authorization',async()=>{
 const {chrome,session}=harness(connected());const worker=createWorker(chrome,async()=>Response.json({...identity(),user_id:'2'}));await worker.checkAuthorization();assert.equal(session.token,undefined);
 for(const patch of [{token:{value:'secret'}},{account:{login:'kevin'}}]){
  const state=harness({...connected(),...patch});await createWorker(state.chrome,noFetch).checkAuthorization();assert.equal(state.session.token,undefined);
 }
});
test('corrupt session credentials are cleared without transmitting them',async()=>{
 for(const patch of [{account:{expiresAt:Date.now()+300000}},{token:{value:'secret'}},{token:''},{account:{userId:1,login:'kevin',expiresAt:Date.now()+300000}},{account:{userId:'1',login:['kevin'],expiresAt:Date.now()+300000}},{account:{userId:'1',login:'kevin',expiresAt:'future'}}]){
  const {chrome,session}=harness({...connected(),...patch});const worker=createWorker(chrome,noFetch);const result=await worker.handle({type:'snapshot',category:'Fortnite'},content);
  assert.equal(result.ok,false);assert.match(result.error,/Connect Twitch/);assert.equal(session.token,undefined);assert.equal(session.account,undefined);
 }
});
test('setup status clears corrupt authorization and never returns a malformed client ID',async()=>{
 const {chrome,session}=harness({...connected(),account:{login:'kevin'}});const worker=createWorker(chrome,noFetch);
 assert.equal((await worker.handle({type:'status'},setup)).account,null);assert.equal(session.token,undefined);
 const state=harness({}, {clientId:{value:'client'}});assert.equal((await createWorker(state.chrome,noFetch).handle({type:'status'},setup)).clientId,'');
});
test('account changes notify open tabs without exposing credentials',async()=>{
 const {chrome,session}=harness();const delivered=[];chrome.tabs={query:async()=>[{id:1},{id:2}],sendMessage:async(id,message)=>{delivered.push({id,message});if(id===2)throw Error('No receiver');}};
 const worker=createWorker(chrome,flowFetcher());await begin(worker);session.pendingOAuth.nextPollAt=0;assert.equal((await worker.handle({type:'pollAuthorization'},setup)).ok,true);assert.equal(delivered.length,4);
 await worker.handle({type:'disconnect'},setup);assert.equal(delivered.length,6);assert.ok(delivered.every(item=>JSON.stringify(item.message)==='{"type":"accountChanged"}'));
});
test('missing authorization returns reconnect without invalidating its own UI request',async()=>{
 const {chrome}=harness();const messages=[];chrome.tabs={query:async()=>[{id:1}],sendMessage:async(id,message)=>messages.push(message)};
 const result=await createWorker(chrome,noFetch).handle({type:'snapshot',category:'Fortnite'},content);assert.match(result.error,/Connect Twitch/);assert.equal(messages.length,0);
});
test('disconnect invalidates a snapshot while initial credential read is pending',async()=>{
 const {chrome}=harness(connected());const entered=deferred(),release=deferred();const get=chrome.storage.session.get;let first=true;const calls=[];
 chrome.storage.session.get=async keys=>{const saved=await get(keys);if(first){first=false;entered.resolve();await release.promise;}return saved;};
 const worker=createWorker(chrome,async url=>{calls.push(url);return Response.json({data:[]});});const pending=worker.handle({type:'snapshot',category:'Fortnite'},content);await entered.promise;
 await worker.handle({type:'disconnect'},setup);release.resolve();assert.equal((await pending).ok,false);assert.equal(calls.filter(url=>url.startsWith('https://api.twitch.tv/')).length,0);
});
test('disconnect invalidates snapshot while category fetch is pending',async()=>{
 const {chrome}=harness(connected());const entered=deferred(),release=deferred();const worker=createWorker(chrome,async url=>{if(url.includes('/games?')){entered.resolve();await release.promise;return Response.json({data:[{id:'10',name:'Fortnite'}]});}return new Response('');});
 const pending=worker.handle({type:'snapshot',category:'Fortnite'},content);await entered.promise;await worker.handle({type:'disconnect'},setup);release.resolve();assert.equal((await pending).ok,false);
});
test('newer connect wins when older device response arrives late',async()=>{
 const {chrome,session,local}=harness();const entered=deferred(),release=deferred();let first=true;
 const worker=createWorker(chrome,async()=>{if(first){first=false;entered.resolve();await release.promise;return Response.json(device());}return Response.json({...device(),device_code:'newDevice',user_code:'NEWCODE'});});
 const old=begin(worker);await entered.promise;assert.equal((await worker.handle({type:'connect',clientId:'newer'},setup)).ok,true);release.resolve();assert.equal((await old).ok,false);assert.equal(session.pendingOAuth.deviceCode,'newDevice');assert.equal(local.clientId,'newer');
});
test('disconnect wins over token validation while approval is in flight',async()=>{
 const {chrome,session}=harness();const entered=deferred(),release=deferred();const worker=createWorker(chrome,async(url,options)=>{if(url.endsWith('/validate')){entered.resolve();await release.promise;return Response.json(identity());}return flowFetcher()(url,options);});
 await begin(worker);session.pendingOAuth.nextPollAt=0;const poll=worker.handle({type:'pollAuthorization'},setup);await entered.promise;await worker.handle({type:'disconnect'},setup);release.resolve();assert.equal((await poll).ok,false);assert.deepEqual(session,{});
});
test('concurrent polls issue only one token request per interval',async()=>{
 const {chrome,session}=harness();const entered=deferred(),release=deferred();let count=0;
 const worker=createWorker(chrome,flowFetcher(async()=>{count++;entered.resolve();await release.promise;return Response.json({message:'authorization_pending'},{status:400});}));
 await begin(worker);session.pendingOAuth.nextPollAt=0;const poll=worker.handle({type:'pollAuthorization'},setup);await entered.promise;assert.ok((await worker.handle({type:'pollAuthorization'},setup)).pending);release.resolve();assert.equal((await poll).ok,true);assert.equal(count,1);
});
test('disconnect wins over token storage already in flight',async()=>{
 const {chrome,session}=harness();const entered=deferred(),release=deferred();const set=chrome.storage.session.set;chrome.storage.session.set=async values=>{if(values.token){entered.resolve();await release.promise;}return set(values);};
 const worker=createWorker(chrome,flowFetcher());await begin(worker);session.pendingOAuth.nextPollAt=0;const poll=worker.handle({type:'pollAuthorization'},setup);await entered.promise;
 const removal=worker.handle({type:'disconnect'},setup);await nextTurn();release.resolve();await Promise.all([poll,removal]);assert.deepEqual(session,{});
});
test('disconnect wins over periodic validation account storage already in flight',async()=>{
 const {chrome,session}=harness(connected());const entered=deferred(),release=deferred();const set=chrome.storage.session.set;chrome.storage.session.set=async values=>{if(values.account){entered.resolve();await release.promise;}return set(values);};
 const worker=createWorker(chrome,async url=>url.endsWith('/validate')?Response.json({...identity(),login:'kevin'}):new Response(''));const validation=worker.checkAuthorization();await entered.promise;
 const removal=worker.handle({type:'disconnect'},setup);await nextTurn();release.resolve();await Promise.all([validation,removal]);assert.deepEqual(session,{});
});
test('delayed old validation failure cannot delete a newer pending device flow',async()=>{
 const {chrome,session}=harness(connected());const entered=deferred(),release=deferred();const worker=createWorker(chrome,async(url,options)=>{if(url.endsWith('/validate')){entered.resolve();await release.promise;return new Response('',{status:401});}return flowFetcher()(url,options);});
 const validation=worker.checkAuthorization();await entered.promise;assert.equal((await begin(worker)).ok,true);release.resolve();await validation;assert.equal(session.pendingOAuth.deviceCode,'deviceSecret');
});
test('pending activation resumes after service-worker restart without early polling',async()=>{
 const {chrome,session}=harness();await begin(createWorker(chrome,flowFetcher()));
 const resumed=createWorker(chrome,noFetch);assert.equal((await resumed.handle({type:'status'},setup)).pending.userCode,'ABCD1234');assert.ok((await resumed.handle({type:'pollAuthorization'},setup)).pending);
 assert.equal((await resumed.handle({type:'status'},content)).pending,null);
 assert.equal(session.token,undefined);
});
test('malformed pending storage cannot become a token exchange',async()=>{
 for(const patch of [{deviceCode:[]},{verificationUri:'https://evil.example/activate'},{clientId:[]},{expiresAt:'later'},{interval:0},{nextPollAt:'later'}]){
  const {chrome,session}=harness();const worker=createWorker(chrome,flowFetcher());await begin(worker);Object.assign(session.pendingOAuth,{nextPollAt:0},patch);
  const resumed=createWorker(chrome,noFetch);assert.equal((await resumed.handle({type:'status'},setup)).pending,null);assert.equal((await resumed.handle({type:'pollAuthorization'},setup)).ok,false);assert.equal(session.pendingOAuth,undefined);
 }
});
test('a connect waiting for tab notification cannot overwrite a newer activation',async()=>{
 const {chrome,local,session}=harness();const entered=deferred(),release=deferred();let first=true;const requested=[];
 chrome.tabs={query:async()=>{if(first){first=false;entered.resolve();await release.promise;}return [];},sendMessage:async()=>{}};
 const worker=createWorker(chrome,async(url,options)=>{requested.push(new URLSearchParams(options.body).get('client_id'));return Response.json(device());});
 const old=worker.handle({type:'connect',clientId:'older'},setup);await entered.promise;
 assert.equal((await worker.handle({type:'connect',clientId:'newer'},setup)).ok,true);release.resolve();assert.equal((await old).ok,false);assert.equal(local.clientId,'newer');assert.equal(session.pendingOAuth.clientId,'newer');assert.deepEqual(requested,['newer']);
});
test('a delayed disconnect read cannot erase a newer activation',async()=>{
 const {chrome,local,session}=harness(connected());const entered=deferred(),release=deferred();const get=chrome.storage.session.get;let first=true;
 chrome.storage.session.get=async keys=>{const saved=await get(keys);if(first){first=false;entered.resolve();await release.promise;}return saved;};
 const worker=createWorker(chrome,flowFetcher());const old=worker.handle({type:'disconnect'},setup);await entered.promise;
 const newer=worker.handle({type:'connect',clientId:'newer'},setup);await nextTurn();release.resolve();await old;assert.equal((await newer).ok,true);assert.equal(local.clientId,'newer');assert.equal(session.pendingOAuth.clientId,'newer');assert.equal(session.token,undefined);
});
test('a delayed credential clear cannot remove the next activation state',async()=>{
 const {chrome,session}=harness(connected());const entered=deferred(),release=deferred();const remove=chrome.storage.session.remove;let first=true;
 chrome.storage.session.remove=async keys=>{await remove(keys);if(first){first=false;entered.resolve();await release.promise;}};
 const worker=createWorker(chrome,flowFetcher());const old=worker.handle({type:'disconnect'},setup);await entered.promise;
 const newer=worker.handle({type:'connect',clientId:'newer'},setup);await nextTurn();release.resolve();await old;assert.equal((await newer).ok,true);assert.equal(session.pendingOAuth.clientId,'newer');
});
test('Twitch activation URI preserves its documented public and device-code query',async()=>{
 const {chrome}=harness();const verification_uri='https://www.twitch.tv/activate?public=true&device-code=ABCDEFGH';
 const worker=createWorker(chrome,async()=>Response.json({...device(),verification_uri}));
 assert.equal((await begin(worker)).pending?.verificationUri,verification_uri);
});
test('a slow token exchange prevents overlapping polls after the interval passes',async()=>{
 const {chrome,session}=harness();const entered=deferred(),release=deferred();let count=0;
 const worker=createWorker(chrome,flowFetcher(async()=>{count++;if(count===1){entered.resolve();await release.promise;return Response.json({message:'authorization_pending'},{status:400});}return Response.json({access_token:'secret',token_type:'bearer'});}));
 await begin(worker);session.pendingOAuth.nextPollAt=0;const first=worker.handle({type:'pollAuthorization'},setup);await entered.promise;
 session.pendingOAuth.nextPollAt=0;const second=await worker.handle({type:'pollAuthorization'},setup);assert.ok(second.pending);assert.equal(count,1);
 release.resolve();assert.ok((await first).pending);assert.ok(session.pendingOAuth);assert.equal(session.token,undefined);
});
test('a pending response arriving after activation expiry cannot restore an expired code',async()=>{
 const {chrome,session}=harness();const entered=deferred(),release=deferred();
 const worker=createWorker(chrome,flowFetcher(async()=>{entered.resolve();await release.promise;return Response.json({message:'authorization_pending'},{status:400});}));
 await begin(worker);session.pendingOAuth.nextPollAt=0;const first=worker.handle({type:'pollAuthorization'},setup);await entered.promise;
 session.pendingOAuth.expiresAt=Date.now()-1;release.resolve();assert.equal((await first).ok,false);assert.equal(session.pendingOAuth,undefined);
});
test('a delayed pending response cannot restore authorization cancelled by disconnect',async()=>{
 const {chrome,session}=harness();const entered=deferred(),release=deferred();
 const worker=createWorker(chrome,flowFetcher(async()=>{entered.resolve();await release.promise;return Response.json({message:'authorization_pending'},{status:400});}));
 await begin(worker);session.pendingOAuth.nextPollAt=0;const poll=worker.handle({type:'pollAuthorization'},setup);await entered.promise;
 await worker.handle({type:'disconnect'},setup);release.resolve();assert.equal((await poll).ok,false);assert.deepEqual(session,{});
});
test('another setup page polling after approval receives the connected account without credentials',async()=>{
 const {chrome,session}=harness();const worker=createWorker(chrome,flowFetcher());await begin(worker);session.pendingOAuth.nextPollAt=0;
 assert.deepEqual(await worker.handle({type:'pollAuthorization'},setup),{ok:true,account:'client'});
 assert.deepEqual(await worker.handle({type:'pollAuthorization'},setup),{ok:true,account:'client'});assert.equal(session.token,'secret');
});
test('poll without pending authorization still rejects expired credentials and malformed pending state',async()=>{
 const {chrome}=harness({...connected(),account:{userId:'1',login:'kevin',expiresAt:Date.now()-1}});
 assert.equal((await createWorker(chrome,noFetch).handle({type:'pollAuthorization'},setup)).ok,false);
 const malformed=harness({...connected(),pendingOAuth:null});assert.equal((await createWorker(malformed.chrome,noFetch).handle({type:'pollAuthorization'},setup)).ok,false);
});
