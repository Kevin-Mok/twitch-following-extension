(async () => {
  const {categoryRoute, categoryMatchesRoute, categoryName, sortControl, sortChoices, liveGrid, readFilters, makeCard} = await import(chrome.runtime.getURL('src/dom.js'));
  const {selectStreams} = await import(chrome.runtime.getURL('src/core.js'));
  let selected=false, route=null, request=0, snapshot=null, panel=null, grid=null, filterKey='', pending=false;
  let waitingCategory=false, rememberedLanguages=null, observedHref=location.href, nativeSort=null;
  const currentSort=()=>new URL(location.href).searchParams.get('sort') || 'RELEVANCE';
  const nativeSelections=new Map(), nativeTabindices=new Map(), markedMenus=new Set();
  function restoreSelections() {for(const [node,value] of nativeSelections){if(value===null)node.removeAttribute('aria-selected');else node.setAttribute('aria-selected',value);}nativeSelections.clear();for(const [node,value] of nativeTabindices){if(value===null)node.removeAttribute('tabindex');else node.setAttribute('tabindex',value);}nativeTabindices.clear();for(const menu of markedMenus)delete menu.dataset.tfMode;markedMenus.clear();}
  function liveTab() {
    const tab=document.querySelector('[role=\"tab\"][aria-selected=\"true\"]');
    return categoryRoute(location.href) && (!tab || tab.matches('[data-a-target=\"game-directory-live-tab\"]') || (!tab.hasAttribute('data-a-target') && !/^(Videos|Clips)$/i.test(tab.textContent.trim())));
  }
  function filters() {
    const result=readFilters(document,location.href,rememberedLanguages);
    if(result.languageMenuOpen && !result.unsupported) rememberedLanguages=result.languages;
    return result;
  }
  let trigger=null, originalLabel=null, labelNode=null, scheduled=false;
  const send=message=>chrome.runtime.sendMessage(message);
  function restoreGrid() { grid?.classList.remove('tf-native-hidden');grid=null;panel?.remove();panel=null; }
  function restoreLabel() {
    if(labelNode?.isConnected && labelNode.nodeValue==='Following') labelNode.nodeValue=originalLabel;
    trigger?.removeAttribute('data-tf-selected');labelNode=null;originalLabel=null;trigger=null;
  }
  function stop() {selected=false;request++;pending=false;snapshot=null;filterKey='';restoreGrid();restoreLabel();restoreSelections();}
  function updateLabel() {
    const button=sortControl(); if(!button) return;
    if(trigger!==button) {restoreLabel();trigger=button;}
    if(!labelNode?.isConnected || labelNode.nodeValue!=='Following') {
      const walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT); let node;
      while((node=walker.nextNode())) if(['Recommended For You','Viewers (High to Low)','Viewers (Low to High)','Recently Started'].includes(node.nodeValue.trim())) {labelNode=node;originalLabel=node.nodeValue;node.nodeValue='Following';break;}
    }
    button.setAttribute('data-tf-selected','true');
  }
  function state(message, retry=false) {
    if(!panel) return;
    const box=document.createElement('div');box.className='tf-state';box.setAttribute('role','status');
    const text=document.createElement('p');text.textContent=message;box.append(text);
    if(retry){const button=document.createElement('button');button.textContent='Retry';button.onclick=()=>fetchSnapshot();box.append(button);}
    const setup=document.createElement('button');setup.textContent='Twitch connection';setup.onclick=()=>send({type:'openOptions'});box.append(setup);
    panel.replaceChildren(box);
  }
  function compatibility(message) {
    restoreGrid();
    const main=document.querySelector('main, [role=\"main\"]');
    if(main){panel=document.createElement('section');panel.className='tf-panel';panel.dataset.tfOwned='';main.prepend(panel);state(message);}
  }
  function attach() {
    const found=liveGrid();
    if(!found) {compatibility('Following cannot safely find Twitch’s Live Channels grid. Twitch remains usable. Choose a native sort or reload after a Twitch update.');return false;}
    if(grid!==found || !panel?.isConnected){restoreGrid();grid=found;panel=document.createElement('section');panel.className='tf-panel';panel.dataset.tfOwned='';panel.setAttribute('aria-label','Live followed channels');grid.before(panel);grid.classList.add('tf-native-hidden');}
    return true;
  }
  function render() {
    if(!snapshot || !selected || !attach())return;
    const currentFilters=filters();filterKey=JSON.stringify(currentFilters);
    if(currentFilters.unsupported){state('This filter cannot be read safely. Clear unsupported filters or language selections to show Following; Twitch’s native sorts remain available.');return;}
    try {
      const streams=selectStreams(snapshot.streams,{gameId:snapshot.gameId,...currentFilters});
      if(!streams.length){state('No live followed channels match this category and its filters.');return;}
      const list=document.createElement('div');list.className='tf-grid';
      for(const stream of streams)list.append(makeCard(stream,snapshot.avatars[stream.user_id]));
      panel.replaceChildren(list);
    }catch{state('Following received invalid stream data. Retry the complete snapshot.',true);}
  }
  async function fetchSnapshot() {
    const current=++request;const slug=categoryRoute(location.href);snapshot=null;pending=true;waitingCategory=false;
    const category=categoryName();
    if(!categoryMatchesRoute(category,slug)){pending=false;waitingCategory=true;compatibility('Following cannot yet verify this category. Twitch’s native feed remains available. If this persists, choose a native sort and report the category URL.');return;}
    if(!attach()){pending=false;return;}state('Loading all live followed channels…');
    if(!category){pending=false;state('Cannot verify the current category. Choose a native sort and reload.');return;}
    try {
      const result=await send({type:'snapshot',category});
      if(current!==request || slug!==categoryRoute(location.href) || !selected)return;
      pending=false;
      if(!result?.ok){state(result?.error || 'Following is unavailable. Connect Twitch or retry.',true);return;}
      snapshot=result;render();
    }catch{if(current===request){pending=false;state('Extension connection lost. Reload Twitch and reconnect.',true);}}
  }
  function choose(event) {
    event.preventDefault();event.stopPropagation();
    if(!liveTab())return;
    selected=true;route=categoryRoute(location.href);nativeSort=currentSort();updateLabel();
    sortControl()?.click();sortControl()?.focus();fetchSnapshot();
  }
  function integrateMenu() {
    const choices=sortChoices(); if(choices.length<2)return;
    let item=document.querySelector('[data-tf-following]');
    const listbox=choices[0].closest('[role="listbox"]');
    if(!item){
      item=document.createElement(listbox?'li':'button');if(!listbox)item.type='button';item.dataset.tfFollowing='';item.className=choices.find(node=>node.getAttribute('aria-selected')!=='true')?.className || choices[0].className;
      item.setAttribute('role',listbox?'option':'menuitemradio');item.tabIndex=0;item.textContent='Following';item.addEventListener('click',choose);choices[0].parentElement.append(item);
    }
    const attr=listbox?'aria-selected':'aria-checked';const value=String(selected);if(item.getAttribute(attr)!==value)item.setAttribute(attr,value);
    if(selected && listbox){listbox.dataset.tfMode='following';markedMenus.add(listbox);}
    if(selected && listbox)for(const choice of choices){if(!nativeSelections.has(choice))nativeSelections.set(choice,choice.getAttribute('aria-selected'));if(choice.getAttribute('aria-selected')!=='false')choice.setAttribute('aria-selected','false');}
  }

  function sync() {
    scheduled=false;observedHref=location.href;
    const next=categoryRoute(location.href);
    if(!next || !liveTab()){if(selected || panel)stop();document.querySelector('[data-tf-following]')?.remove();rememberedLanguages=null;return;}
    if(selected && route===next && nativeSort!==currentSort())stop();
    if(selected && route!==next){request++;snapshot=null;pending=false;restoreGrid();route=next;nativeSort=currentSort();fetchSnapshot();}
    if(selected && waitingCategory && categoryMatchesRoute(categoryName(),next))fetchSnapshot();
    filters();
    integrateMenu();
    if(selected){
      updateLabel();
      if(grid && (!grid.isConnected || !panel?.isConnected)){restoreGrid();if(snapshot)render();else if(!pending)fetchSnapshot();}
      if(snapshot && JSON.stringify(filters())!==filterKey)render();
    }
  }
  const schedule=()=>{if(!scheduled){scheduled=true;setTimeout(sync,80);}};
  document.addEventListener('click',event=>{
    const target=event.target instanceof Element ? event.target.closest('button, [role="menuitem"], [role="menuitemradio"], [role="option"]') : null;
    if(selected && target && !target.closest('[data-tf-following]') && sortChoices().includes(target))stop();
    if(event.target instanceof Element && event.target.closest('a[href*="/videos"], a[href*="/clips"]'))stop();
    schedule();
  },true);
  document.addEventListener('keydown',event=>{
    const choices=sortChoices();const own=document.querySelector('[data-tf-following]');if(!own)return;
    const all=[...choices,own];const index=all.indexOf(document.activeElement);const control=sortControl();
    if(index<0 && document.activeElement!==control)return;
    if(['Enter',' '].includes(event.key) && index>=0){event.preventDefault();event.stopPropagation();all[index].click();return;}
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();control?.click();control?.focus();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    const next=event.key==='Home'?0:event.key==='End'?all.length-1:index<0?(event.key==='ArrowDown'?0:all.length-1):(index+(event.key==='ArrowDown'?1:-1)+all.length)%all.length;
    if(!all[next].hasAttribute('tabindex')){nativeTabindices.set(all[next],null);all[next].tabIndex=-1;}all[next].focus();
  },true);
  chrome.runtime.onMessage.addListener(message=>{if(message?.type==='accountChanged'){request++;snapshot=null;pending=false;if(selected){attach();state('Twitch account changed. Select Following again to load a fresh snapshot.',true);}}});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-selected','aria-checked','aria-pressed']});
  document.addEventListener('change',schedule,true);
  window.addEventListener('storage',schedule);
  window.addEventListener('popstate',schedule);window.addEventListener('hashchange',schedule);
  setInterval(()=>{if(observedHref!==location.href)schedule();},500);
  sync();
})();
