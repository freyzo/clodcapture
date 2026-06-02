(function(){'use strict';
if(document.getElementById('cc-fab'))return;
var CHAT_RE=/\/chat\/([0-9a-f-]{36})/;
var SHOW_RE=/^https:\/\/claude\.ai\/(chat|new)/;
var send=function(t,d){return new Promise(function(r){chrome.runtime.sendMessage(Object.assign({type:t},d||{}),r);});};

/* ── Helpers ─────────────────────────────────────── */
function ago(iso){if(!iso)return'';var m=Math.floor((Date.now()-new Date(iso))/60000);if(m<1)return'now';if(m<60)return m+'m';var h=Math.floor(m/60);return h<24?h+'h':Math.floor(h/24)+'d';}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ── Toast ───────────────────────────────────────── */
var toastEl=document.createElement('div');toastEl.id='cc-toast';document.body.appendChild(toastEl);
var _toastTimer=null;
function toast(msg){clearTimeout(_toastTimer);toastEl.textContent=msg;toastEl.classList.add('cc-show');_toastTimer=setTimeout(function(){toastEl.classList.remove('cc-show');},2500);}

/* ── FAB button ──────────────────────────────────── */
var fab=document.createElement('button');fab.id='cc-fab';
fab.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#1e1a26" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/><circle cx="12" cy="12" r="3"/></svg>';
fab.title='clodcapture';

/* ring container */
var ring=document.createElement('div');ring.id='cc-fab-ring';fab.appendChild(ring);

document.body.appendChild(fab);

/* ── Position persistence ────────────────────────── */
var pos={x:null,y:null};
chrome.storage.local.get('_fab_pos',function(d){
  if(d._fab_pos){pos=d._fab_pos;fab.style.left=pos.x+'px';fab.style.top=pos.y+'px';}
  else{fab.style.right='24px';fab.style.bottom='24px';}
});

/* ── Drag logic ──────────────────────────────────── */
var dragging=false,dragStart={x:0,y:0},fabStart={x:0,y:0},moved=false;
fab.addEventListener('mousedown',function(e){if(e.button!==0)return;dragging=true;moved=false;
  var r=fab.getBoundingClientRect();fabStart={x:r.left,y:r.top};dragStart={x:e.clientX,y:e.clientY};
  fab.classList.add('cc-dragging');e.preventDefault();});
document.addEventListener('mousemove',function(e){if(!dragging)return;
  var dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;
  if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true;
  var nx=Math.max(0,Math.min(window.innerWidth-52,fabStart.x+dx));
  var ny=Math.max(0,Math.min(window.innerHeight-52,fabStart.y+dy));
  fab.style.left=nx+'px';fab.style.top=ny+'px';fab.style.right='auto';fab.style.bottom='auto';});
document.addEventListener('mouseup',function(){if(!dragging)return;dragging=false;fab.classList.remove('cc-dragging');
  if(moved){var r=fab.getBoundingClientRect();pos={x:r.left,y:r.top};chrome.storage.local.set({_fab_pos:pos});}});

/* ── Panel ───────────────────────────────────────── */
var panel=document.createElement('div');panel.id='cc-fab-panel';
panel.innerHTML='<div class="cc-search-wrap"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="4.5"/><line x1="9.2" y1="9.2" x2="12.5" y2="12.5"/></svg><input id="cc-fab-search" type="text" placeholder="Search chats..." autocomplete="off" spellcheck="false"></div><div id="cc-fab-list"></div>';
document.body.appendChild(panel);

var panelOpen=false,allRows=[],searchTerm='';

function positionPanel(){var r=fab.getBoundingClientRect();var above=r.top>400;
  panel.style.left=Math.max(8,Math.min(window.innerWidth-292,r.left-116))+'px';
  if(above){panel.style.bottom=(window.innerHeight-r.top+8)+'px';panel.style.top='auto';}
  else{panel.style.top=(r.bottom+8)+'px';panel.style.bottom='auto';}}

function togglePanel(){if(panelOpen){closePanel();}else{openPanel();}}

async function openPanel(){panelOpen=true;positionPanel();panel.classList.add('cc-open');
  var idx=await send('get_index');
  allRows=Object.entries(idx||{}).sort(function(a,b){return new Date(b[1].captured_at)-new Date(a[1].captured_at);});
  renderList();document.getElementById('cc-fab-search').value='';searchTerm='';
  document.getElementById('cc-fab-search').focus();}

function closePanel(){panelOpen=false;panel.classList.remove('cc-open');}

function renderList(){var list=document.getElementById('cc-fab-list');
  var q=searchTerm.toLowerCase();
  var filtered=q?allRows.filter(function(e){return(e[1].name||'').toLowerCase().indexOf(q)!==-1;}):allRows;
  if(!filtered.length){list.innerHTML='<div class="cc-empty">'+(allRows.length?'No matches':'No captured chats yet')+'</div>';return;}
  list.innerHTML=filtered.slice(0,50).map(function(e){var id=e[0],v=e[1];
    return'<div class="cc-item" data-id="'+esc(id)+'"><div class="cc-item-info"><div class="cc-item-name" title="'+esc(v.name)+'">'+esc(v.name||'Untitled')+'</div><div class="cc-item-meta">'+(v.message_count||0)+' msgs &middot; '+ago(v.captured_at)+'</div></div><button class="cc-go" data-id="'+esc(id)+'">Go</button></div>';}).join('');
  list.querySelectorAll('.cc-go').forEach(function(b){b.onclick=function(ev){ev.stopPropagation();continueChat(b.dataset.id,b);};});}

/* ── Continue logic ──────────────────────────────── */
async function continueChat(chatId,btn){
  btn.disabled=true;btn.textContent='...';
  /* disable all other go buttons */
  panel.querySelectorAll('.cc-go').forEach(function(b){b.disabled=true;});
  try{
    var r=await send('continue_chat',{chatId:chatId});
    if(!r||!r.ok)throw new Error((r&&r.error)||'failed');
    /* navigate to /new if not already there */
    var onNew=location.pathname==='/new'||!location.pathname.match(CHAT_RE);
    if(!onNew){window.location.href='https://claude.ai/new';
      await waitForComposer();
    }
    await injectText(r.text);
    btn.textContent='✓';btn.classList.add('cc-ok');
    toast('Loaded into composer');
    setTimeout(closePanel,600);
  }catch(e){
    btn.textContent='!';btn.classList.add('cc-err');
    toast('Error: '+e.message.slice(0,40));
    setTimeout(function(){btn.textContent='Go';btn.classList.remove('cc-err');},1500);
  }finally{panel.querySelectorAll('.cc-go').forEach(function(b){b.disabled=false;});}}

function waitForComposer(){return new Promise(function(resolve){
  var attempts=0,max=15;
  var check=function(){var el=document.querySelector('[contenteditable="true"].ProseMirror')||document.querySelector('[contenteditable="true"][data-placeholder]')||document.querySelector('[role="textbox"][contenteditable="true"]');
    if(el){resolve();return;}
    if(++attempts>=max){resolve();return;}/* give up, will try anyway */
    setTimeout(check,200);};
  setTimeout(check,300);});}

async function injectText(text){
  var el=document.querySelector('[contenteditable="true"].ProseMirror')||document.querySelector('[contenteditable="true"][data-placeholder]')||document.querySelector('[role="textbox"][contenteditable="true"]');
  if(!el){await navigator.clipboard.writeText(text);toast('Copied - paste with Cmd+V');return;}
  el.focus({preventScroll:true});await new Promise(function(r){setTimeout(r,80);});
  var dt=new DataTransfer();dt.setData('text/plain',text);
  el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
  el.dispatchEvent(new InputEvent('input',{bubbles:true}));
  await new Promise(function(r){setTimeout(r,150);});
  if(!el.textContent.trim())document.execCommand('insertText',false,text);}

/* ── Context ring ────────────────────────────────── */
async function updateRing(){var m=location.pathname.match(CHAT_RE);if(!m)return;
  var ctx=await send('get_context_usage',{chatId:m[1]});if(!ctx||!ctx.tokens)return;
  var pct=ctx.pct,color=pct<0.5?'#22c55e':pct<0.8?'#d97706':'#ef4444';
  var r=26,cx=28,cy=28,circ=2*Math.PI*r,fill=circ*pct;
  ring.innerHTML='<svg viewBox="0 0 56 56"><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="3"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-dasharray="'+fill+' '+(circ-fill)+'" stroke-linecap="round" transform="rotate(-90 '+cx+' '+cy+')" opacity="0.85"/></svg>';}

/* ── Event wiring ────────────────────────────────── */
fab.addEventListener('click',function(){if(!moved)togglePanel();});

/* close on outside click */
document.addEventListener('click',function(e){if(panelOpen&&!panel.contains(e.target)&&e.target!==fab)closePanel();});

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
/* refresh ring periodically */
setInterval(updateRing,30000);

})();
