import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(initial,respond=()=>({ok:true})) {
 const html=await readFile(new URL('../options.html',import.meta.url),'utf8');
 const page=new JSDOM(html,{url:'chrome-extension://fixture/options.html',runScripts:'outside-only'});
 const win=page.window;let now=100000;const timers=[];const messages=[];
 win.Date.now=()=>now;win.setTimeout=fn=>{timers.push(fn);return timers.length;};win.clearTimeout=()=>{};
 win.chrome={runtime:{sendMessage:async message=>{messages.push(message);return message.type==='status'?initial:respond(message);}}};
 win.eval(await readFile(new URL('../src/options.js',import.meta.url),'utf8'));await flush();
 return {doc:win.document,win,messages,close:()=>page.window.close(),async advance(ms){now+=ms;const callbacks=timers.splice(0);for(const fn of callbacks)fn();await flush();}};
}
const state={ok:true,clientId:'publisher123',configured:true,account:null,pending:null};
const pending={userCode:'ABCD-EFGH',verificationUri:'https://www.twitch.tv/activate?public=true',expiresAt:160000,interval:5};
test('configured setup starts device authorization and shows safe approval instructions',async()=>{
 const f=await fixture(state,()=>({ok:true,pending}));try{
  assert.equal(f.doc.querySelector('#client-settings')?.hidden,true);
  f.doc.querySelector('form').dispatchEvent(new f.win.Event('submit',{bubbles:true,cancelable:true}));await flush();
  assert.equal(f.doc.querySelector('#device-code')?.textContent,'ABCD-EFGH');
  assert.equal(f.doc.querySelector('#device-link')?.href,pending.verificationUri);
  assert.match(f.doc.querySelector('#status').textContent,/Twitch|approval/i);
  assert.equal(f.doc.querySelector('#disconnect').hidden,false);
 }finally{f.close();}
});
test('reopening setup resumes pending approval, polls at interval and shows connection',async()=>{
 const f=await fixture({...state,pending},()=>({ok:true,account:'viewer'}));try{
  assert.equal(f.doc.querySelector('#device-code')?.textContent,pending.userCode);
  await f.advance(4000);assert.equal(f.messages.filter(m=>m.type==='pollAuthorization').length,0);
  await f.advance(1000);
  assert.equal(f.messages.filter(m=>m.type==='pollAuthorization').length,1);
  assert.match(f.doc.querySelector('#status').textContent,/Connected as viewer/);
  assert.equal(f.doc.querySelector('#device-authorization').hidden,true);
 }finally{f.close();}
});
test('cancelling approval clears the code and stops polling',async()=>{
 const f=await fixture({...state,pending},()=>({ok:true}));try{
  f.doc.querySelector('#disconnect').click();await flush();
  await f.advance(6000);
  assert.equal(f.messages.filter(m=>m.type==='disconnect').length,1);
  assert.equal(f.messages.filter(m=>m.type==='pollAuthorization').length,0);
  assert.equal(f.doc.querySelector('#device-authorization')?.hidden,true);
  assert.match(f.doc.querySelector('#status').textContent,/Disconnect|Connect/i);
 }finally{f.close();}
});
test('approval expiry and unsafe activation URLs fail without opening a link',async()=>{
 const f=await fixture({...state,pending:{...pending,verificationUri:'https://evil.example/activate'}});try{
  assert.equal(f.doc.querySelector('#device-authorization')?.hidden,true);
  assert.match(f.doc.querySelector('#status').textContent,/invalid|safely|retry/i);
  assert.notEqual(f.doc.querySelector('#device-link')?.hostname,'evil.example');
 }finally{f.close();}
 const g=await fixture({...state,pending:{...pending,expiresAt:101000}});try{
  await g.advance(1000);assert.match(g.doc.querySelector('#status').textContent,/expired/i);
  assert.equal(g.messages.filter(m=>m.type==='pollAuthorization').length,0);
 }finally{g.close();}
});
test('unconfigured source setup explains the developer fallback and connection failures recover',async()=>{
 const f=await fixture({...state,configured:false,clientId:''},()=>({ok:false,error:'Twitch could not be reached.'}));try{
  assert.equal(f.doc.querySelector('#client-settings')?.hidden,false);
  f.doc.querySelector('#client-id').value='developer123';
  f.doc.querySelector('form').dispatchEvent(new f.win.Event('submit',{bubbles:true,cancelable:true}));await flush();
  assert.match(f.doc.querySelector('#status').textContent,/could not be reached/);
  assert.equal(f.doc.querySelector('#connect').disabled,false);
 }finally{f.close();}
});
