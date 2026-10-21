const form=document.querySelector('#connect-form');
const client=document.querySelector('#client-id');
const status=document.querySelector('#status');
const connect=document.querySelector('#connect');
const disconnect=document.querySelector('#disconnect');
const approval=document.querySelector('#device-authorization');
const code=document.querySelector('#device-code');
const link=document.querySelector('#device-link');
const expires=document.querySelector('#expires');
let pending=null,timer=null,nextPollAt=0,busy=false,revision=0;
const send=message=>chrome.runtime.sendMessage(message);
function stopPending() {
  pending=null;clearTimeout(timer);timer=null;approval.hidden=true;code.textContent='';link.removeAttribute('href');
}
function fail(message) {
  stopPending();busy=false;connect.disabled=false;disconnect.hidden=true;status.textContent=message;
}
function display(response) {
  if(!response?.ok)throw new Error(response?.error || 'Connection failed. Please retry.');
  if(Object.hasOwn(response,'clientId')) {
    client.value=response.clientId;
    document.querySelector('#client-settings').hidden=Boolean(response.configured);
    client.required=!response.configured;client.disabled=Boolean(response.configured);
  }
  stopPending();
  if(response.pending) {
    const value=response.pending;let url;
    try {url=new URL(value.verificationUri);}catch{throw new Error('Twitch authorization could not be opened safely. Please retry.');}
    if(url.origin!=='https://www.twitch.tv' || url.pathname!=='/activate' || url.username || url.password
      || typeof value.userCode!=='string' || !value.userCode || value.userCode.length>100
      || !Number.isFinite(value.expiresAt) || !Number.isFinite(value.interval) || value.interval<=0)throw new Error('Twitch returned invalid authorization instructions. Please retry.');
    pending=value;nextPollAt=Date.now()+value.interval*1000;
    code.textContent=value.userCode;link.href=url.href;approval.hidden=false;
    connect.disabled=true;disconnect.hidden=false;disconnect.textContent='Cancel connection';
    tick();return;
  }
  connect.disabled=false;connect.textContent=response.account?'Reconnect Twitch':'Connect Twitch';
  disconnect.hidden=!response.account;disconnect.textContent='Disconnect';
  status.textContent=response.account?`Connected as ${response.account}.`:'Not connected. Choose Connect Twitch to authorize this browser session.';
}
function tick() {
  if(!pending)return;
  const remaining=Math.ceil((pending.expiresAt-Date.now())/1000);
  if(remaining<=0){fail('The Twitch code expired. Choose Connect Twitch to try again.');return;}
  if(status.textContent!=='Waiting for Twitch approval…')status.textContent='Waiting for Twitch approval…';
  expires.textContent=`Code expires in ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}.`;
  timer=setTimeout(tick,1000);
  if(!busy && Date.now()>=nextPollAt) {
    nextPollAt=Date.now()+pending.interval*1000;
    void request({type:'pollAuthorization'});
  }
}
async function request(message) {
  const current=revision;busy=true;
  if(message.type==='connect'){connect.disabled=true;status.textContent='Requesting a Twitch authorization code…';}
  try {
    const response=await send(message);
    if(current!==revision)return;
    busy=false;display(response);
  }catch(error){if(current===revision)fail(error.message || 'Extension connection lost. Reload setup and retry.');}
  finally{if(current===revision)busy=false;}
}
form.addEventListener('submit',event=>{
  event.preventDefault();if(!form.reportValidity() || busy || pending)return;
  revision++;stopPending();void request({type:'connect',clientId:client.value.trim()});
});
disconnect.addEventListener('click',()=>{
  revision++;stopPending();connect.disabled=true;disconnect.disabled=true;status.textContent='Disconnecting…';
  void request({type:'disconnect'}).finally(()=>{disconnect.disabled=false;});
});
void request({type:'status'});
