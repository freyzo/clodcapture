(function(){'use strict';
/* Timeline Spine - injected as content script alongside fab.js */
/* Requires fab.js to be loaded first (uses window.__ccToast, __ccContinue, __ccClosePanel) */

var _spineData=null,_from=0,_to=0,_chatId=null,_zoom=1;
var ZOOMS=[1,2,4,8],KEEP_HEAD=2,BREAK_MIN_MS=1800000,GROUP_OVER=100;

/* largest pause between consecutive messages, if long enough to count as a break */
function findBreak(msgs){var best=-1,gap=0;for(var i=1;i<msgs.length;i++){if(!msgs[i].ts||!msgs[i-1].ts)continue;var g=new Date(msgs[i].ts)-new Date(msgs[i-1].ts);if(g>gap){gap=g;best=i;}}return gap>=BREAK_MIN_MS?{idx:best,gap:gap}:null;}
function fmtGap(ms){var h=ms/3600000;return h>=24?Math.round(h/24)+'d':h>=1?Math.round(h)+'h':Math.round(ms/60000)+'m';}
function headCount(){return Math.min(KEEP_HEAD,_from);}

window.__ccSpine={
  open:openSpine,
  close:closeSpine,
  isOpen:function(){return!!document.querySelector('.cc-spine-view');}
};

async function openSpine(chatId,panelEl){
  _chatId=chatId;
  var r=await new Promise(function(res){chrome.runtime.sendMessage({type:'get_spine',chatId:chatId},res);});
  if(!r||!r.ok){window.__ccToast&&window.__ccToast('Failed to load spine');return;}
  _spineData=r;_from=0;_to=r.messages.length-1;_zoom=1;
  renderSpine(panelEl);
}

function closeSpine(){
  var el=document.querySelector('.cc-spine-view');
  if(el)el.remove();
  _spineData=null;_chatId=null;
}

function renderSpine(panelEl){
  var existing=panelEl.querySelector('.cc-spine-view');
  if(existing)existing.remove();

  var d=_spineData;var msgs=d.messages;
  var view=document.createElement('div');view.className='cc-spine-view';

  /* header */
  var header='<div class="cc-spine-header">'
    +'<button class="cc-spine-back" id="cc-spine-back"><svg viewBox="0 0 14 14"><polyline points="9,2 4,7 9,12"/></svg></button>'
    +'<span class="cc-spine-title" title="'+esc(d.title)+'">'+esc(d.title)+'</span></div>';

  /* chips */
  var brk=findBreak(msgs);
  var chips='<div class="cc-spine-chips">'
    +'<span class="cc-spine-chip" data-range="last10">Last 10</span>'
    +'<span class="cc-spine-chip" data-range="last25">Last 25</span>'
    +'<span class="cc-spine-chip" data-range="half">2nd half</span>'
    +(brk?'<span class="cc-spine-chip" data-range="break" title="Start after the longest pause ('+fmtGap(brk.gap)+')">Since break</span>':'')
    +'<span class="cc-spine-chip" data-range="all">All</span>'
    +'<span class="cc-spine-chip cc-spine-zoom" id="cc-spine-zoom" title="Zoom the timeline (or pinch / Ctrl+scroll on it)">1\u00d7</span></div>';

  /* spine body */
  var body='<div class="cc-spine-body">'
    +'<div class="cc-spine-track" id="cc-spine-track"><div class="cc-spine-bar" id="cc-spine-bar"></div></div>'
    +'<div class="cc-spine-previews" id="cc-spine-previews"></div></div>';

  /* info + go */
  var info='<div class="cc-spine-info">'
    +'<span class="cc-spine-range" id="cc-spine-range"></span>'
    +'<span class="cc-spine-tokens" id="cc-spine-tokens"></span>'
    +(d.can_count_exact?'<span class="cc-spine-exact" id="cc-spine-exact" title="Count exactly with your API key">exact</span>':'')+'</div>';
  var go='<button class="cc-spine-go" id="cc-spine-go">Go with selection</button>';

  view.innerHTML=header+chips+body+info+go;
  panelEl.appendChild(view);

  /* hide search + list */
  var search=panelEl.querySelector('.cc-search-wrap');
  var list=panelEl.querySelector('#cc-fab-list');
  if(search)search.style.display='none';
  if(list)list.style.display='none';

  buildBar(msgs);
  buildPreviews(msgs);
  updateInfo();

  /* events */
  view.querySelector('#cc-spine-back').onclick=function(){
    closeSpine();
    if(search)search.style.display='';
    if(list)list.style.display='';
    /* re-render list */
    if(window.__ccReopenList)window.__ccReopenList();
  };

  view.querySelectorAll('.cc-spine-chip[data-range]').forEach(function(chip){
    chip.onclick=function(){
      var range=chip.dataset.range;var len=msgs.length;
      if(range==='last10'){_from=Math.max(0,len-10);_to=len-1;}
      else if(range==='last25'){_from=Math.max(0,len-25);_to=len-1;}
      else if(range==='half'){_from=Math.floor(len/2);_to=len-1;}
      else if(range==='break'&&brk){_from=brk.idx;_to=len-1;}
      else{_from=0;_to=len-1;}
      updateHandles();updatePreviews();updateInfo();
    };
  });

  view.querySelector('#cc-spine-zoom').onclick=function(){setZoom(ZOOMS[(ZOOMS.indexOf(_zoom)+1)%ZOOMS.length]);};
  view.querySelector('#cc-spine-track').addEventListener('wheel',function(e){
    if(!e.ctrlKey&&!e.metaKey)return;
    e.preventDefault();var i=ZOOMS.indexOf(_zoom);
    setZoom(ZOOMS[Math.max(0,Math.min(ZOOMS.length-1,i+(e.deltaY<0?1:-1)))]);
  },{passive:false});
  var exactEl=view.querySelector('#cc-spine-exact');
  if(exactEl)exactEl.onclick=async function(){
    var tokEl=document.getElementById('cc-spine-tokens');exactEl.textContent='...';
    var r=await new Promise(function(res){chrome.runtime.sendMessage({type:'count_range',chatId:_chatId,from:_from,to:_to,keepHead:KEEP_HEAD},res);});
    exactEl.textContent='exact';
    if(!r||!r.ok){if(window.__ccToast)window.__ccToast('Exact count failed: '+((r&&r.error)||'?').slice(0,30));return;}
    if(tokEl){tokEl.textContent=r.tokens.toLocaleString()+' tokens';tokEl.classList.add('cc-exact');}
  };

  view.querySelector('#cc-spine-go').onclick=async function(){
    var btn=this;btn.disabled=true;btn.textContent='...';
    try{
      var r=await new Promise(function(res){
        chrome.runtime.sendMessage({type:'get_distilled_range',chatId:_chatId,from:_from,to:_to,keepHead:KEEP_HEAD},res);
      });
      if(!r||!r.ok)throw new Error(r?r.error:'failed');
      var selCount=_to-_from+1;var head=r.data.head||[];
      var parts=['[clawd-continue] Continuing from messages '+_from+'-'+_to+' of '+msgs.length+' in session "'+r.data.title+'".'+(head.length?' The opening '+(head.length>1?head.length+' messages are':'message is')+' included first for context.':'')+'\n\nDigest this prior session slice and continue from where it left off.\n'];
      var fmt=function(m){parts.push((m.role==='human'?'**Human:**':'**Assistant:**')+'\n'+m.text+'\n');};
      if(head.length){head.forEach(fmt);parts.push('[...]\n');}
      r.data.messages.forEach(fmt);
      parts.push('---\nResume from here. You have partial context ('+selCount+' of '+msgs.length+' messages). Ask if you need earlier context.');
      var text=parts.join('\n');
      var how=await window.__ccContinue(text);
      btn.textContent='Done';
      if(how==='injected'&&window.__ccToast)window.__ccToast('Loaded into composer');
      setTimeout(function(){if(window.__ccClosePanel)window.__ccClosePanel();},600);
    }catch(e){
      btn.textContent='Error';
      if(window.__ccToast)window.__ccToast('Error: '+e.message.slice(0,30));
      setTimeout(function(){btn.textContent='Go with selection';btn.disabled=false;},1500);
    }
  };

  /* drag handles */
  setupDrag(view,msgs);
}

function buildBar(msgs){
  var bar=document.getElementById('cc-spine-bar');if(!bar)return;
  var total=_spineData.total_chars||1;
  bar.innerHTML='';
  /* fill */
  var fill=document.createElement('div');fill.className='cc-spine-fill';fill.id='cc-spine-fill';
  bar.appendChild(fill);
  /* markers - past GROUP_OVER messages, one marker per group so the bar stays readable */
  var cum=[0];for(var c=0;c<msgs.length;c++)cum.push(cum[c]+msgs[c].chars);
  var size=msgs.length>GROUP_OVER?Math.max(5,Math.ceil(msgs.length/50)):1;
  for(var i=0;i<msgs.length;i+=size){
    var end=Math.min(i+size,msgs.length);var gChars=cum[end]-cum[i];
    var marker=document.createElement('div');
    marker.className='cc-spine-marker '+(size>1?'group':msgs[i].role);
    marker.style.top=(cum[i]/total*100)+'%';marker.style.height=Math.min(Math.max(2,gChars/total*100),8)+'px';
    marker.title=size>1?'#'+i+'-#'+(end-1)+' ('+(end-i)+' msgs, '+gChars+' chars)':'#'+i+' '+msgs[i].role+' ('+msgs[i].chars+' chars)';
    bar.appendChild(marker);
  }
  /* handles */
  var topH=document.createElement('div');topH.className='cc-spine-handle top';topH.id='cc-handle-top';
  var botH=document.createElement('div');botH.className='cc-spine-handle bottom';botH.id='cc-handle-bot';
  bar.appendChild(topH);bar.appendChild(botH);
  updateHandles();
}

function updateHandles(){
  var msgs=_spineData.messages;var total=msgs.length||1;
  var topH=document.getElementById('cc-handle-top');
  var botH=document.getElementById('cc-handle-bot');
  var fill=document.getElementById('cc-spine-fill');
  if(!topH||!botH||!fill)return;
  var topPct=_from/total*100;var botPct=(_to+1)/total*100;
  topH.style.top=topPct+'%';
  botH.style.top=botPct+'%';botH.style.bottom='auto';
  fill.style.top=topPct+'%';fill.style.height=(botPct-topPct)+'%';
}

function buildPreviews(msgs){
  var container=document.getElementById('cc-spine-previews');if(!container)return;
  container.innerHTML='';
  for(var i=0;i<msgs.length;i++){
    var m=msgs[i];
    var div=document.createElement('div');
    div.className='cc-spine-msg '+m.role+(i>=_from&&i<=_to?' in-range':' out-range');
    div.textContent='#'+i+' '+m.preview;
    div.dataset.idx=i;
    div.title=m.role+' #'+i+' - '+m.chars+' chars';
    container.appendChild(div);
  }
}

function updatePreviews(){
  var items=document.querySelectorAll('.cc-spine-msg');var hn=headCount();
  items.forEach(function(el){
    var idx=parseInt(el.dataset.idx);var inSel=idx>=_from&&idx<=_to,inHead=idx<hn;
    el.classList.toggle('in-range',inSel||inHead);el.classList.toggle('out-range',!(inSel||inHead));
    el.classList.toggle('cc-head',inHead);
  });
}

function setZoom(z){
  _zoom=z;var track=document.getElementById('cc-spine-track'),bar=document.getElementById('cc-spine-bar');
  var zb=document.getElementById('cc-spine-zoom');if(zb)zb.textContent=z+'\u00d7';
  if(!track||!bar)return;
  if(z===1){bar.style.flex='';bar.style.height='';track.scrollTop=0;}
  else{var h=track.clientHeight*z;bar.style.flex='none';bar.style.height=h+'px';track.scrollTop=Math.max(0,_from/(_spineData.messages.length||1)*h-20);}
  var first=document.querySelector('.cc-spine-msg[data-idx="'+_from+'"]');var pv=document.getElementById('cc-spine-previews');
  if(first&&pv)pv.scrollTop=first.offsetTop-pv.offsetTop;
}

function updateInfo(){
  var msgs=_spineData.messages;
  var rangeEl=document.getElementById('cc-spine-range');
  var tokEl=document.getElementById('cc-spine-tokens');
  if(!rangeEl||!tokEl)return;
  var count=_to-_from+1;var hn=headCount();
  rangeEl.textContent='msgs '+_from+'-'+_to+' of '+msgs.length+' ('+count+' selected'+(hn?' + '+hn+' opener':'')+')';
  var chars=0;for(var i=_from;i<=_to;i++)chars+=msgs[i].chars;for(var h=0;h<hn;h++)chars+=msgs[h].chars;
  var tokens=Math.round(chars/3.5);var tokK=tokens>=1000?(tokens/1000).toFixed(1)+'k':tokens;
  tokEl.textContent='~'+tokK+' tokens';
  tokEl.className='cc-spine-tokens'+(tokens>150000?' red':tokens>50000?' amber':'');
  var btn=document.getElementById('cc-spine-go');
  if(btn)btn.textContent='Go with '+(count+hn)+' messages';
}

function setupDrag(view,msgs){
  var bar=document.getElementById('cc-spine-bar');if(!bar)return;
  var dragging=null;
  var topH=document.getElementById('cc-handle-top');
  var botH=document.getElementById('cc-handle-bot');

  function onDown(handle,which){
    return function(e){e.preventDefault();e.stopPropagation();dragging=which;
      document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);};
  }
  function onMove(e){
    if(!dragging)return;
    var rect=bar.getBoundingClientRect();
    var pct=Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));
    var idx=Math.round(pct*(msgs.length-1));
    if(dragging==='top'){_from=Math.min(idx,_to);}
    else{_to=Math.max(idx,_from);}
    updateHandles();updatePreviews();updateInfo();
  }
  function onUp(){dragging=null;
    document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
    /* persist range */
    chrome.storage.local.set({['_spine_range_'+_chatId]:{from:_from,to:_to}});
  }
  topH.addEventListener('mousedown',onDown(topH,'top'));
  botH.addEventListener('mousedown',onDown(botH,'bottom'));

  /* load persisted range */
  chrome.storage.local.get('_spine_range_'+_chatId,function(d){
    var saved=d['_spine_range_'+_chatId];
    if(saved&&saved.from!=null&&saved.to!=null){
      _from=Math.min(saved.from,msgs.length-1);_to=Math.min(saved.to,msgs.length-1);
      if(_from>_to)_from=0;
      updateHandles();updatePreviews();updateInfo();
    }
  });
}

function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

})();
