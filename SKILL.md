---
name: lastfm-context
description: >
  Fetch and format Last.fm listening data for use as creative context in other
  skills or for standalone stats exploration. Triggers on "listening context",
  "what have I been listening to", "my Last.fm", "music context", "listening data",
  "scrobble", "now playing", "genre profile", "listening snapshot", "music stats",
  "what am I listening to", "pull my listening data", "inject listening context",
  "music references", or any request that would benefit from knowing the user's
  current listening patterns — including script writing, visual direction planning,
  brand voice enrichment, or content ideation where musical references add texture.
  Also use when the user asks to explore their listening history, compare periods,
  deep-dive on an artist, or understand their genre/mood profile. If the user is
  working on a HEHT script or visual direction doc and you think a music reference
  would land well, proactively offer to pull listening context.
---

# Last.fm Listening Context

Pull the user's Last.fm listening data and format it for creative use across
other skills, or for standalone exploration and analysis.

## Setup

This skill requires two environment variables:
- `LASTFM_API_KEY` — Get one at https://www.last.fm/api/account/create
- `LASTFM_USER` — The user's Last.fm username

Store these in a `.env` file in the project root or export them in your shell.

## Architecture

Three modules, each independently useful:

1. **`lastfm_client.py`** — Thin API wrapper. All Last.fm endpoints relevant
   to user data. No opinion on formatting.
2. **`context_generator.py`** — Transforms raw API data into formatted text
   blocks: listening snapshots, genre profiles, artist deep dives, and compact
   context blocks for skill injection.
3. **`lastfm_stats.py`** — CLI entry point. Run standalone for exploration or
   pipe output into other tools.

## Commands

### Quick Reference

| Command | What it does | When to use |
|---------|-------------|-------------|
| `snapshot` | Top artists, albums, tracks for a period | General "what am I listening to" |
| `genres` | Weighted genre/mood profile from artist tags | Visual direction mood-mapping, rig context |
| `recent` | Last N scrobbles with timestamps | "What did I listen to today/yesterday" |
| `artist "Name"` | Deep dive: tags, similar artists, bio, your playcount | Exploring an artist for references |
| `context` | Compact XML-style block for injecting into other skills | Script writing, visual direction |
| `evolution` | Compare top artists across 7d/1m/3m/12m | Identifying creative energy shifts |
| `profile` | Account stats: total scrobbles, unique artists | Overview / dashboard data |
| `now` | Currently playing track | Quick check |

### Usage Examples

```bash
# Full snapshot of the past week
./lastfm_stats.py snapshot --period 7day --limit 15

# Genre profile from last month's listening
./lastfm_stats.py genres --period 1month

# Compact context block for skill injection
./lastfm_stats.py context --period 7day

# Deep dive on a specific artist
./lastfm_stats.py artist "American Football"

# Listening evolution across time periods
./lastfm_stats.py evolution
```

## Integration with Other Skills

### Script Writer (HEHT)

Before drafting a script, generate a context block:

```bash
./lastfm_stats.py context --period 7day
```

Paste the `<listening_context>` block into the script writing session. The
script writer can then:
- Draw natural music references from current heavy rotation
- Suggest analogies grounded in what the user is actually listening to
- Keep references feeling lived-in rather than curated

### Visual Direction

The genre profile maps listening mood to visual energy:

```bash
./lastfm_stats.py genres --period 7day
```

Use the dominant genres to inform pacing and visual treatment suggestions:
- Post-rock, ambient, shoegaze → slower pacing, longer holds, more negative space
- Post-hardcore, emo, punk → tighter cuts, more kinetic energy, dynamic transitions
- Indie rock, lo-fi → medium pacing, warm treatment, textural overlays

### Guitar Rig Context

Cross-reference listening patterns with signal chain design:

```bash
./lastfm_stats.py snapshot --period 7day
```

Map heavy-rotation artists to tonal characteristics and suggest which of the
user's chains best approximate those sounds, or flag tonal gaps.

### Brand Expression (Bravery Media / 11ty site)

The `snapshot` and `now` commands can feed a "currently influenced by" widget:

```bash
./lastfm_stats.py snapshot --period 7day --limit 5
```

Format the output with the user's visual design system (amber/charcoal palette,
considered typography) for a tasteful listening widget.

## Programmatic Use

Import directly in Python for custom integrations:

```python
from lastfm_client import LastFMClient
from context_generator import ContextGenerator

client = LastFMClient(api_key="...", username="...")
gen = ContextGenerator(client)

# Get a compact block for another tool
context = gen.skill_context_block(period="7day")

# Get genre weights for mood-mapping
genres = gen.genre_profile(period="1month")

# Deep dive for reference material
artist = gen.artist_deep_dive("Title Fight")
```

## Data Notes

- **Rate limits:** Last.fm doesn't publish exact limits but recommends not
  making continuous rapid calls. The client makes one request per method call.
  The `genres` command makes N+1 calls (1 for top artists, N for each artist's
  tags) — keep `--artists` reasonable (15-20 max).
- **Period values:** `overall`, `7day`, `1month`, `3month`, `6month`, `12month`
- **No auth required** for read-only endpoints. The API key alone is sufficient.
- **Weekly charts** use UNIX timestamps for custom date ranges via the
  `get_weekly_*` methods on the client.
- **Tag quality varies.** Last.fm tags are community-generated and can be messy.
  The genre profile weights by playcount to surface signal over noise.
