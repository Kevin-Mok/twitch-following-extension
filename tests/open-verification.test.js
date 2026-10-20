import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const script=new URL('../scripts/open-verification.sh',import.meta.url).pathname;
test('verification launcher opens only its documented destinations',()=>{
 for(const [step,url] of [['install','chrome://extensions/'],['fortnite','https://www.twitch.tv/directory/category/fortnite?sort=RELEVANCE'],['navigation','https://www.twitch.tv/directory/category/just-chatting?sort=RELEVANCE']]) {
  const output=execFileSync('bash',[script,step],{env:{...process.env,TWITCH_VERIFY_BROWSER:'/bin/echo',CLI_PLAIN:'1'},encoding:'utf8'});
  assert.ok(output.includes(url));
 }
 assert.throws(()=>execFileSync('bash',[script,'unknown'],{stdio:'pipe'}));
});
