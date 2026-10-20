// Twitch markup is an external interface; attach only when these structural checks pass.
const nativeLabels = ['Recommended For You', 'Viewers (High to Low)', 'Viewers (Low to High)', 'Recently Started'];
export function categoryRoute(href) {
  try {
    const url = new URL(href);
    if(url.origin !== 'https://www.twitch.tv') return null;
    const match = url.pathname.match(/^\/directory\/category\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch { return null; }
}
export function categoryMatchesRoute(name, slug) {
  const normalize=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/['’]/g,'').replace(/[^\p{L}\p{N} -]/gu,'').trim().replace(/\s+/g,'-');
  return Boolean(name && slug && normalize(name)===normalize(slug));
}
export function urlFilters(href) {
  const params = new URL(href).searchParams;
  return { languages: [...params.getAll('lang'), ...params.getAll('language')], tags: params.getAll('tl'),
    unsupported: [...params.keys()].some(key => !['sort','lang','language','tl','following'].includes(key)) };
}
const codes = 'ar as az be bg bn bs ca cs cy da de el en es et eu fa fi fo fr ga gl gu he hi hr hu hy id is it ja ka kk km kn ko ku ky la lb lo lt lv mk ml mn mr ms mt my ne nl nn no or pa pl ps pt ro ru sa si sk sl so sq sr su sv sw ta te th tl tr uk ur uz vi zh zu'.split(' ');
export function languageCode(label, locale='en') {
  const aliases={'Bahasa Indonesia':'id','Norsk':'no','بهاس ملايو':'ms','मानक हिन्दी':'hi','ภาษาไทย':'th','American Sign Language':'ase','Tagalog':'tl'};
  if(aliases[label])return aliases[label];
  if (/^(other|autre|otros)$/i.test(label)) return 'other';
  const normalize = text => text.trim().toLocaleLowerCase(locale);
  for (const language of codes) {
    for(const displayLocale of [locale,'en',language]) {
      try { if(normalize(new Intl.DisplayNames([displayLocale], {type:'language'}).of(language)) === normalize(label)) return language; } catch { /* Unknown browser locale. */ }
    }
  }
  return codes.includes(label.toLowerCase()) ? label.toLowerCase() : null;
}
const visible = element => element && !element.closest('[hidden], [aria-hidden="true"], .tf-native-hidden');
const cleanText = element => element?.textContent?.trim() || '';
export function sortControl(doc=document) {
  const direct = doc.querySelector('#browse-sort-drop-down, [data-a-target="browse-sort-menu"], [data-a-target="directory-sort-dropdown"]');
  if(direct) { const button = direct.matches('button') ? direct : direct.querySelector('button'); if(button && !button.closest('[hidden]')) return button; }
  return [...doc.querySelectorAll('main button, [role="main"] button')].find(button => visible(button)
    && (button.hasAttribute('aria-expanded') || button.hasAttribute('aria-haspopup'))
    && (nativeLabels.includes(cleanText(button)) || cleanText(button) === 'Following')) || null;
}
export function sortChoices(doc=document) {
  return [...doc.querySelectorAll('[role="menuitem"], [role="menuitemradio"], [role="option"], button')]
    .filter(node => visible(node) && !node.matches('[data-tf-following]') && nativeLabels.includes(cleanText(node))
      && node !== sortControl(doc) && !node.hasAttribute('aria-haspopup') && !node.hasAttribute('aria-expanded'));
}
export function categoryName(doc=document) { return cleanText(doc.querySelector('main h1, [role="main"] h1')); }
export function liveGrid(doc=document) {
  const main = doc.querySelector('main, [role="main"]');
  if(!main) return null;
  const directory=main.querySelector('[data-target=\"directory-container\"]');
  if(directory && !directory.querySelector('h1, input, [role=\"tablist\"]'))return directory;
  const containers = [...main.querySelectorAll('[data-target="directory-page__card-container"]')];
  if(containers.length) {
    const parent = containers[0].parentElement;
    if(containers.every(node=>node.parentElement===parent) && !parent.querySelector('h1, input, [role="tablist"]')) return parent;
  }
  const cards = [...main.querySelectorAll('article')].filter(card=>card.querySelector('[data-a-target="preview-card-image-link"]'));
  if(!cards.length) return null;
  let parent = cards[0].parentElement;
  for(let depth=0;parent && parent!==main && depth<5;depth++,parent=parent.parentElement) {
    if(parent.querySelector('h1, input, [role="tablist"]')) break;
    if(cards.every(card=>parent.contains(card))) return parent;
  }
  return null;
}
export function readFilters(doc=document, href=location.href, rememberedLanguages=null) {
  const filters = urlFilters(href);
  const locale=doc.documentElement.lang || 'en';
  const languageButton=[...doc.querySelectorAll('main button, [role="main"] button')].find(button=>/^Language(?:\b|\d)/i.test(cleanText(button)));
  const languageScope=doc.querySelector('[data-a-target="language-filter-menu"], [aria-label="Languages"]') || [...doc.querySelectorAll('[role="dialog"]')].find(dialog=>{const checks=[...dialog.querySelectorAll('input[type="checkbox"]')];return checks.length>5 && checks.some(input=>cleanText(input.labels?.[0])==='English');});
  let persisted=null;
  try {
    const raw=doc.defaultView?.localStorage.getItem('languageDirectoryFilters');
    if(raw!==null && raw!==undefined){persisted=JSON.parse(raw);if(!Array.isArray(persisted) || !persisted.every(code=>typeof code==='string' && [...codes,'other','ase'].includes(code)))throw new Error('Invalid languages');}
  }catch{filters.unsupported=true;}
  const checked=languageScope ? [...languageScope.querySelectorAll('[aria-checked="true"], input:checked')] : [];
  if(languageScope) {
    const mapped=checked.map(node=>languageCode(node.getAttribute('aria-label') || cleanText(node.labels?.[0]) || cleanText(node.closest('label')) || cleanText(node),locale));
    if(mapped.some(value=>!value)) filters.unsupported=true;
    filters.languages.push(...mapped.filter(Boolean));
  } else if(persisted) filters.languages.push(...persisted);
  else if(rememberedLanguages) filters.languages.push(...rememberedLanguages);
  else if(languageButton && /\d/.test(cleanText(languageButton)) && !filters.languages.length) filters.unsupported=true;
  // Selected removable tag chips are scoped to the filter toolbar, never category metadata.
  const search=doc.querySelector('main input[placeholder="Search Tags"], [role="main"] input[placeholder="Search Tags"]');
  const toolbar=search?.parentElement?.parentElement;
  if(toolbar) for(const button of toolbar.querySelectorAll('button[aria-label^="Remove "]')) filters.tags.push(button.getAttribute('aria-label').slice(7));
  const main=doc.querySelector('main, [role=\"main\"]');
  const heading=main?.querySelector('h1');
  const grid=main?.querySelector('[data-target=\"directory-container\"]');
  filters.categoryTags=heading ? [...main.querySelectorAll('a[href^=\"/directory/tags/\"]')].filter(link=>!link.closest('article') && !grid?.contains(link)).map(cleanText) : [];
  if(filters.tags.length && !categoryMatchesRoute(cleanText(heading),categoryRoute(href))) filters.unsupported=true;
  filters.languageMenuOpen=Boolean(languageScope);
  filters.languages=[...new Set(filters.languages)]; filters.tags=[...new Set(filters.tags)];
  return filters;
}
export function makeCard(stream, avatar, doc=document) {
  const article=doc.createElement('article'); article.className='tf-card';
  const link=doc.createElement('a'); link.href='https://www.twitch.tv/'+encodeURIComponent(stream.user_login); link.className='tf-preview';
  link.setAttribute('aria-label',`${stream.user_name}: ${stream.title}`);
  const thumbnail=doc.createElement('img'); thumbnail.alt=''; thumbnail.loading='lazy'; thumbnail.width=640; thumbnail.height=360;
  thumbnail.src=stream.thumbnail_url.replace('{width}','640').replace('{height}','360'); link.append(thumbnail);
  for(const [name,text] of [['tf-live','LIVE'],['tf-viewers',new Intl.NumberFormat(doc.documentElement.lang || 'en').format(stream.viewer_count)+' viewers']]) {
    const overlay=doc.createElement('span');overlay.className=name;overlay.textContent=text;link.append(overlay);
  }
  article.append(link);
  const details=doc.createElement('div');details.className='tf-details';
  const profile=doc.createElement('a');profile.href=link.href;profile.className='tf-avatar';profile.setAttribute('aria-label',stream.user_name);
  if(avatar) { const img=doc.createElement('img');img.src=avatar;img.alt='';img.width=40;img.height=40;profile.append(img); }
  else profile.textContent=stream.user_name.slice(0,1);
  const copy=doc.createElement('div');copy.className='tf-copy';
  const title=doc.createElement('a');title.href=link.href;title.className='tf-title';title.textContent=stream.title;title.title=stream.title;
  const name=doc.createElement('a');name.href=link.href;name.className='tf-name';name.textContent=stream.user_name;
  const tags=doc.createElement('div');tags.className='tf-tags';
  for(const text of stream.tags) { const tag=doc.createElement('span');tag.textContent=text;tags.append(tag); }
  copy.append(title,name,tags);details.append(profile,copy);article.append(details);return article;
}
