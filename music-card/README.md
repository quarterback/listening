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

The front end is plain HTML/CSS/JS with no build step, but link resolution uses
a serverless function (`api/resolve.js`). To exercise that locally, use the
Vercel CLI so the function runs too:

```
cd music-card
npx vercel dev      # serves the page AND the /api/resolve function
```

A plain static server (`python3 -m http.server`) also works, but without the
function the app falls back to a public CORS proxy for link resolution (which
can be flaky); typed `artist - song` searches work either way.

## Deploy (Vercel)

This app expects to run on Vercel because it includes a serverless function.

1. **vercel.com → Add New → Project** and import this repo.
2. Set **Root Directory = `music-card`**.
3. **Framework Preset = Other**, no build command, default output directory.
4. Deploy.

With the root directory set to `music-card`, the `api/` folder is detected
automatically and `api/resolve.js` is served at `/api/resolve`. The static
files are served directly. No `vercel.json` required.

## Why a serverless function?

Odesli's public API sends no CORS header, so the browser cannot call it
directly. The function `api/resolve.js` calls Odesli **server-side** (no CORS
involved) and returns the JSON to the page on the same origin. This replaced an
earlier dependency on the public `allorigins.win` proxy, which was unreliable
and would cause cards to silently fail to load when it was down. The proxy
remains only as a last-resort fallback for static-only hosting.

## How it works

1. **Link resolution.** The Odesli API does not send CORS headers, so the
   browser can't call it directly. The app calls its own `/api/resolve`
   serverless function, which fetches Odesli server-side and returns the JSON.
   If that function isn't available (plain static host), it falls back to the
   `allorigins.win` proxy.
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
| `api.song.link` (Odesli) | Link resolution & cross-platform links (called server-side by `api/resolve.js`) |
| `itunes.apple.com` | Text-search fallback |
| `api.qrserver.com` | Optional QR code |
| `api.allorigins.win` | Last-resort CORS proxy if the serverless function is absent |
