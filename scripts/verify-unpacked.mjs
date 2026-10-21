import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const args=process.argv.slice(2),plain=args.includes('--plain') || process.env.CLI_PLAIN==='1';
if(args.includes('--help')){console.log((plain?'':'🔎 ')+'Usage: node scripts/verify-unpacked.mjs [ZIP_PATH] [--plain] [--details]');console.log('Loads the inspected ZIP in isolated Chrome, checks setup/pages/menu, and saves screenshots under artifacts/. Requires Chrome, Python3 and unzip; no account used.');process.exit(0);}
const zip=args.find(a=>!a.startsWith('--')) || 'artifacts/twitch-following-0.2.0-draft.zip';
const say=(message,emoji='🔎')=>console.log((plain?'':emoji+' ')+message);
const root=process.cwd(),temp=await mkdtemp(join(tmpdir(),'twitch-release-')),unpacked=join(temp,'extension');
await mkdir(unpacked);
try {execFileSync('python3',['scripts/release.py','inspect',zip,...(plain?['--plain']:[])],{stdio:'pipe'});execFileSync('unzip',['-q',resolve(zip),'-d',unpacked]);}
catch(error){say('Package inspection/extraction failed. Run release.py inspect on the archive first.','❌');if(args.includes('--details'))console.error(error);await rm(temp,{recursive:true,force:true});process.exit(1);}
const child=spawn(process.env.TWITCH_VERIFY_BROWSER || 'google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-port=0','--enable-unsafe-extension-debugging',`--user-data-dir=${join(temp,'profile')}`,'about:blank'],{stdio:'ignore'});
let launchError=null;child.on('error',error=>{launchError=error;});
let ws;let seq=0;const pending=new Map();const exceptions=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const started=Date.now();const progress=setInterval(()=>say(`Chrome verification is running; elapsed ${Math.round((Date.now()-started)/1000)}s.`),10000);
function call(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++seq;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error(`Timed out: ${method}`));},30000);pending.set(id,{resolve,reject,timeout});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
try {
 let port,path;
 for(let i=0;i<150;i++){if(launchError)throw launchError;try{[port,path]=(await readFile(join(temp,'profile','DevToolsActivePort'),'utf8')).trim().split('\n');break;}catch{await pause(100);}}
 assert.ok(port,'Chrome debugging port did not start');
 ws=new WebSocket(`ws://127.0.0.1:${port}${path}`);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 ws.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id){const p=pending.get(msg.id);if(p){clearTimeout(p.timeout);pending.delete(msg.id);msg.error?p.reject(new Error(JSON.stringify(msg.error))):p.resolve(msg.result);}}else if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params.exceptionDetails.text);});
 const version=await call('Browser.getVersion');say(version.product,'🌐');
 const {id}=await call('Extensions.loadUnpacked',{path:unpacked});assert.ok(id);say('Loaded actual ZIP source in isolated Chrome','🧩');
 const {targetId}=await call('Target.createTarget',{url:`chrome-extension://${id}/options.html`});const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 await call('Runtime.enable',{},sessionId);await call('Page.enable',{},sessionId);
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
 let state;
 for(let i=0;i<100;i++){state=await evaluate(`({status:document.querySelector('#status')?.textContent,loaded:document.readyState})`);if(state.status?.startsWith('Not connected.'))break;await pause(100);}
 assert.match(state.status,/Not connected/);
 const configured=await evaluate(`chrome.runtime.sendMessage({type:'status'}).then(s=>s.configured)`);
 assert.equal(await evaluate(`document.querySelector('#client-settings').hidden`),configured);
 assert.equal(await evaluate(`document.querySelector('#connect').disabled`),false);
 assert.equal(await evaluate(`document.querySelector('a[href="https://github.com/Kevin-Mok/twitch-following-extension"]').textContent`),'Open source on GitHub');
 const storage=await evaluate(`(async()=>({local:await chrome.storage.local.get(null),session:await chrome.storage.session.get(null),manifest:chrome.runtime.getManifest()}))()`);
 assert.equal(storage.local.token,undefined);assert.equal(storage.session.token,undefined);assert.deepEqual(storage.manifest.permissions,['storage','alarms']);assert.equal(storage.manifest.action.default_popup,undefined);
 for(const [width,height,theme] of [[1280,800,'light'],[390,844,'dark']]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]},sessionId);await pause(100);
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);await writeFile(join(root,`artifacts/setup-${width}-${theme}.png`),Buffer.from(shot.data,'base64'));
 }
 for(const file of ['help.html','privacy.html']){
  await call('Page.navigate',{url:`chrome-extension://${id}/${file}`},sessionId);await pause(300);
  assert.equal(await evaluate(`document.querySelectorAll('h1').length`),1);assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  assert.equal(await evaluate(`[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)`),true);
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},sessionId);await writeFile(join(root,`artifacts/${file.replace('.html','')}-390-dark.png`),Buffer.from(shot.data,'base64'));
 }
 await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false},sessionId);
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]},sessionId);
 await call('Page.navigate',{url:'https://www.twitch.tv/directory/category/fortnite'},sessionId);
 let found=false;
 for(let i=0;i<200;i++){found=await evaluate(`Boolean(document.querySelector('#browse-sort-drop-down'))`);if(found)break;await pause(150);}
 assert.equal(found,true,'Live Twitch sort control did not load');
 for(let i=0;i<100;i++){if(await evaluate(`document.querySelector('h1')?.textContent?.trim()==='Fortnite'`))break;await pause(100);}
 await evaluate(`document.querySelector('#browse-sort-drop-down').scrollIntoView({block:'center'});document.querySelector('#browse-sort-drop-down').click()`);
 for(let i=0;i<50;i++){found=await evaluate(`Boolean(document.querySelector('[data-tf-following]'))`);if(found)break;await pause(100);}
 assert.equal(found,true,'Actual content script did not inject Following');
 const geometry=await evaluate(`(()=>{const e=document.querySelector('[data-tf-following]'),a=e.querySelector('svg').getBoundingClientRect(),n=e.nextElementSibling.querySelector('svg').getBoundingClientRect();return {count:document.querySelectorAll('[data-tf-following]').length,display:getComputedStyle(e).display,left:a.x-n.x,width:a.width-nativeWidth(n),rowHeight:e.getBoundingClientRect().height};function nativeWidth(r){return r.width;}})()`);
 assert.equal(geometry.count,1);assert.equal(geometry.display,'flex');assert.equal(geometry.left,0);assert.equal(geometry.width,0);
 await pause(1200);
 const menuShot=await call('Page.captureScreenshot',{format:'png'},sessionId);
 await writeFile(join(root,'artifacts/twitch-menu-1280x800.png'),Buffer.from(menuShot.data,'base64'));
 say('Real Twitch category menu contains exactly one aligned Following item; genuine screenshot captured.','✅');
 assert.deepEqual(exceptions,[]);say('Real extension setup, bundled help/privacy, limited permissions and narrow/dark layouts passed; no exceptions observed in inspected pages.','✅');
 say('Screenshots saved under artifacts/. No Twitch account/token was used.','📷');
 await call('Browser.close');
} catch(error){say('Chrome verification failed. Check the browser installation, live Twitch availability and extension errors.','❌');if(args.includes('--details'))console.error(error);process.exitCode=1;} finally {clearInterval(progress);ws?.close();child.kill('SIGTERM');await pause(300);await rm(temp,{recursive:true,force:true});}
