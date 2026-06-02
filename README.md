# clodcapture

**Auto-save, export, and continue Claude.ai chat sessions across conversations.**

A Chrome extension (Manifest V3) that captures chats in the background and stores them locally. Vanilla JS, no npm build, no framework.

| Link | URL |
|------|-----|
| Chrome Web Store | https://chromewebstore.google.com/detail/mhapejnhlmepeinjmlppoopcoicmgojb |
| Privacy policy | https://clodcapture-privacy.vercel.app/ |
| Source | https://github.com/freyzo/clodcapture |
| Project page | https://freyazou.com/projects/clodcapture/ |

## Media (Chrome Web Store assets)

Paths are under `chrome-store/assets/`:

| File | Use |
|------|-----|
| [`cws-store-icon-128.png`](chrome-store/assets/cws-store-icon-128.png) | Store listing icon (128x128) |
| [`cws-promo-440x280.png`](chrome-store/assets/cws-promo-440x280.png) | Small promo tile (440x280) |
| [`clodcapture-marquee-1400x560.png`](chrome-store/assets/clodcapture-marquee-1400x560.png) | Marquee (1400x560) |
| [`demo.gif`](chrome-store/assets/demo.gif) | Demo GIF |
| [`spider_icon.svg`](chrome-store/assets/spider_icon.svg) | Spider icon source |

## The problem

Claude.ai does not ship a full session export. When context fills up, long threads are hard to keep. Manual copy-paste is slow and you lose structure.

## What it does

- Runs while you use **claude.ai**; no separate login for capture.
- Saves full conversation JSON in **IndexedDB** (`brainjar`); fast list metadata in `chrome.storage.local`.
- Optional **Anthropic API key** for token counting and **clawd-continue** (see below). Capture itself uses your normal site session (cookies).

### Core pipeline

1. **Auto-capture on navigation** — Content script patches `history.pushState` / `replaceState` and listens for `popstate`. Switching chats triggers a capture via the service worker.
2. **Cookie-based fetch** — Uses your existing claude.ai session to call the conversation API (no API key required for saving).
3. **IndexedDB** — Raw JSON locally; metadata indexed for the popup list.
4. **Background sync** — Alarm every **30 minutes** to refresh captures.

### Export modes

| Mode | Behavior |
|------|----------|
| **Copy** | Distills to `{ title, messages[] }` JSON and copies to clipboard. |
| **Grab** | Downloads raw API JSON with a timestamped filename. |
| **Sync All** | Exports every captured chat to `Downloads/clodcapture/`. |
| **GitHub Push** | Pushes to a configured `owner/repo` (optional auto-push on capture). |

### clawd-continue

Resume a saved thread in a **new** chat:

1. Distills capture to roles + text.
2. **With API key:** Claude Sonnet builds an **intelligence report** (entities, arc, state, next step)—not a line-by-line replay.
3. **Without API key:** Fallback prompt embeds session JSON.
4. Injects into the claude.ai composer via a `ClipboardEvent`.

### Context usage gauge (popup)

- **With API key:** Token count via `/v1/messages/count_tokens` vs a **200k** window.
- **Without:** Estimate `chars / 3.5`.
- Shown as a dashed ring in the popup.

## Architecture (~570 lines, zero dependencies)

```
manifest.json          MV3, service_worker, content_scripts on claude.ai
  |
  +-- background.js    IndexedDB, auth fetch, capture / sync / export,
  |                     GitHub push, token count, alarms
  +-- content.js       History patching, capture triggers, composer injection
  +-- popup.js         UI, handlers, settings, lists, progress
  +-- popup.html       Layout + styles (glass UI)
  +-- spider.js        Header canvas spider (click = bounce)
```

## Permissions

| Permission | Why |
|------------|-----|
| `storage`, `unlimitedStorage` | IndexedDB + extension storage |
| `tabs` | Active claude.ai tab / chat id from URL |
| `cookies` | Session-backed API calls for capture |
| `downloads` | JSON exports |
| `clipboardWrite`, `clipboardRead` | Copy / paste workflows |
| `scripting` | Inject for composer flows |
| `alarms` | 30-minute sync |

**Host permissions:** `claude.ai`, `api.anthropic.com` (counting / continue), `api.github.com` (backup).

## Design notes

- Accent **#D97757** (terracotta): progress, badges, gauge, spider, status dots.
- Dark glass UI, blur, springy easing `cubic-bezier(.34,1.56,.64,1)`.
- Typography: **DM Sans** (400 / 500 / 700).

## Install from source

1. Clone this repo.
2. Chrome → **Extensions** → turn on **Developer mode** → **Load unpacked** → choose the repo folder (the one that contains `manifest.json`).
3. Open https://claude.ai and use the extension popup as usual.

Current release in `manifest.json`: **2.2.0**. Store listing may show “pending review” after updates; check the Web Store link for live status.

## License / compliance

See the [privacy policy](https://clodcapture-privacy.vercel.app/) linked from the store listing. Data stays on your machine unless you export or configure GitHub push.
