# Building Listening: What I Learned Steering AI Through a Design Problem

## The Starting Point

Joel Goodman built a Python script that pulls your Last.fm data and generates a listening autobiography. His version at [listening.joelgoodman.co](https://listening.joelgoodman.co) is thoughtful — era timelines, a streamgraph, a bump chart, a "people not algorithms" philosophy, a heartbeat timeline for loved tracks. When he shared it with me I thought I could put my own spin on it.

What came out of that process surprised me. Joel told me afterward he took some of my ideas back into his own site. That exchange is worth unpacking, because I think it says something about what "engineering" means in the AI-assisted era and what kind of thinking actually matters.

## What I Actually Did

I'm not an engineer. I don't think of myself as one. But I know what D3.js is. I know what a streamgraph communicates versus a bar chart. I know what iTunes Search API returns and that Deezer's preview URLs expire but Apple's don't. I know that `IntersectionObserver` is lighter than a scroll listener. I know that `innerHTML` with user data will break on apostrophes and `textContent` won't.

None of that is engineering in the traditional sense. It's closer to material literacy — knowing what's available, what it does, and when to reach for it.

Here's what I steered:

**Editorial decisions that shaped the architecture:**
- Lead with the personal (favorite records, the Foundation narrative) before any data visualization. Joel leads with stats. I lead with taste.
- Audio previews inline, playable on the page. Joel links out to Apple Music. I wanted the sound *on the site* because the whole point is experiencing the music, not navigating away from it.
- The "Before the Scrobbles" section doesn't exist in Joel's version. He has era timelines tied to his scrobble data. I needed to show the lineage that predates data — Mr. Collins, my parents' Jersey club parties, delta blues on wax, Rimsky-Korsakov in third grade. The data starts in 2005 but the listening started decades earlier.
- A live "last scrobble" widget that follows you down the page. Joel had this idea and I liked it so much I adopted it — and then he adopted my improvements back. That's the exchange working.

**Technical decisions that came from knowing what's possible:**
- Vanilla JS, no framework. Not because frameworks are bad but because a single-page data visualization with D3 doesn't need React's overhead. Knowing when *not* to add complexity is a form of engineering judgment.
- Splitting the monolithic HTML into separate CSS/JS files when the session kept freezing. Understanding that a 600-line inline script is a maintenance problem even if it works.
- Switching from Deezer to iTunes for audio previews when Deezer's CORS headers blocked browser requests. Knowing what CORS is and why it matters meant I could diagnose the problem ("play buttons don't work") and direct the fix in one sentence.
- Using `createElement`/`textContent` instead of `innerHTML` template literals after apostrophes in artist names like "Wesley's Theory" and "Demon's Dance" broke the entire page. I didn't write that fix but I understood *why* it broke and that understanding is what matters.

## The Differences Between the Sites

| | Joel's | Mine |
|---|---|---|
| **Leads with** | Animated stats (scrobble count, artist count) | Personal narrative and curated album picks |
| **Tone** | Analytical, music-critic register | Conversational, memoir-style |
| **Pre-data history** | Era timelines tied to scrobble years | Separate "Foundation" section: classical → blues → big band → bop → funk → gospel → new jack swing → Jersey club → grunge/indie |
| **Audio** | Links to Apple Music (external) | 30-second previews inline via iTunes Search API |
| **Loved tracks** | Heartbeat timeline (hearts vs. plays) | Not included — different editorial choice |
| **Vinyl** | Plays-by-artist bars | Grid cards cross-referenced with scrobble data |
| **Accessibility** | ARIA labels, skip links, focus states, reduced motion | Semantic HTML, alt text — room to improve |
| **Design language** | Indie/emo amber, grain texture, dock nav | Dark minimal, serif/sans/mono mix, sticky nav |
| **Now playing** | Fixed widget | Inline in hero, detaches to corner on scroll |

Joel's site is more technically polished in some areas — he has accessibility features I should add, his animations are more considered, his "people not algorithms" framing is stronger as a thesis. My site is editorially richer — the Foundation section, the personal narrative voice, the inline audio, the breadth of the era timeline from Rimsky-Korsakov to DJ Tameil.

## The Transferable Lesson

The thing I keep coming back to is that none of this required me to write code from scratch. What it required was:

1. **Knowing what exists.** D3 streamgraphs, intersection observers, iTunes Search API, GitHub Pages CNAME routing, OpenGraph meta tags. You don't need to know how to implement these from memory. You need to know they exist and roughly what they do.

2. **Having a vision.** I like music. I had opinions about what mattered (the Foundation narrative, inline audio, leading with taste over data). Without that vision the AI builds something generic. The Pudding reference, the "no negation" rule, "stop with the orphans" — those are editorial directions that shaped a better outcome than "build me a music visualization."

3. **Knowing when something is wrong.** The Range Index section "tells me nothing." The decades section "undersells." The play buttons "don't play any music." P.V.A. shouldn't be the most obscure artist. Each of those observations directed a fix. The ability to evaluate output is the skill.

4. **Taste as architecture.** The order of sections, the font pairing, which albums go in which era, whether the copy uses negation, whether the quote is in first or second person — these are design decisions that compound. They're also decisions an AI can't make for you because they require knowing what you want, which requires knowing who you are.

This isn't engineering. It's something adjacent — closer to creative direction or editorial architecture. But in the AI-assisted era, the line between "I built this" and "I directed the building of this" is less meaningful than it used to be. What matters is the quality of the direction.

I think this framework — material literacy plus editorial vision plus evaluative judgment — applies to anything you'd build with AI assistance. Not just music sites. The music site just made it obvious because the taste was already there.

## The Architecture

For anyone curious about the actual structure:

```
docs/
  index.html          — semantic HTML, no framework
  style.css            — hand-written CSS, dark theme, responsive
  app.js               — vanilla JS, D3.js for charts, iTunes API for audio
  viz_data.json         — all data: yearly artists, tracks, genres, vinyl, eras, albums
  og-image.png         — social sharing card
  manifest.json        — PWA manifest
  CNAME               — custom domain routing

Python pipeline (Joel's toolkit + my additions):
  lastfm_client.py     — Last.fm API wrapper
  lastfm_stats.py      — CLI for pulling scrobble data
  discogs_client.py    — Discogs collection fetcher (my addition)
  context_generator.py — genre classification, cross-referencing

External APIs (called client-side):
  Last.fm              — live "last scrobble" widget
  iTunes Search        — 30-second audio previews on click
  Deezer               — album cover art (build-time only)
  Google Fonts         — Instrument Serif/Sans, JetBrains Mono
  D3.js CDN            — visualization library
```

No build step. No bundler. No framework. Just files on GitHub Pages.
