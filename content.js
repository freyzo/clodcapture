(function(){'use strict';var RE=/\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
function alive(){try{return!!(chrome.runtime&&chrome.runtime.id);}catch(e){return false;}}
async function loadIntoComposer(text){var el=document.querySelector('[contenteditable="true"].ProseMirror')||document.querySelector('[contenteditable="true"][data-placeholder]')||document.querySelector('[role="textbox"][contenteditable="true"]');if(!el)throw new Error('composer not found');var hidden=[];var anc=el.parentElement;while(anc&&anc!==document.body){if(anc.hasAttribute('aria-hidden')){hidden.push([anc,anc.getAttribute('aria-hidden')]);anc.removeAttribute('aria-hidden');}
anc=anc.parentElement;}
el.focus({preventScroll:true});await new Promise(function(r){setTimeout(r,80);});hidden.forEach(function(p){p[0].setAttribute('aria-hidden',p[1]);});var dt=new DataTransfer();dt.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));el.dispatchEvent(new InputEvent('input',{bubbles:true}));await new Promise(function(r){setTimeout(r,150);});if(!el.textContent.trim())document.execCommand('insertText',false,text);}
function messageHandler(msg,_sender,sendResponse){if(msg.action==='load'){loadIntoComposer(msg.text).then(function(){sendResponse({ok:true});}).catch(function(e){sendResponse({ok:false,error:e.message});});return true;}}
try{if(window.__ccHandler)chrome.runtime.onMessage.removeListener(window.__ccHandler);}catch(e){}
chrome.runtime.onMessage.addListener(messageHandler);window.__ccHandler=messageHandler;
/* the popup re-injects this file; page listeners are attached once per page */
if(window.__ccNavInit)return;window.__ccNavInit=true;
var lastChatId=null,nav=window.navigation,poll=null,lastHref=location.href;
function safeSend(msg){try{chrome.runtime.sendMessage(msg,function(){if(chrome.runtime.lastError){}});}catch(e){}}
function checkNav(){if(!alive()){teardown();return;}var m=location.pathname.match(RE);if(m&&m[1]!==lastChatId){lastChatId=m[1];safeSend({type:'capture',chatId:m[1]});}}
function onVisible(){if(!document.hidden){lastChatId=null;checkNav();}}
function onPoll(){if(location.href!==lastHref){lastHref=location.href;checkNav();}}
/* claude.ai's own history.pushState can't be wrapped from a content script (isolated world); Navigation API events are shared */
if(nav&&nav.addEventListener)nav.addEventListener('currententrychange',checkNav);else poll=setInterval(onPoll,1000);
document.addEventListener('visibilitychange',onVisible);
function teardown(){if(nav&&nav.removeEventListener)nav.removeEventListener('currententrychange',checkNav);if(poll)clearInterval(poll);document.removeEventListener('visibilitychange',onVisible);window.__ccNavInit=false;}
checkNav();})();