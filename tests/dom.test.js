import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryRoute, urlFilters, languageCode } from '../src/dom.js';
test('category routes reject clips/videos and malformed slugs',()=>{
 assert.equal(categoryRoute('https://www.twitch.tv/directory/category/fortnite?sort=RELEVANCE'),'fortnite');
 for(const path of ['/directory/category/fortnite/clips','/directory/category/fortnite/videos','/somechannel']) assert.equal(categoryRoute('https://www.twitch.tv'+path),null);
 assert.equal(categoryRoute('https://www.twitch.tv/directory/category/a%20b'),'a b');
});
test('URL filters support languages and tags, fail closed unknown filters',()=>{
 assert.deepEqual(urlFilters('https://www.twitch.tv/directory/category/a?sort=RELEVANCE&lang=en&lang=fr&tl=English&tl=Ranked'),{languages:['en','fr'],tags:['English','Ranked'],unsupported:false});
 assert.equal(urlFilters('https://www.twitch.tv/directory/category/a?content=restricted').unsupported,true);
});
test('language names map to API codes',()=>{
 assert.equal(languageCode('English','en'),'en');
 assert.equal(languageCode('Français','fr'),'fr');
 assert.equal(languageCode('Other','en'),'other');
 assert.equal(languageCode('invented','en'),null);
});

test('category heading must agree with route before retrieval',async()=>{
 const { categoryMatchesRoute }=await import('../src/dom.js');
 assert.equal(categoryMatchesRoute('Fortnite','fortnite'),true);
 assert.equal(categoryMatchesRoute('Fortnite','just-chatting'),false);
 assert.equal(categoryMatchesRoute("Tom Clancy's Rainbow Six Siege",'tom-clancys-rainbow-six-siege'),true);
});
test('category verification handles accents in names and ASCII slugs',async()=>{
 const {categoryMatchesRoute}=await import('../src/dom.js');
 assert.equal(categoryMatchesRoute('Pokémon Community Game','pokemon-community-game'),true);
});
