(function(){'use strict';
if(document.getElementById('cc-fab'))return;
var CHAT_RE=/\/chat\/([0-9a-f-]{36})/;
var SHOW_RE=/^https:\/\/claude\.ai\/(chat|new)/;
var send=function(t,d){return new Promise(function(r){chrome.runtime.sendMessage(Object.assign({type:t},d||{}),r);});};

/* ── Helpers ─────────────────────────────────────── */
function ago(iso){if(!iso)return'';var m=Math.floor((Date.now()-new Date(iso))/60000);if(m<1)return'now';if(m<60)return m+'m';var h=Math.floor(m/60);return h<24?h+'h':Math.floor(h/24)+'d';}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

/* ── Toast ───────────────────────────────────────── */
var toastEl=document.createElement('div');toastEl.id='cc-toast';document.body.appendChild(toastEl);
var _toastTimer=null;
function toast(msg){clearTimeout(_toastTimer);toastEl.textContent=msg;toastEl.classList.add('cc-show');_toastTimer=setTimeout(function(){toastEl.classList.remove('cc-show');},2500);}

/* ── FAB button ──────────────────────────────────── */
var fab=document.createElement('button');fab.id='cc-fab';
fab.innerHTML='<svg id="cc-fab-spider" viewBox="-55 -45 110 100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ccgB" cx="0.35" cy="0.25" r="0.7" fx="0.3" fy="0.2"><stop offset="0%" stop-color="#f8b48e"/><stop offset="30%" stop-color="#e88a60"/><stop offset="50%" stop-color="#D97757"/><stop offset="70%" stop-color="#cf6e42"/><stop offset="100%" stop-color="#b8622e"/></radialGradient><radialGradient id="ccgH" cx="0.35" cy="0.25" r="0.7" fx="0.3" fy="0.18"><stop offset="0%" stop-color="#f8b898"/><stop offset="30%" stop-color="#e88a60"/><stop offset="55%" stop-color="#D97757"/><stop offset="75%" stop-color="#c0643f"/><stop offset="100%" stop-color="#b8622e"/></radialGradient><linearGradient id="ccgL" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0a080"/><stop offset="30%" stop-color="#D97757"/><stop offset="70%" stop-color="#cf6e42"/><stop offset="100%" stop-color="#b8622e"/></linearGradient><radialGradient id="ccgS" cx="0.35" cy="0.22" r="0.3"><stop offset="0%" stop-color="rgba(255,255,255,0.7)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient><linearGradient id="ccgAO" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(0,0,0,0)"/><stop offset="70%" stop-color="rgba(0,0,0,0.15)"/><stop offset="100%" stop-color="rgba(0,0,0,0.3)"/></linearGradient><filter id="cc3D" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/><feSpecularLighting in="blur" surfaceScale="4" specularConstant="0.6" specularExponent="20" result="spec" lighting-color="#fff5ee"><fePointLight x="-30" y="-40" z="80"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in" result="specMask"/><feComposite in="SourceGraphic" in2="specMask" operator="arithmetic" k1="0" k2="1" k3="0.35" k4="0"/></filter><filter id="ccGray"><feColorMatrix type="saturate" values="0"/></filter><clipPath id="ccSweepClip"><rect id="ccSM" x="55" y="-45" width="0" height="100"/></clipPath></defs><g id="ccSpiderG"><g stroke-linecap="round" stroke-linejoin="round" fill="none"><g stroke="rgba(140,70,35,0.3)" stroke-width="5"><path d="M-6,-7 L-12,-18 L-20,-24 L-24,-22"/><path d="M6,-7 L12,-18 L20,-24 L24,-22"/><path d="M-8,-3 L-16,-12 L-26,-13 L-32,-9"/><path d="M8,-3 L16,-12 L26,-13 L32,-9"/><path d="M-9,3 L-18,0 L-29,5 L-34,11"/><path d="M9,3 L18,0 L29,5 L34,11"/><path d="M-8,9 L-16,16 L-24,28 L-27,35"/><path d="M8,9 L16,16 L24,28 L27,35"/></g><g stroke="url(#ccgL)" stroke-width="4"><path d="M-6,-7 L-12,-18 L-20,-24 L-24,-22"/><path d="M6,-7 L12,-18 L20,-24 L24,-22"/><path d="M-8,-3 L-16,-12 L-26,-13 L-32,-9"/><path d="M8,-3 L16,-12 L26,-13 L32,-9"/><path d="M-9,3 L-18,0 L-29,5 L-34,11"/><path d="M9,3 L18,0 L29,5 L34,11"/><path d="M-8,9 L-16,16 L-24,28 L-27,35"/><path d="M8,9 L16,16 L24,28 L27,35"/></g><g stroke="rgba(255,220,190,0.35)" stroke-width="1.5" transform="translate(-0.5,-0.8)"><path d="M-6,-7 L-12,-18 L-20,-24 L-24,-22"/><path d="M6,-7 L12,-18 L20,-24 L24,-22"/><path d="M-8,-3 L-16,-12 L-26,-13 L-32,-9"/><path d="M8,-3 L16,-12 L26,-13 L32,-9"/><path d="M-9,3 L-18,0 L-29,5 L-34,11"/><path d="M9,3 L18,0 L29,5 L34,11"/><path d="M-8,9 L-16,16 L-24,28 L-27,35"/><path d="M8,9 L16,16 L24,28 L27,35"/></g></g><g fill="#c06840" opacity="0.6"><circle cx="-12" cy="-18" r="2.2"/><circle cx="12" cy="-18" r="2.2"/><circle cx="-18" cy="0" r="2.2"/><circle cx="18" cy="0" r="2.2"/><circle cx="-16" cy="16" r="2.2"/><circle cx="16" cy="16" r="2.2"/></g><g filter="url(#cc3D)"><ellipse cx="0" cy="-8" rx="10" ry="9" fill="url(#ccgH)"/><path d="M-13,0 C-13.5,12 -10,26 0,30 C10,26 13.5,12 13,0 C10,-4 -10,-4 -13,0Z" fill="url(#ccgB)"/></g><path d="M-13,0 C-13.5,12 -10,26 0,30 C10,26 13.5,12 13,0 C10,-4 -10,-4 -13,0Z" fill="url(#ccgAO)" opacity="0.2"/><ellipse cx="-2" cy="-11" rx="5" ry="4.5" fill="url(#ccgS)" opacity="0.85"/><ellipse cx="-2" cy="8" rx="6" ry="9" fill="url(#ccgS)" opacity="0.55"/><path d="M-12,1 C-12.5,11 -9,23 0,27 C9,23 12.5,11 12,1" stroke="rgba(255,210,180,0.25)" stroke-width="1.2" fill="none"/><line x1="-8" y1="-1" x2="8" y2="-1" stroke="rgba(180,100,60,0.12)" stroke-width="0.8"/></g><use href="#ccSpiderG" filter="url(#ccGray)" clip-path="url(#ccSweepClip)" pointer-events="none"/></svg><span id="cc-fab-pct"></span>';
fab.title='clodcapture (Cmd+Shift+K)';

/* ring container */
var ring=document.createElement('div');ring.id='cc-fab-ring';fab.appendChild(ring);

document.body.appendChild(fab);

/* ── Position persistence ────────────────────────── */
var pos={x:null,y:null};
chrome.storage.local.get('_fab_pos',function(d){
  if(d._fab_pos){pos=d._fab_pos;fab.style.left=pos.x+'px';fab.style.top=pos.y+'px';}
  else{fab.style.right='16px';fab.style.bottom='16px';}
});

/* ── Drag logic ──────────────────────────────────── */
var dragging=false,dragStart={x:0,y:0},fabStart={x:0,y:0},moved=false;
fab.addEventListener('mousedown',function(e){if(e.button!==0)return;dragging=true;moved=false;
  var r=fab.getBoundingClientRect();fabStart={x:r.left,y:r.top};dragStart={x:e.clientX,y:e.clientY};
  fab.classList.add('cc-dragging');e.preventDefault();});
document.addEventListener('mousemove',function(e){if(!dragging)return;
  var dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;
  if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true;
  var nx=Math.max(0,Math.min(window.innerWidth-72,fabStart.x+dx));
  var ny=Math.max(0,Math.min(window.innerHeight-72,fabStart.y+dy));
  fab.style.left=nx+'px';fab.style.top=ny+'px';fab.style.right='auto';fab.style.bottom='auto';});
document.addEventListener('mouseup',function(){if(!dragging)return;dragging=false;fab.classList.remove('cc-dragging');
  if(moved){var r=fab.getBoundingClientRect();pos={x:r.left,y:r.top};chrome.storage.local.set({_fab_pos:pos});}});

/* ── Panel ───────────────────────────────────────── */
var panel=document.createElement('div');panel.id='cc-fab-panel';
panel.innerHTML='<div class="cc-search-wrap"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="4.5"/><line x1="9.2" y1="9.2" x2="12.5" y2="12.5"/></svg><input id="cc-fab-search" type="text" placeholder="Search chats..." autocomplete="off" spellcheck="false"><div class="cc-mode" title="Full: pick messages on the timeline spine. Key: continue from the chat&#39;s compact summary key."><span class="cc-mode-lbl">Go uses</span><button class="cc-mode-btn" data-mode="full">Full</button><button class="cc-mode-btn" data-mode="key">Key</button></div></div><div id="cc-fab-list"></div>';
document.body.appendChild(panel);

var panelOpen=false,allRows=[],searchTerm='',continueMode='full';
function paintMode(){panel.querySelectorAll('.cc-mode-btn').forEach(function(b){b.classList.toggle('cc-on',b.dataset.mode===continueMode);});}
panel.querySelectorAll('.cc-mode-btn').forEach(function(b){b.onclick=function(e){e.stopPropagation();continueMode=b.dataset.mode;chrome.storage.local.set({_continue_mode:continueMode});paintMode();};});
chrome.storage.local.get('_continue_mode',function(d){if(d._continue_mode==='key')continueMode='key';paintMode();});

function positionPanel(){var r=fab.getBoundingClientRect();var above=r.top>400;
  panel.style.left=Math.max(8,Math.min(window.innerWidth-292,r.left-116))+'px';
  if(above){panel.style.bottom=(window.innerHeight-r.top+8)+'px';panel.style.top='auto';}
  else{panel.style.top=(r.bottom+8)+'px';panel.style.bottom='auto';}}

function togglePanel(){if(panelOpen){closePanel();}else{openPanel();}}

async function loadRows(){var idx=await send('get_index');
  allRows=Object.entries(idx||{}).sort(function(a,b){return new Date(b[1].captured_at)-new Date(a[1].captured_at);});}

async function openPanel(){panelOpen=true;positionPanel();panel.classList.add('cc-open');
  await loadRows();
  renderList();document.getElementById('cc-fab-search').value='';searchTerm='';
  document.getElementById('cc-fab-search').focus();}

function closePanel(){panelOpen=false;panel.classList.remove('cc-open');
  /* clean up spine if open */
  if(window.__ccSpine&&window.__ccSpine.isOpen())window.__ccSpine.close();
  /* restore search + list visibility */
  var s=panel.querySelector('.cc-search-wrap');if(s)s.style.display='';
  var l=document.getElementById('cc-fab-list');if(l)l.style.display='';}

function renderList(){var list=document.getElementById('cc-fab-list');
  var q=searchTerm.toLowerCase();
  var isTagSearch=q.charAt(0)==='#';var tagQ=isTagSearch?q.slice(1):'';
  var filtered=q?allRows.filter(function(e){if(isTagSearch){var tags=e[1].tags||[];return tags.some(function(t){return t.toLowerCase().indexOf(tagQ)!==-1;});}return(e[1].name||'').toLowerCase().indexOf(q)!==-1;}):allRows;
  if(!filtered.length){list.innerHTML='<div class="cc-empty">'+(allRows.length?'No matches':'No captured chats yet')+'</div>';return;}
  var byId={};allRows.forEach(function(e){byId[e[0]]=e[1];});
  list.innerHTML=(q?'':'<div id="cc-projects"></div>')+filtered.slice(0,5).map(function(e){var id=e[0],v=e[1];
    var from=v.parents&&v.parents.length?v.parents.map(function(p){return byId[p]?byId[p].name||'Untitled':'earlier chat';}):null;
    var lineage=from?' &middot; <span class="cc-lineage" title="Continued from: '+esc(from.join(', '))+'">&#8627; '+esc(from[0].slice(0,16))+'</span>':'';
    return'<div class="cc-item" data-id="'+esc(id)+'"><div class="cc-item-info"><div class="cc-item-name" title="'+esc(v.name)+'">'+esc(v.name||'Untitled')+'</div><div class="cc-item-meta">'+(v.message_count||0)+' msgs &middot; '+ago(v.captured_at)+lineage+'</div></div><button class="cc-go" data-id="'+esc(id)+'">Go</button></div>';}).join('');
  list.querySelectorAll('.cc-go').forEach(function(b){b.onclick=function(ev){ev.stopPropagation();
    if(continueMode==='key'){continueChat(b.dataset.id,b,true);}
    else if(window.__ccSpine){window.__ccSpine.open(b.dataset.id,panel);}
    else{continueChat(b.dataset.id,b,false);}};});
  /* hook for keys.js - render tags + long-press multi-select */
  list.querySelectorAll('.cc-item').forEach(function(el){
    if(window.__ccRenderItemHook)window.__ccRenderItemHook(el,el.dataset.id,byId[el.dataset.id]);});
  if(!q&&window.__ccKeys&&window.__ccKeys.renderProjects)window.__ccKeys.renderProjects(document.getElementById('cc-projects'),allRows);}
/* expose for spine.js / keys.js */
window.__ccRefreshList=async function(){await loadRows();renderList();};
/* expose for spine.js */
window.__ccToast=toast;window.__ccClosePanel=closePanel;window.__ccReopenList=function(){renderList();var s=panel.querySelector('.cc-search-wrap');if(s)s.style.display='';var l=document.getElementById('cc-fab-list');if(l)l.style.display='';};

/* ── Continue logic ──────────────────────────────── */
async function continueChat(chatId,btn,useKey){
  btn.disabled=true;btn.textContent='...';
  /* disable all other go buttons */
  panel.querySelectorAll('.cc-go').forEach(function(b){b.disabled=true;});
  try{
    var r=useKey?await send('continue_with_key',{chatIds:[chatId]}):await send('continue_chat',{chatId:chatId});
    if(!r||!r.ok)throw new Error((r&&r.error)||'failed');
    var how=await continueWithText(r.text);
    btn.textContent='✓';btn.classList.add('cc-ok');
    if(how==='injected')toast('Loaded into composer');
    setTimeout(closePanel,600);
  }catch(e){
    btn.textContent='!';btn.classList.add('cc-err');
    toast('Error: '+e.message.slice(0,40));
    setTimeout(function(){btn.textContent='Go';btn.classList.remove('cc-err');},1500);
  }finally{panel.querySelectorAll('.cc-go').forEach(function(b){b.disabled=false;});}}

function waitForComposer(maxMs){return new Promise(function(resolve){
  var deadline=Date.now()+(maxMs||3000);
  var check=function(){var el=document.querySelector('[contenteditable="true"].ProseMirror')||document.querySelector('[contenteditable="true"][data-placeholder]')||document.querySelector('[role="textbox"][contenteditable="true"]');
    if(el){resolve();return;}
    if(Date.now()>=deadline){resolve();return;}/* give up, will try anyway */
    setTimeout(check,200);};
  setTimeout(check,300);});}

/* ── Continue handoff ────────────────────────────── */
/* location.href to /new reloads the page and kills this script, so the text rides across in storage */
var PENDING_KEY='_pending_inject',PENDING_TTL_MS=120000;
async function continueWithText(text){
  var onNew=location.pathname==='/new'||!location.pathname.match(CHAT_RE);
  if(onNew){await injectText(text);return 'injected';}
  await chrome.storage.local.set({[PENDING_KEY]:{text:text,ts:Date.now()}});
  window.location.href='https://claude.ai/new';
  return 'navigating';}

async function consumePendingInject(){
  if(location.pathname!=='/new')return;
  var p=(await chrome.storage.local.get(PENDING_KEY))[PENDING_KEY];
  if(!p)return;
  await chrome.storage.local.remove(PENDING_KEY);
  if(!p.text||Date.now()-p.ts>PENDING_TTL_MS)return;
  await waitForComposer(15000);
  await injectText(p.text);
  toast('Loaded into composer');}
window.__ccContinue=continueWithText;

async function injectText(text){
  var el=document.querySelector('[contenteditable="true"].ProseMirror')||document.querySelector('[contenteditable="true"][data-placeholder]')||document.querySelector('[role="textbox"][contenteditable="true"]');
  if(!el){await navigator.clipboard.writeText(text);toast('Copied - paste with Cmd+V');return;}
  el.focus({preventScroll:true});await new Promise(function(r){setTimeout(r,80);});
  var dt=new DataTransfer();dt.setData('text/plain',text);
  el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
  el.dispatchEvent(new InputEvent('input',{bubbles:true}));
  await new Promise(function(r){setTimeout(r,150);});
  if(!el.textContent.trim())document.execCommand('insertText',false,text);}

/* ── Context sweep (color drain on spider) ───────── */
async function updateRing(){var m=location.pathname.match(CHAT_RE);
  var sm=fab.querySelector('#ccSM');
  if(!m){if(sm)sm.setAttribute('width','0');return;}
  var ctx=await send('get_context_usage',{chatId:m[1]});
  if(!ctx||!ctx.tokens){if(sm)sm.setAttribute('width','0');return;}
  /* sweep: 0% context = full color, 100% context = full gray (clip grows right-to-left) */
  if(sm){var w=Math.round(ctx.pct*110);sm.setAttribute('x',(55-w).toString());sm.setAttribute('width',w.toString());}}

/* ── Event wiring ────────────────────────────────── */
fab.addEventListener('click',function(){if(!moved)togglePanel();});

/* close on outside click - path is fixed at dispatch, so clicks on controls that re-render themselves still count as inside */
document.addEventListener('click',function(e){var path=e.composedPath();if(panelOpen&&path.indexOf(panel)===-1&&path.indexOf(fab)===-1)closePanel();});

/* close on Escape */
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&panelOpen){closePanel();e.stopPropagation();}
  /* Cmd/Ctrl+Shift+K toggle */
  if(e.key==='K'&&e.shiftKey&&(e.metaKey||e.ctrlKey)){e.preventDefault();togglePanel();}
});

/* search */
document.getElementById('cc-fab-search').addEventListener('input',function(){searchTerm=this.value.trim();renderList();});

/* close on navigation */
var _origPush=history.pushState,_origReplace=history.replaceState;
history.pushState=function(){_origPush.apply(this,arguments);closePanel();updateVisibility();updateRing();};
history.replaceState=function(){_origReplace.apply(this,arguments);closePanel();updateVisibility();updateRing();};
window.addEventListener('popstate',function(){closePanel();updateVisibility();updateRing();});

/* visibility: only show on chat/new pages */
function updateVisibility(){var show=SHOW_RE.test(location.href);fab.style.display=show?'flex':'none';}
updateVisibility();

/* initial ring update */
updateRing();
consumePendingInject().catch(function(e){toast('Error: '+e.message.slice(0,40));});
/* refresh ring periodically */
setInterval(updateRing,30000);

})();
