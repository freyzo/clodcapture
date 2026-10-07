(function(){'use strict';
/* Portable Chat Keys - UI layer for tagging, multi-select, key-based continue */

var TAG_COLORS=['#D97757','#9B78F8','#22c55e','#3bc9db','#ffd43b','#ff8787','#69db7c','#da77f2'];
function tagColor(tag){var h=0;for(var i=0;i<tag.length;i++)h=((h<<5)-h)+tag.charCodeAt(i);return TAG_COLORS[Math.abs(h)%TAG_COLORS.length];}

/* expose for fab.js */
window.__ccKeys={
  renderTags:renderTags,
  renderProjects:renderProjects,
  getKey:getKey,
  generateKey:generateKey,
  multiSelect:null, /* will hold {ids:Set, active:bool} */
  initMultiSelect:initMultiSelect,
  getSelected:function(){return window.__ccKeys.multiSelect?Array.from(window.__ccKeys.multiSelect.ids):[];},
  continueWithKeys:continueWithKeys
};

function renderTags(tags,container,chatId){
  tags=tags||[];
  if(!tags.length&&!chatId)return;
  var wrap=document.createElement('div');wrap.className='cc-tags';
  tags.slice(0,3).forEach(function(tag){
    var pill=document.createElement('span');pill.className='cc-tag';
    pill.style.borderColor=tagColor(tag);pill.style.color=tagColor(tag);
    pill.title='Filter: #'+tag;
    var label=document.createElement('span');label.textContent=tag;pill.appendChild(label);
    if(chatId){var x=document.createElement('span');x.className='cc-tag-x';x.textContent='\u00d7';x.title='Remove tag';
      x.onclick=function(e){e.stopPropagation();editTags(chatId,{remove:[tag]}).then(function(ok){
        if(ok&&window.__ccToast)window.__ccToast('Removed #'+tag,{label:'Undo',run:function(){editTags(chatId,{add:[tag]});}});});};pill.appendChild(x);}
    pill.onclick=function(e){e.stopPropagation();
      var search=document.getElementById('cc-fab-search');
      if(search){search.value='#'+tag;search.dispatchEvent(new Event('input'));}};
    wrap.appendChild(pill);
  });
  if(tags.length>3){var more=document.createElement('span');more.className='cc-tag cc-tag-more';more.textContent='+'+(tags.length-3);more.title=tags.slice(3).join(', ');wrap.appendChild(more);}
  if(chatId){
    var add=document.createElement('span');add.className='cc-tag cc-tag-add';add.textContent='+';add.title='Add tags (comma-separated)';
    add.onclick=function(e){e.stopPropagation();
      var input=document.createElement('input');input.className='cc-tag-input';input.placeholder='tag, tag';
      var done=false;
      var commit=function(){if(done)return;done=true;var v=input.value.split(',').map(function(s){return s.trim();}).filter(Boolean);if(v.length)editTags(chatId,{add:v});else input.replaceWith(add);};
      input.onkeydown=function(ev){ev.stopPropagation();if(ev.key==='Enter')commit();else if(ev.key==='Escape'){done=true;input.replaceWith(add);}};
      input.onblur=commit;
      input.onmousedown=function(ev){ev.stopPropagation();};input.onclick=function(ev){ev.stopPropagation();};
      add.replaceWith(input);input.focus();};
    wrap.appendChild(add);
  }
  container.appendChild(wrap);
}

async function editTags(chatId,change){
  var r=await new Promise(function(res){chrome.runtime.sendMessage(Object.assign({type:'set_tags',chatId:chatId},change),res);});
  if(!r||!r.ok){if(window.__ccToast)window.__ccToast('Tag edit failed');return false;}
  if(window.__ccRefreshList)window.__ccRefreshList();
  return true;
}

/* projects: chats sharing >= PROJECT_MIN_SHARED tags, or linked by continue lineage */
var PROJECT_MIN_SHARED=2;
function computeProjects(rows){
  var meta={},parent={};var ids=rows.map(function(e){meta[e[0]]=e[1];parent[e[0]]=e[0];return e[0];});
  function find(x){while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;}
  function union(a,b){if(!(a in parent)||!(b in parent))return;var ra=find(a),rb=find(b);if(ra!==rb)parent[ra]=rb;}
  ids.forEach(function(id,i){
    (meta[id].parents||[]).forEach(function(p){union(id,p);});
    var ti=meta[id].tags||[];if(ti.length<PROJECT_MIN_SHARED)return;
    for(var j=i+1;j<ids.length;j++){var tj=meta[ids[j]].tags||[];if(ti.filter(function(t){return tj.indexOf(t)!==-1;}).length>=PROJECT_MIN_SHARED)union(id,ids[j]);}
  });
  var groups={};ids.forEach(function(id){var r=find(id);(groups[r]=groups[r]||[]).push(id);});
  return Object.keys(groups).map(function(r){return groups[r];}).filter(function(g){return g.length>=2;}).map(function(g){
    var counts={};g.forEach(function(id){(meta[id].tags||[]).forEach(function(t){counts[t]=(counts[t]||0)+1;});});
    var top=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];})[0];
    return{name:top&&counts[top]>=2?'#'+top:(meta[g[g.length-1]].name||'Untitled'),ids:g};
  });
}

function renderProjects(container,rows){
  if(!container)return;
  var projects=computeProjects(rows);
  if(!projects.length){container.remove();return;}
  container.className='cc-projects';
  projects.slice(0,4).forEach(function(p){
    var chip=document.createElement('span');chip.className='cc-project';
    chip.textContent='\u25C6 '+p.name+' ('+p.ids.length+')';
    chip.title='Select the '+Math.min(p.ids.length,5)+' most recent chats in this project, then Go with keys';
    chip.onclick=function(e){e.stopPropagation();
      if(!window.__ccKeys.multiSelect)initMultiSelect();
      var ms=window.__ccKeys.multiSelect;ms.ids=new Set(p.ids.slice(0,5));ms.active=true;updateSelectUI();};
    container.appendChild(chip);
  });
}

async function getKey(chatId){
  return new Promise(function(res){chrome.runtime.sendMessage({type:'get_key',chatId:chatId},res);});
}

async function generateKey(chatId){
  return new Promise(function(res){chrome.runtime.sendMessage({type:'generate_key',chatId:chatId},res);});
}

/* multi-select state */
function initMultiSelect(){
  window.__ccKeys.multiSelect={ids:new Set(),active:false};
}

function toggleSelect(chatId){
  var ms=window.__ccKeys.multiSelect;if(!ms)return;
  if(ms.ids.has(chatId))ms.ids.delete(chatId);else{if(ms.ids.size>=5)return;ms.ids.add(chatId);}
  ms.active=ms.ids.size>0;
  updateSelectUI();
}

function updateSelectUI(){
  var ms=window.__ccKeys.multiSelect;if(!ms)return;
  document.querySelectorAll('.cc-item').forEach(function(el){
    var id=el.dataset.id;
    if(ms.ids.has(id)){el.classList.add('cc-selected');}else{el.classList.remove('cc-selected');}
  });
  var bar=document.getElementById('cc-multibar');
  if(ms.active){
    if(!bar){
      bar=document.createElement('div');bar.id='cc-multibar';bar.className='cc-multibar';
      bar.innerHTML='<span class="cc-multi-count" id="cc-multi-count"></span><button class="cc-multi-go" id="cc-multi-go">Go with keys</button><button class="cc-multi-clear" id="cc-multi-clear">Clear</button>';
      var panel=document.getElementById('cc-fab-panel');
      if(panel)panel.appendChild(bar);
      document.getElementById('cc-multi-go').onclick=function(){continueWithKeys();};
      document.getElementById('cc-multi-clear').onclick=function(){ms.ids.clear();ms.active=false;updateSelectUI();};
    }
    bar.style.display='flex';
    document.getElementById('cc-multi-count').textContent=ms.ids.size+' selected';
    document.getElementById('cc-multi-go').textContent='Go with '+ms.ids.size+' key'+(ms.ids.size>1?'s':'');
  }else{
    if(bar)bar.style.display='none';
  }
}

async function continueWithKeys(){
  var ids=window.__ccKeys.getSelected();if(!ids.length)return;
  var btn=document.getElementById('cc-multi-go');if(btn){btn.disabled=true;btn.textContent='...';}
  try{
    var r=await new Promise(function(res){chrome.runtime.sendMessage({type:'continue_with_key',chatIds:ids},res);});
    if(!r||!r.ok)throw new Error(r?r.error:'failed');
    var how=await window.__ccContinue(r.text);
    if(how==='injected'&&window.__ccToast)window.__ccToast('Loaded '+r.key_count+' key'+(r.key_count>1?'s':'')+' into composer');
    /* reset */
    var ms=window.__ccKeys.multiSelect;if(ms){ms.ids.clear();ms.active=false;}
    updateSelectUI();
    if(btn)btn.disabled=false;
    if(window.__ccClosePanel)window.__ccClosePanel();
  }catch(e){
    if(window.__ccToast)window.__ccToast('Error: '+e.message.slice(0,30));
    if(btn){btn.textContent='Go with keys';btn.disabled=false;}
  }
}

/* hook into fab.js item rendering - add long-press for multi-select + tags */
window.__ccRenderItemHook=function(itemEl,chatId,meta){
  var info=itemEl.querySelector('.cc-item-info');
  if(info)renderTags(meta&&meta.tags,info,chatId);
  /* long-press for multi-select */
  var timer=null;
  itemEl.addEventListener('mousedown',function(e){
    timer=setTimeout(function(){
      if(!window.__ccKeys.multiSelect)initMultiSelect();
      toggleSelect(chatId);
    },500);
  });
  itemEl.addEventListener('mouseup',function(){clearTimeout(timer);});
  itemEl.addEventListener('mouseleave',function(){clearTimeout(timer);});
};

})();
