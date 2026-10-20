const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = value => typeof value === 'string' && /^\d+$/.test(value);
const isText = value => typeof value === 'string';

function isCdnUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'static-cdn.jtvnw.net'
      && !url.username && !url.password && !url.port;
  } catch {
    return false;
  }
}

function validStream(stream) {
  return isObject(stream) && isId(stream.user_id)
    && isText(stream.user_login) && /^[a-zA-Z0-9_]+$/.test(stream.user_login)
    && isText(stream.user_name) && stream.user_name.length > 0
    && isText(stream.game_id) && isText(stream.title)
    && Number.isSafeInteger(stream.viewer_count) && stream.viewer_count >= 0
    && isCdnUrl(stream.thumbnail_url) && isText(stream.language)
    && Array.isArray(stream.tags) && stream.tags.every(isText);
}

export async function collectFollowed(fetchPage) {
  const streams = new Map();
  const cursors = new Set();
  let cursor;
  do {
    const page = await fetchPage(cursor);
    if (!isObject(page) || !Array.isArray(page.data) || !isObject(page.pagination)
      || !page.data.every(validStream)) {
      throw new Error('Invalid followed streams response. Please retry.');
    }
    for (const stream of page.data) {
      if (!streams.has(stream.user_id)) streams.set(stream.user_id, stream);
    }
    cursor = page.pagination.cursor;
    if (cursor !== undefined && (!isText(cursor) || !cursor)) {
      throw new Error('Invalid pagination cursor. Please retry.');
    }
    if (cursor && cursors.has(cursor)) throw new Error('Repeated pagination cursor. Please retry.');
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return [...streams.values()];
}

export function selectStreams(streams, { gameId, languages = [], tags = [], categoryTags = [] }) {
  if (typeof gameId !== 'string' || !gameId || !Array.isArray(languages)
    || !languages.every(isText) || !Array.isArray(tags) || !tags.every(isText)
    || !Array.isArray(categoryTags) || !categoryTags.every(isText)) {
    throw new Error('Invalid category or filters.');
  }
  const requestedTags = tags.map(tag => tag.toLowerCase()).filter(tag=>!categoryTags.some(categoryTag=>categoryTag.toLowerCase()===tag));
  const requestedLanguages = languages.map(language => language.toLowerCase());
  const unique = new Map();
  for (const stream of streams) {
    if (!validStream(stream)) throw new Error('Invalid stream data. Please retry.');
    if (stream.game_id !== gameId
      || (requestedLanguages.length && !requestedLanguages.includes(stream.language.toLowerCase()))
      || !requestedTags.every(tag => stream.tags.some(value => value.toLowerCase() === tag))) continue;
    if (!unique.has(stream.user_id)) unique.set(stream.user_id, stream);
  }
  return [...unique.values()].sort((a, b) => b.viewer_count - a.viewer_count
    || (a.user_login < b.user_login ? -1 : a.user_login > b.user_login ? 1 : 0));
}

export async function loadAvatars(ids, fetchUsers) {
  if (!Array.isArray(ids) || !ids.every(isId)) throw new Error('Invalid broadcaster IDs.');
  const unique = [...new Set(ids)];
  const avatars = {};
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    const response = await fetchUsers(batch);
    if (!isObject(response) || !Array.isArray(response.data)) throw new Error('Invalid users response. Please retry.');
    for (const user of response.data) {
      if (!isObject(user) || !isId(user.id) || !batch.includes(user.id) || !isCdnUrl(user.profile_image_url)) {
        throw new Error('Invalid user avatar response. Please retry.');
      }
      avatars[user.id] = user.profile_image_url;
    }
  }
  return avatars;
}
