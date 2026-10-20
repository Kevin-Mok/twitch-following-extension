import test from 'node:test';
import assert from 'node:assert/strict';
import { collectFollowed, selectStreams, loadAvatars } from '../src/core.js';

const stream = (id, overrides = {}) => ({
  user_id: id, user_login: `channel${id}`, user_name: `Channel ${id}`,
  game_id: '10', viewer_count: 94, title: 'Playing',
  thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_channel1-{width}x{height}.jpg',
  language: 'en', tags: ['English'], ...overrides,
});

test('collects all cursor pages and deduplicates broadcasters', async () => {
  const cursors = [];
  const result = await collectFollowed(async cursor => {
    cursors.push(cursor);
    return cursor ? { data: [stream('1'), stream('2')], pagination: {} }
      : { data: [stream('1')], pagination: { cursor: 'next' } };
  });
  assert.deepEqual(cursors, [undefined, 'next']);
  assert.deepEqual(result.map(s => s.user_id), ['1', '2']);
});

test('numeric descending viewers, login ties, and exact category', () => {
  const result = selectStreams([
    stream('1'), stream('2', { viewer_count: 7500, user_login: 'zed' }),
    stream('3', { viewer_count: 689 }), stream('4', { viewer_count: 7500, user_login: 'amy' }),
    stream('5', { viewer_count: 9000, game_id: '20' }),
  ], { gameId: '10' });
  assert.deepEqual(result.map(s => s.user_id), ['4', '2', '3', '1']);
});

test('language OR and case-insensitive tag AND filters', () => {
  const streams = [stream('1', { language: 'en', tags: ['English', 'Competitive'] }),
    stream('2', { language: 'fr', tags: ['French', 'Competitive'] }),
    stream('3', { language: 'de', tags: ['English', 'Competitive'] }),
    stream('4', { language: 'en', tags: ['English'] })];
  assert.deepEqual(selectStreams(streams, { gameId: '10', languages: ['en', 'fr'], tags: ['english', 'COMPETITIVE'] }).map(s => s.user_id), ['1']);
});

test('empty page and filter results are valid', async () => {
  assert.deepEqual(await collectFollowed(async () => ({ data: [], pagination: {} })), []);
  assert.deepEqual(selectStreams([stream('1')], { gameId: '20' }), []);
});

test('page failure rejects the whole snapshot', async () => {
  await assert.rejects(collectFollowed(async cursor => {
    if (cursor) throw new Error('rate limited');
    return { data: [stream('1')], pagination: { cursor: 'next' } };
  }), /rate limited/);
});

test('repeated cursor rejects rather than looping', async () => {
  await assert.rejects(collectFollowed(async () => ({ data: [], pagination: { cursor: 'same' } })), /cursor/i);
});

test('malformed pages reject', async () => {
  for (const page of [null, {}, { data: [], pagination: null }, { data: {}, pagination: {} },
    { data: [], pagination: { cursor: 1 } }]) {
    await assert.rejects(collectFollowed(async () => page), /invalid/i);
  }
});

test('malformed stream values reject', async () => {
  for (const overrides of [{ user_id: '' }, { user_login: null }, { user_name: 2 },
    { game_id: null }, { viewer_count: '7500' }, { viewer_count: -1 }, { title: null },
    { thumbnail_url: 'javascript:alert(1)' }, { language: null }, { tags: [1] }]) {
    await assert.rejects(collectFollowed(async () => ({ data: [stream('1', overrides)], pagination: {} })), /invalid/i);
  }
});

test('avatar lookup batches unique IDs at 100', async () => {
  const calls = [];
  const ids = Array.from({ length: 201 }, (_, i) => String(i + 1));
  const result = await loadAvatars([...ids, '1'], async batch => {
    calls.push(batch);
    return { data: batch.map(id => ({ id, profile_image_url: `https://static-cdn.jtvnw.net/${id}.png` })) };
  });
  assert.deepEqual(calls.map(batch => batch.length), [100, 100, 1]);
  assert.equal(Object.keys(result).length, 201);
  assert.equal(result['1'], 'https://static-cdn.jtvnw.net/1.png');
});

test('empty avatar lookup makes no request', async () => {
  assert.deepEqual(await loadAvatars([], () => assert.fail('unexpected request')), {});
});

test('avatar lookup rejects unsafe URLs, foreign IDs, malformed response and request errors', async () => {
  for (const response of [{}, { data: [{ id: '1', profile_image_url: 'http://static-cdn.jtvnw.net/a.png' }] },
    { data: [{ id: '1', profile_image_url: 'https://evil.test/a.png' }] },
    { data: [{ id: '2', profile_image_url: 'https://static-cdn.jtvnw.net/a.png' }] }]) {
    await assert.rejects(loadAvatars(['1'], async () => response), /invalid/i);
  }
  await assert.rejects(loadAvatars(['1'], async () => { throw new Error('offline'); }), /offline/);
});

test('category tags match all streams in that category, combined with stream tags',()=>{
 const rows=[{user_id:'9',user_login:'nine',user_name:'Nine',game_id:'10',title:'Live',viewer_count:94,thumbnail_url:'https://static-cdn.jtvnw.net/x.jpg',language:'en',tags:['English']}];
 assert.equal(selectStreams(rows,{gameId:'10',tags:['Shooter','English'],categoryTags:['Shooter']}).length,1);
 assert.equal(selectStreams(rows,{gameId:'10',tags:['Shooter','French'],categoryTags:['Shooter']}).length,0);
});
