import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import * as dom from '../src/dom.js';
import * as core from '../src/core.js';
const html=`<!doctype html><html lang="en"><body><main><h1>Fortnite</h1><nav role="tablist"><a role="tab" aria-selected="true">Live Channels</a></nav><button aria-haspopup="menu" aria-expanded="true">Recommended For You</button><div role="menu"><button role="menuitemradio">Recommended For You</button><button role="menuitemradio">Viewers (High to Low)</button><button role="menuitemradio">Recently Started</button></div><div id="native"><div data-target="directory-page__card-container"><article><a data-a-target="preview-card-image-link" href="/native">Native</a></article></div></div></main></body></html>`;
const stream={user_id:'1',user_login:'safe_channel',user_name:'Safe',game_id:'10',viewer_count:7500,title:'<img src=x onerror=alert(1)>',thumbnail_url:'https://static-cdn.jtvnw.net/previews/live_user_safe-{width}x{height}.jpg',language:'en',tags:['English','Ranked']};
const delay=()=>new Promise(resolve=>setTimeout(resolve,130));
async function fixture(snapshot=()=>Promise.resolve({ok:true,streams:[stream],avatars:{},gameId:'10'})){
 const page=new JSDOM(html,{url:'https://www.twitch.tv/directory/category/fortnite?sort=RELEVANCE',runScripts:'outside-only'});
 const win=page.window;Object.assign(globalThis,{document:win.document,location:win.location});
 const messages=[];const listeners=[];
 win.fixtureDom=dom;win.fixtureCore=core;
 win.chrome={runtime:{getURL:path=>path,onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:message=>{messages.push(message);return message.type==='snapshot'?snapshot(message):Promise.resolve({ok:true});}}};
 let source=await readFile(new URL('../src/content.js',import.meta.url),'utf8');
 source=source.replace("await import(chrome.runtime.getURL('src/dom.js'))",'window.fixtureDom').replace("await import(chrome.runtime.getURL('src/core.js'))",'window.fixtureCore');
 win.eval(source);await delay();
 return {page,win,doc:win.document,messages,listeners};
}
test('menu once, cards safe, keyboard and native restoration',async()=>{
 const f=await fixture();try{
  assert.equal(f.doc.querySelectorAll('[data-tf-following]').length,1);
  const own=f.doc.querySelector('[data-tf-following]');own.click();await delay();
  assert.equal(f.doc.querySelector('[aria-haspopup]').textContent,'Following');
  assert.equal(f.doc.querySelector('#native').classList.contains('tf-native-hidden'),true);
  assert.equal(f.doc.querySelectorAll('.tf-card').length,1);
  assert.equal(f.doc.querySelector('.tf-title').textContent,stream.title);
  assert.equal(f.doc.querySelector('.tf-title img'),null);
  assert.equal(f.doc.querySelector('.tf-title').href,'https://www.twitch.tv/safe_channel');
  own.focus();own.dispatchEvent(new f.win.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));
  assert.equal(f.doc.activeElement.textContent,'Recently Started');
  f.doc.querySelectorAll('[role=menuitemradio]')[1].click();await delay();
  assert.equal(f.doc.querySelector('.tf-panel'),null);
  assert.equal(f.doc.querySelector('#native').classList.contains('tf-native-hidden'),false);
  assert.equal(f.doc.querySelector('[aria-haspopup]').textContent,'Recommended For You');
 }finally{f.page.window.close();}
});
test('pointer selection preserves combobox focus until Following closes the menu',async()=>{
 const f=await fixture();try{
  const trigger=f.doc.querySelector('[aria-haspopup]');const menu=f.doc.querySelector('[role=menu]');
  const own=f.doc.querySelector('[data-tf-following]');
  const icon=own.querySelector('svg');
  assert.equal(icon?.getAttribute('aria-hidden'),'true');
  assert.equal(icon.getAttribute('focusable'),'false');
  trigger.focus();
  trigger.addEventListener('blur',()=>{menu.remove();trigger.setAttribute('aria-expanded','false');});
  trigger.addEventListener('click',()=>{menu.remove();trigger.setAttribute('aria-expanded','false');});
  const down=new f.win.MouseEvent('mousedown',{button:0,bubbles:true,cancelable:true});
  // Model the browser's default focus transfer before mouseup/click.
  if(icon.dispatchEvent(down))own.focus();
  if(own.isConnected)icon.dispatchEvent(new f.win.MouseEvent('click',{bubbles:true,cancelable:true}));
  await delay();
  assert.equal(f.messages.filter(message=>message.type==='snapshot').length,1);
  assert.equal(trigger.textContent,'Following');
  assert.equal(trigger.getAttribute('aria-expanded'),'false');
  assert.equal(f.doc.activeElement,trigger);
  assert.equal(f.doc.querySelectorAll('.tf-card').length,1);
 }finally{f.page.window.close();}
});
test('keyboard navigation within the sort menu does not trigger Twitch blur dismissal',async()=>{
 const f=await fixture();try{
  const trigger=f.doc.querySelector('[aria-haspopup]');const menu=f.doc.querySelector('[role=menu]');
  trigger.addEventListener('focusout',()=>menu.remove());
  trigger.focus();
  trigger.dispatchEvent(new f.win.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
  f.doc.activeElement?.dispatchEvent(new f.win.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  await delay();
  assert.equal(f.messages.filter(message=>message.type==='snapshot').length,1);
  assert.equal(trigger.textContent,'Following');
 }finally{f.page.window.close();}
});
test('navigation during retrieval cannot paint the old category',async()=>{
 let resolve;const f=await fixture(()=>new Promise(done=>{resolve=done;}));try{
  f.doc.querySelector('[data-tf-following]').click();await delay();
  f.win.history.pushState({},'', '/directory/category/just-chatting');f.win.dispatchEvent(new f.win.PopStateEvent('popstate'));await delay();
  resolve({ok:true,streams:[stream],avatars:{},gameId:'10'});await delay();
  assert.equal(f.doc.querySelectorAll('.tf-card').length,0);
  assert.equal(f.doc.querySelector('#native').classList.contains('tf-native-hidden'),false);
 }finally{f.page.window.close();}
});
test('menu recreation and filter changes reuse snapshot; leaving category restores',async()=>{
 const f=await fixture();try{
  f.doc.querySelector('[data-tf-following]').click();await delay();
  f.doc.querySelector('[role=menu]').remove();
  const menu=f.doc.createElement('div');menu.setAttribute('role','menu');menu.innerHTML='<button role="menuitemradio">Recently Started</button><button role="menuitemradio">Viewers (Low to High)</button>';f.doc.querySelector('main').append(menu);await delay();
  assert.equal(f.doc.querySelectorAll('[data-tf-following]').length,1);
  f.win.history.pushState({},'', '/directory/category/fortnite?tl=Missing');f.win.dispatchEvent(new f.win.PopStateEvent('popstate'));await delay();
  assert.match(f.doc.querySelector('.tf-panel').textContent,/No live followed/);
  assert.equal(f.messages.filter(m=>m.type==='snapshot').length,1);
  f.win.history.pushState({},'', '/directory/category/fortnite/videos');f.win.dispatchEvent(new f.win.PopStateEvent('popstate'));await delay();
  assert.equal(f.doc.querySelector('.tf-panel'),null);
  assert.equal(f.doc.querySelector('#native').classList.contains('tf-native-hidden'),false);
 }finally{f.page.window.close();}
});
test('compatibility failures leave native content intact and report limitation',async()=>{
 const f=await fixture();try{
  f.doc.querySelector('#native').removeAttribute('id');f.doc.querySelector('[data-target]').removeAttribute('data-target');f.doc.querySelector('article').replaceWith(f.doc.createElement('div'));
  f.doc.querySelector('[data-tf-following]').click();await delay();
  assert.equal(f.doc.querySelector('.tf-native-hidden'),null);
  assert.match(f.doc.querySelector('.tf-panel').textContent,/cannot safely find/);
  assert.equal(f.messages.filter(m=>m.type==='snapshot').length,0);
 }finally{f.page.window.close();}
});
test('switching tabs at the same URL removes Following and guards late clicks',async()=>{
 const f=await fixture();try{
  const own=f.doc.querySelector('[data-tf-following]');own.click();await delay();
  f.doc.querySelector('[role=tab]').textContent='Videos';await delay();
  // Tab text mutations are observed even when Twitch keeps the category URL.
  assert.equal(f.doc.querySelector('[data-tf-following]'),null);
  assert.equal(f.doc.querySelector('.tf-panel'),null);
  own.click();await delay();
  assert.equal(f.doc.querySelector('.tf-panel'),null);
 }finally{f.page.window.close();}
});
test('language selection persists after menu removal without refetching',async()=>{
 const f=await fixture();try{
  const filter=f.doc.createElement('div');filter.setAttribute('data-a-target','language-filter-menu');filter.innerHTML='<label><span role="checkbox" aria-checked="true">French</span></label>';
  const button=f.doc.createElement('button');button.textContent='Language 1';f.doc.querySelector('main').prepend(button,filter);
  f.doc.querySelector('[data-tf-following]').click();await delay();
  assert.match(f.doc.querySelector('.tf-panel').textContent,/No live followed/);
  filter.remove();await delay();
  assert.match(f.doc.querySelector('.tf-panel').textContent,/No live followed/);
  assert.equal(f.messages.filter(m=>m.type==='snapshot').length,1);
 }finally{f.page.window.close();}
});
test('observed Twitch listbox options and directory container are supported',async()=>{
 const f=await fixture();try{
  const grid=f.doc.querySelector('#native');grid.setAttribute('data-target','directory-container');
  const card=grid.querySelector('[data-target]');card.removeAttribute('data-target');
  for(let i=0;i<8;i++){const wrap=f.doc.createElement('div');card.replaceWith(wrap);wrap.append(card);}
  f.doc.querySelector('[role=menu]').remove();
  const menu=f.doc.createElement('ul');menu.id='browse-sort-drop-down-list';menu.setAttribute('role','listbox');menu.innerHTML='<li role="option" aria-selected="true">Recommended For You</li><li role="option" aria-selected="false">Viewers (High to Low)</li>';f.doc.querySelector('main').append(menu);await delay();
  const own=f.doc.querySelector('[data-tf-following]');
  assert.equal(own.getAttribute('role'),'option');
  own.click();await delay();
  assert.equal(f.doc.querySelector('.tf-card')!==null,true);
  assert.equal(own.getAttribute('aria-selected'),'true');
  assert.equal(menu.querySelector('[aria-selected=true]'),own);
  assert.equal(menu.dataset.tfMode,'following');
  const trigger=f.doc.querySelector('[aria-haspopup]');trigger.focus();trigger.dispatchEvent(new f.win.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
  assert.equal(f.doc.activeElement,own);
 }finally{f.page.window.close();}
});
test('observed persisted language filters are validated and honored with menu closed',async()=>{
 const f=await fixture();try{
  f.win.localStorage.setItem('languageDirectoryFilters','["fr"]');
  const button=f.doc.createElement('button');button.textContent='Language1';f.doc.querySelector('main').prepend(button);
  f.doc.querySelector('[data-tf-following]').click();await delay();
  assert.match(f.doc.querySelector('.tf-panel').textContent,/No live followed/);
  f.win.localStorage.setItem('languageDirectoryFilters','[1]');button.textContent='Language1';await delay();
  assert.match(f.doc.querySelector('.tf-panel').textContent,/cannot be read safely/);
 }finally{f.page.window.close();}
});
test('React text-node updates cannot reset the Following control label',async()=>{
 const f=await fixture();try{
  f.doc.querySelector('[data-tf-following]').click();await delay();
  await delay();await delay();
  f.doc.querySelector('[aria-haspopup]').firstChild.nodeValue='Recommended For You';await delay();
  assert.equal(f.doc.querySelector('[aria-haspopup]').textContent,'Following');
 }finally{f.page.window.close();}
});
test('native modal aria-hidden background still allows closing sort and updating label',async()=>{
 const f=await fixture();try{
  const main=f.doc.querySelector('main');const menu=f.doc.querySelector('[role=menu]');f.doc.body.append(menu);
  const trigger=main.querySelector('[aria-haspopup]');trigger.id='browse-sort-drop-down';main.setAttribute('aria-hidden','true');
  let closed=false;trigger.addEventListener('click',()=>{closed=true;main.removeAttribute('aria-hidden');});
  f.doc.querySelector('[data-tf-following]').click();await delay();
  assert.equal(closed,true);assert.equal(trigger.textContent,'Following');
 }finally{f.page.window.close();}
});
test('category-header tags are read without absorbing card tags',async()=>{
 const f=await fixture();try{
  const tag=f.doc.createElement('a');tag.href='/directory/tags/genre-id';tag.textContent='Shooter';f.doc.querySelector('h1').after(tag);
  const fake=f.doc.createElement('button');fake.setAttribute('aria-label','Tag, Wrong');fake.textContent='Wrong';f.doc.querySelector('#native').append(fake);
  const filters=dom.readFilters(f.doc,'https://www.twitch.tv/directory/category/fortnite?tl=Shooter');
  assert.deepEqual(filters.categoryTags,['Shooter']);
 }finally{f.page.window.close();}
});
test('unverifiable category keeps native grid and explains compatibility',async()=>{
 const f=await fixture();try{
  f.doc.querySelector('h1').textContent='A different category';
  f.doc.querySelector('[data-tf-following]').click();await delay();
  assert.equal(f.doc.querySelector('.tf-native-hidden'),null);
  assert.match(f.doc.querySelector('.tf-panel')?.textContent || '',/cannot.*verify.*category/i);
 }finally{f.page.window.close();}
});
test('React removing only the Following panel cannot leave the native grid hidden',async()=>{
 const f=await fixture();try{
  f.doc.querySelector('[data-tf-following]').click();await delay();
  f.doc.querySelector('.tf-panel').remove();await delay();
  assert.equal(f.doc.querySelectorAll('.tf-panel').length,1);
  assert.equal(f.doc.querySelectorAll('.tf-card').length,1);
  assert.equal(f.messages.filter(message=>message.type==='snapshot').length,1);
 }finally{f.page.window.close();}
});
test('same-category native sort history restores Twitch completely',async()=>{
 const f=await fixture();try{
  f.doc.querySelector('[data-tf-following]').click();await delay();
  f.win.history.pushState({},'', '/directory/category/fortnite?sort=VIEWER_COUNT');
  f.win.dispatchEvent(new f.win.PopStateEvent('popstate'));await delay();
  assert.equal(f.doc.querySelector('.tf-panel'),null);
  assert.equal(f.doc.querySelector('.tf-native-hidden'),null);
  assert.notEqual(f.doc.querySelector('[aria-haspopup]').textContent,'Following');
 }finally{f.page.window.close();}
});
test('query-only History API changes update local filters without a page mutation',async()=>{
 const f=await fixture();try{
  f.doc.querySelector('[data-tf-following]').click();await delay();await delay();
  f.win.history.replaceState({},'', '/directory/category/fortnite?sort=RELEVANCE&tl=Missing');
  await new Promise(resolve=>setTimeout(resolve,700));
  assert.match(f.doc.querySelector('.tf-panel').textContent,/No live followed/);
  assert.equal(f.messages.filter(message=>message.type==='snapshot').length,1);
 }finally{f.page.window.close();}
});
