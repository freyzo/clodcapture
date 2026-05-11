const Q = "?tree=True&rendering_mode=messages&render_all_tools=true&consistency=eventual";
const CHAT_RE = /\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
const SYNC_DIR = "clodcapture";
const DB_NAME = "brainjar";
const DB_VER = 1;

// Context usage: API counting when key set, char estimation when not

// IndexedDB
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("chats")) r.result.createObjectStore("chats"); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function dbPut(k, v) { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction("chats","readwrite"); tx.objectStore("chats").put(v,k); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
async function dbGet(k) { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction("chats","readonly"); const r = tx.objectStore("chats").get(k); r.onsuccess=()=>res(r.result||null); r.onerror=()=>rej(r.error); }); }
async function dbDelete(k) { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction("chats","readwrite"); tx.objectStore("chats").delete(k); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
async function dbClear() { const db = await openDB(); return new Promise((res, rej) => { const tx = db.transaction("chats","readwrite"); tx.objectStore("chats").clear(); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }

// Cookie-based auth fetch (reliable in MV3 service workers)
async function getCookieHeader(url) {
  const cookies = await chrome.cookies.getAll({url});
  const now = Date.now() / 1000;
  return cookies.filter(c => !c.expirationDate || c.expirationDate > now).map(c => c.name + "=" + c.value).join("; ");
}
async function authFetch(url) {
  const cookie = await getCookieHeader(url);
  const r = await fetch(url, {headers: {"Cookie": cookie}});
  if (!r.ok) throw new Error("" + r.status);
  return r;
}
async function api(path) { return (await authFetch("https://claude.ai" + path)).json(); }
async function fetchRaw(chatId) { const org = await getOrg(); return (await authFetch("https://claude.ai/api/organizations/" + org.uuid + "/chat_conversations/" + chatId + Q)).text(); }

async function getOrg() {
  const c = await chrome.storage.local.get("_org");
  if (c._org) return c._org;
  const orgs = await api("/api/organizations");
  const org = orgs.find(o => JSON.stringify(o.capabilities||{}).includes("chat")) || orgs[orgs.length-1];
  const v = {uuid:org.uuid, name:org.name};
  await chrome.storage.local.set({_org:v});
  return v;
}

// Index management
async function getIndex() { return (await chrome.storage.local.get("_index"))._index || {}; }
async function putIndex(chatId, meta) { const idx = await getIndex(); idx[chatId]=meta; await chrome.storage.local.set({_index:idx}); updateBadge(Object.keys(idx).length); }
async function removeIndex(chatId) { const idx = await getIndex(); delete idx[chatId]; await chrome.storage.local.set({_index:idx}); updateBadge(Object.keys(idx).length); }
function updateBadge(n) { chrome.action.setBadgeText({text:n>0?String(n):""}); chrome.action.setBadgeBackgroundColor({color:"#9B78F8"}); }
function slug(s) { return (s||"untitled").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50); }

// Download helper
async function dl(content, filename, type) {
  const b64 = btoa(unescape(encodeURIComponent(content)));
  return new Promise((res, rej) => {
    chrome.downloads.download({url:"data:" + type + ";base64," + b64, filename:filename, saveAs:false, conflictAction:"overwrite"}, id => {
      chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res(id);
    });
  });
}

// Distill raw API response to clean session format (for inject/clawd-continue)
function distill(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  const msgs = (data.chat_messages || []).flatMap(msg => {
    const role = msg.sender === "human" ? "human" : "assistant";
    const text = (msg.content || [])
      .filter(c => c.type === "text" && (c.text || "").trim())
      .map(c => c.text.trim())
      .join("\n\n");
    return text ? [{role, text}] : [];
  });
  return { title: data.name || "session", created_at: data.created_at, messages: msgs };
}

// GitHub sync
async function getGitHubConfig() {
  const c = await chrome.storage.local.get(["ghToken", "ghRepo", "ghAutoSync"]);
  if (!c.ghToken || !c.ghRepo) return null;
  var parts = c.ghRepo.split("/");
  if (parts.length !== 2) return null;
  return { token: c.ghToken, owner: parts[0], repo: parts[1], auto: !!c.ghAutoSync };
}

async function ghPush(chatId, raw, meta) {
  const gh = await getGitHubConfig();
  if (!gh) return;
  const path = "chats/" + slug(meta.name) + "-" + chatId.slice(0,8) + ".json";
  const b64 = btoa(unescape(encodeURIComponent(raw)));
  const headers = { "Authorization": "Bearer " + gh.token, "Content-Type": "application/json", "Accept": "application/vnd.github+json" };
  const url = "https://api.github.com/repos/" + gh.owner + "/" + gh.repo + "/contents/" + path;

  var sha = null;
  try {
    var existing = await fetch(url, { headers: headers });
    if (existing.ok) {
      var data = await existing.json();
      sha = data.sha;
    }
  } catch(e) {}

  var body = { message: "update " + (meta.name || "chat") + " (" + (meta.message_count||0) + " msgs)", content: b64 };
  if (sha) body.sha = sha;

  var resp = await fetch(url, { method: "PUT", headers: headers, body: JSON.stringify(body) });
  if (!resp.ok) {
    var err = await resp.json().catch(function(){return {};});
    throw new Error((err.message) || "GitHub " + resp.status);
  }
  return { pushed: true, path: path };
}

async function ghPushAll() {
  const gh = await getGitHubConfig();
  if (!gh) throw new Error("GitHub not configured");
  const idx = await getIndex();
  var pushed = 0, errors = 0;
  for (const [id, meta] of Object.entries(idx)) {
    const raw = await dbGet(id);
    if (!raw) continue;
    try { await ghPush(id, raw, meta); pushed++; }
    catch(e) { errors++; }
    await new Promise(r=>setTimeout(r,200));
  }
  return { pushed: pushed, errors: errors, total: Object.keys(idx).length };
}

// Capture a single chat
async function capture(chatId, force) {
  const idx = await getIndex();
  if (!force && idx[chatId]) {
    const age = Date.now() - new Date(idx[chatId].captured_at).getTime();
    if (age < 30000) return {status:"fresh"};
  }
  const raw = await fetchRaw(chatId);
  const data = JSON.parse(raw);
  if (!force && idx[chatId] && idx[chatId].updated_at === data.updated_at) return {status:"fresh"};
  await dbPut(chatId, raw);
  var meta = {
    name: data.name||"Untitled", updated_at: data.updated_at, created_at: data.created_at,
    message_count: data.chat_messages ? data.chat_messages.length : 0, captured_at: new Date().toISOString(),
  };
  await putIndex(chatId, meta);
  var gh = await getGitHubConfig();
  if (gh && gh.auto) ghPush(chatId, raw, meta).catch(function(e){ console.error("gh_push:", e.message); });
  return {status:"captured", name:data.name, messages: data.chat_messages ? data.chat_messages.length : 0};
}

// Sync all conversations
async function sync() {
  const org = await getOrg();
  const list = await api("/api/organizations/" + org.uuid + "/chat_conversations");
  const convos = Array.isArray(list) ? list : (list.results||list.data||[]);
  let captured=0, exported=0, errors=0;
  for (const c of convos) {
    try { await capture(c.uuid||c.id, false); captured++; }
    catch(e) { errors++; if(e.message==="429") await new Promise(r=>setTimeout(r,5000)); }
    await new Promise(r=>setTimeout(r,300));
  }
  const idx = await getIndex();
  for (const [id, meta] of Object.entries(idx)) {
    const raw = await dbGet(id);
    if (!raw) continue;
    await dl(raw, SYNC_DIR + "/" + slug(meta.name) + "-" + id.slice(0,8) + ".json", "application/json");
    exported++;
    await new Promise(r=>setTimeout(r,100));
  }
  await chrome.storage.local.set({_last_sync: new Date().toISOString()});
  return {captured:captured, exported:exported, total:convos.length, errors:errors};
}

// Grab current chat to Downloads
async function grab(chatId) {
  const raw = await fetchRaw(chatId);
  const data = JSON.parse(raw);
  const date = new Date().toISOString().slice(0,10);
  await dl(raw, slug(data.name) + "-" + date + ".json", "application/json");
  return {status:"grabbed", name:data.name, messages: data.chat_messages ? data.chat_messages.length : 0};
}

// Get distilled session for a captured chat (for inject/clawd-continue)
async function getDistilled(chatId) {
  const raw = await dbGet(chatId);
  if (!raw) throw new Error("not_found");
  return distill(raw);
}

// Background auto-sync every 30 min
chrome.alarms.create("bg_sync", {periodInMinutes: 30});
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== "bg_sync") return;
  try {
    const org = await getOrg();
    const list = await api("/api/organizations/" + org.uuid + "/chat_conversations");
    const convos = Array.isArray(list) ? list : (list.results||list.data||[]);
    for (const c of convos) {
      try { await capture(c.uuid||c.id, false); }
      catch(e) { if(e.message==="429") await new Promise(r=>setTimeout(r,5000)); }
      await new Promise(r=>setTimeout(r,500));
    }
  } catch(e) { console.error("bg_sync:", e.message); }
});

// Auto-capture on tab navigation
chrome.tabs.onUpdated.addListener((_,change,tab) => {
  if (!tab.url || tab.url.indexOf("https://claude.ai") !== 0) return;
  const m = tab.url.match(CHAT_RE);
  if (m && (change.status==="complete"||change.url))
    capture(m[1], false).catch(e=>console.error("capture:",e.message));
});

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type==="get_index") { getIndex().then(reply); return true; }

  if (msg.type==="get_state") {
    (async()=>{
      const idx=await getIndex();
      const usage=await navigator.storage.estimate().catch(()=>({usage:0}));
      const ls=(await chrome.storage.local.get("_last_sync"))._last_sync||null;
      reply({count:Object.keys(idx).length, bytes:usage.usage||0, last_sync:ls});
    })();
    return true;
  }

  if (msg.type==="capture") {
    capture(msg.chatId,true).then(reply).catch(e=>reply({status:"error",error:e.message}));
    return true;
  }

  if (msg.type==="sync") {
    sync().then(reply).catch(e=>reply({status:"error",error:e.message}));
    return true;
  }

  if (msg.type==="grab") {
    grab(msg.chatId).then(reply).catch(e=>reply({status:"error",error:e.message}));
    return true;
  }

  if (msg.type==="get_tab_chat") {
    chrome.tabs.query({active:true,currentWindow:true}, tabs => {
      const m = tabs[0] && tabs[0].url ? tabs[0].url.match(CHAT_RE) : null;
      reply(m?m[1]:null);
    });
    return true;
  }

  if (msg.type==="export_one") {
    (async()=>{
      const raw=await dbGet(msg.chatId); if(!raw){reply({status:"not_found"});return;}
      const idx=await getIndex();
      const meta = idx[msg.chatId];
      await dl(raw, SYNC_DIR + "/" + slug(meta ? meta.name : "") + "-" + msg.chatId.slice(0,8) + ".json","application/json");
      reply({status:"exported"});
    })();
    return true;
  }

  if (msg.type==="get_distilled") {
    getDistilled(msg.chatId).then(d => reply({ok:true, data:d})).catch(e => reply({ok:false, error:e.message}));
    return true;
  }

  if (msg.type==="gh_push_all") {
    ghPushAll().then(reply).catch(e=>reply({error:e.message}));
    return true;
  }

  if (msg.type==="gh_validate") {
    (async()=>{
      try {
        var r = await fetch("https://api.github.com/repos/" + msg.repo, {
          headers: { "Authorization": "Bearer " + msg.token, "Accept": "application/vnd.github+json" }
        });
        if (!r.ok) throw new Error("" + r.status);
        var data = await r.json();
        reply({ok:true, name:data.full_name, private:data.private});
      } catch(e) { reply({ok:false, error:e.message}); }
    })();
    return true;
  }

  if (msg.type==="remove") {
    (async()=>{await dbDelete(msg.chatId);await removeIndex(msg.chatId);reply({ok:true});})();
    return true;
  }

  if (msg.type==="clear") {
    (async()=>{
      await dbClear();
      const keysToKeep = ["apiKey", "ghToken", "ghRepo", "ghAutoSync"];
      const all = await chrome.storage.local.get(null);
      const toRemove = Object.keys(all).filter(k => keysToKeep.indexOf(k) === -1 && k.indexOf('_ctx_') !== 0);
      if (toRemove.length) await chrome.storage.local.remove(toRemove);
      updateBadge(0);
      reply({ok:true});
    })();
    return true;
  }

  if (msg.type==="get_context_usage") {
    (async()=>{
      var raw = await dbGet(msg.chatId);
      if (!raw) { reply({pct:0, tokens:0, exact:false}); return; }
      var apiKey = (await chrome.storage.local.get("apiKey")).apiKey;
      if (apiKey) {
        try {
          var distilled = distill(raw);
          var msgs = distilled.messages.map(function(m){ return {role: m.role === "human" ? "user" : "assistant", content: m.text}; });
          var r = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
            method: "POST",
            headers: {"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},
            body: JSON.stringify({model:"claude-sonnet-4-20250514", messages:msgs})
          });
          if (r.ok) {
            var data = await r.json();
            var tokens = data.input_tokens || 0;
            reply({pct: Math.min(tokens/200000,1), tokens:tokens, exact:true});
            return;
          }
        } catch(e) {}
      }
      var data = JSON.parse(raw);
      var chars = 0;
      (data.chat_messages||[]).forEach(function(m){ (m.content||[]).forEach(function(c){ if(c.text) chars += c.text.length; }); });
      var tokens = Math.round(chars / 3.5);
      reply({pct: Math.min(tokens/200000,1), tokens:tokens, exact:false});
    })();
    return true;
  }

  if (msg.type==="refresh_all") {
    (async()=>{
      const idx=await getIndex();
      for (const id of Object.keys(idx)) {
        try{await capture(id,false);}catch(e){}
        await new Promise(r=>setTimeout(r,200));
      }
      reply({ok:true});
    })();
    return true;
  }
});

// Badge on startup
getIndex().then(idx=>updateBadge(Object.keys(idx).length)).catch(()=>{});

// Capture existing tabs on install/startup
async function captureExistingTabs() {
  try {
    const tabs = await chrome.tabs.query({url:"https://claude.ai/*"});
    for (const tab of tabs) {
      const m = tab.url ? tab.url.match(CHAT_RE) : null;
      if (m) capture(m[1], false).catch(()=>{});
    }
  } catch(e) {}
}
chrome.runtime.onInstalled.addListener(captureExistingTabs);
chrome.runtime.onStartup.addListener(captureExistingTabs);
captureExistingTabs();
