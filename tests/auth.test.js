import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCallback, validateIdentity, allowedMessage } from '../src/auth.js';
test('OAuth callback checks exact URL, state, token type and token', () => {
  const base='https://abc.chromiumapp.org/';
  assert.equal(parseCallback(base+'#state=nonce&access_token=secret&token_type=bearer',base,'nonce'),'secret');
  for(const url of [base+'#state=wrong&access_token=secret&token_type=bearer', 'https://evil.example/#state=nonce&access_token=secret&token_type=bearer',base+'#error=access_denied',base+'#state=nonce&access_token=secret&token_type=other']) assert.throws(()=>parseCallback(url,base,'nonce'));
});
test('identity requires right client, user, scope and positive expiry',()=>{
  const data={client_id:'client',user_id:'123',login:'kevin',scopes:['user:read:follows'],expires_in:300};
  assert.equal(validateIdentity(data,'client').userId,'123');
  for(const patch of [{client_id:'wrong'},{scopes:[]},{expires_in:0},{user_id:''}]) assert.throws(()=>validateIdentity({...data,...patch},'client'));
  assert.throws(()=>validateIdentity(data,'client','999'));
});
test('only extension setup can manage auth; content can request snapshots',()=>{
  const id='abc'; const page={id,url:'chrome-extension://abc/options.html'}; const tab={id,url:'https://www.twitch.tv/directory/category/fortnite',tab:{id:1}};
  assert.equal(allowedMessage({type:'connect',clientId:'client123'},page,id),true);
  assert.equal(allowedMessage({type:'connect',clientId:'client123'},tab,id),false);
  assert.equal(allowedMessage({type:'snapshot',category:'Fortnite'},tab,id),true);
  assert.equal(allowedMessage({type:'snapshot',category:'x',token:'secret'},tab,id),false);
  assert.equal(allowedMessage({type:'snapshot',category:'x'},{...tab,id:'other'},id),false);
});
