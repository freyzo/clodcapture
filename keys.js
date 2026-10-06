(function(){'use strict';
/* Portable Chat Keys - UI layer for tagging, multi-select, key-based continue */

var TAG_COLORS=['#D97757','#9B78F8','#22c55e','#3bc9db','#ffd43b','#ff8787','#69db7c','#da77f2'];
function tagColor(tag){var h=0;for(var i=0;i<tag.length;i++)h=((h<<5)-h)+tag.charCodeAt(i);return TAG_COLORS[Math.abs(h)%TAG_COLORS.length];}

/* expose for fab.js */
window.__ccKeys={
  renderTags:renderTags,
  getKey:getKey,
  generateKey:generateKey,
  multiSelect:null, /* will hold {ids:Set, active:bool} */
  initMultiSelect:initMultiSelect,
  getSelected:function(){return window.__ccKeys.multiSelect?Array.from(window.__ccKeys.multiSelect.ids):[];},
  continueWithKeys:continueWithKeys
};

function renderTags(tags,container){
  if(!tags||!tags.length)return;
  var wrap=document.createElement('div');wrap.className='cc-tags';
  tags.slice(0,3).forEach(function(tag){
    var pill=document.createElement('span');pill.className='cc-tag';
    pill.textContent=tag;pill.style.borderColor=tagColor(tag);pill.style.color=tagColor(tag);
    pill.title='Filter: #'+tag;
    pill.onclick=function(e){e.stopPropagation();
      var search=document.getElementById('cc-fab-search');
      if(search){search.value='#'+tag;search.dispatchEvent(new Event('input'));}};
    wrap.appendChild(pill);
  });
  if(tags.length>3){var more=document.createElement('span');more.className='cc-tag cc-tag-more';more.textContent='+'+(tags.length-3);wrap.appendChild(more);}
  container.appendChild(wrap);
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
var _origRender=window.__ccRenderItemHook;
window.__ccRenderItemHook=function(itemEl,chatId,meta){
  /* load key and render tags */
  getKey(chatId).then(function(r){
    if(r&&r.ok&&r.key&&r.key.tags&&r.key.tags.length){
      var info=itemEl.querySelector('.cc-item-info');
      if(info)renderTags(r.key.tags,info);
    }
  });
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
