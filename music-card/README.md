# Music Card Generator

Paste a link to any song — Spotify, Apple Music, YouTube, Tidal, Deezer,
Amazon Music, and more — and get a shareable **1080×1920** card image you can
drop into any story (TikTok, Threads, Snapchat, Instagram, X, anywhere).

No login, no upload, no account. It runs entirely in the browser as a static
page, and it's a standalone app — independent of the surrounding `listening`
site.

## What it does

- Resolves a streaming link into title, artist, cover art, and cross-platform
  links via [Odesli](https://odesli.co/).
- No link? Type `artist - song` and it falls back to the iTunes Search API.
- Renders the card to a `<canvas>` and downloads it as a PNG.
- Five styles: **dark** (dominant-color gradient), **light**, **vinyl**
  (record with grooves and an art label), **polaroid**, and **minimal**.
- Optional scan-to-listen **QR code** of the universal link, plus a
  copy-universal-link button.

## Run it locally

It's plain HTML/CSS/JS with no build step. Open it through a local web server
(not `file://`, so the browser uses a real origin for the API requests):

```
cd music-card
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy

Copy the folder's three files (`index.html`, `card.css`, `card.js`) to any
static host — GitHub Pages, Netlify, Cloudflare Pages, S3, etc. There's
nothing to build.

## How it works

1. **Link resolution.** The Odesli API does not send CORS headers, so the
   browser can't call it directly. The app attempts a direct request first,
   then falls back to the `allorigins.win` proxy, which adds the
   `Access-Control-Allow-Origin` header.
2. **Artwork.** Cover art is loaded with `crossOrigin = "anonymous"` so the
   canvas stays untainted and exportable. The app prefers CDNs known to send
   CORS headers (Spotify, Amazon), probes each candidate for canvas-taint, and
   as a last resort proxies the image so export never fails.
3. **Rendering.** Each style is a function that draws onto a 1080×1920 canvas.
   The dark/light/polaroid styles sample the cover's average color to tint the
   background.
4. **QR code.** When enabled, a QR of the universal link is fetched from
   `api.qrserver.com` (best-effort — it never blocks the card).

## Credits & terms

Metadata via Odesli and the iTunes Search API. Album artwork belongs to its
respective rights holders and is displayed for personal, non-commercial
sharing.

## Third-party dependencies

Runtime calls go to these services (all free, no key required):

| Service | Used for |
|---------|----------|
| `api.song.link` (Odesli) | Link resolution & cross-platform links |
| `api.allorigins.win` | CORS proxy for Odesli |
| `itunes.apple.com` | Text-search fallback |
| `api.qrserver.com` | Optional QR code |
