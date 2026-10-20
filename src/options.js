const form=document.querySelector('#connect-form');
const client=document.querySelector('#client-id');
const redirect=document.querySelector('#redirect');
const status=document.querySelector('#status');
const connect=document.querySelector('#connect');
const disconnect=document.querySelector('#disconnect');
async function refresh() {
  const response=await chrome.runtime.sendMessage({type:'status'});
  if(!response?.ok)throw new Error('Unable to read setup. Reload the extension and retry.');
  client.value=response.clientId;redirect.value=response.redirectUrl;
  disconnect.hidden=!response.account;connect.textContent=response.account?'Reconnect Twitch':'Connect Twitch';
  status.textContent=response.account?`Connected as ${response.account}.`:'Not connected. Register the callback, then connect.';
}
async function run(message) {
  connect.disabled=disconnect.disabled=true;
  status.textContent=message.type==='connect'?'Waiting for Twitch authorization…':'Disconnecting…';
  try {
    const response=await chrome.runtime.sendMessage(message);
    if(!response?.ok)throw new Error(response?.error || 'Connection failed. Please retry.');
    await refresh();
  }catch(error){status.textContent=error.message;}
  finally{connect.disabled=disconnect.disabled=false;}
}
form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())void run({type:'connect',clientId:client.value.trim()});});
disconnect.addEventListener('click',()=>run({type:'disconnect'}));
refresh().catch(error=>{status.textContent=error.message;});
