(function() {
  'use strict';
  if (window.__brainjarHandler) chrome.runtime.onMessage.removeListener(window.__brainjarHandler);

  var RE = /\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
  var lastChatId = null;
  function safeSend(msg) { try { chrome.runtime.sendMessage(msg).catch(function(){}); } catch(e) {} }

  function checkNav() {
    var m = location.pathname.match(RE);
    if (m && m[1] !== lastChatId) { lastChatId = m[1]; safeSend({ type: 'capture', chatId: m[1] }); }
  }
  checkNav();
  var _push = history.pushState, _replace = history.replaceState;
  history.pushState = function() { _push.apply(this, arguments); checkNav(); };
  history.replaceState = function() { _replace.apply(this, arguments); checkNav(); };
  window.addEventListener('popstate', checkNav);
  document.addEventListener('visibilitychange', function() { if (!document.hidden) { lastChatId = null; checkNav(); } });

  // Relay token data from MAIN world intercept.js
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === '__bj_tok' && e.data.c) {
      var key = '_ctx_' + e.data.c;
      var val = {};
      val[key] = { input: e.data.i, output: e.data.o, ts: Date.now() };
      try { chrome.storage.local.set(val); } catch(ex) {}
    }
  });

  // Composer loading
  async function injectIntoComposer(text) {
    var el = document.querySelector('[contenteditable="true"].ProseMirror') ||
      document.querySelector('[contenteditable="true"][data-placeholder]') ||
      document.querySelector('[role="textbox"][contenteditable="true"]');
    if (!el) throw new Error('composer not found');
    var hidden = [];
    var anc = el.parentElement;
    while (anc && anc !== document.body) {
      if (anc.hasAttribute('aria-hidden')) { hidden.push([anc, anc.getAttribute('aria-hidden')]); anc.removeAttribute('aria-hidden'); }
      anc = anc.parentElement;
    }
    el.focus({ preventScroll: true });
    await new Promise(function(r) { setTimeout(r, 80); });
    hidden.forEach(function(p) { p[0].setAttribute('aria-hidden', p[1]); });
    var dt = new DataTransfer();
    dt.setData('text/plain', text);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await new Promise(function(r) { setTimeout(r, 150); });
    if (!el.textContent.trim()) document.execCommand('insertText', false, text);
  }

  function messageHandler(msg, _sender, sendResponse) {
    if (msg.action === 'load') {
      injectIntoComposer(msg.text).then(function() { sendResponse({ ok: true }); }).catch(function(e) { sendResponse({ ok: false, error: e.message }); });
      return true;
    }
  }
  chrome.runtime.onMessage.addListener(messageHandler);
  window.__brainjarHandler = messageHandler;
})();
