# Last.fm Listening Autobiography

A toolkit for exploring your Last.fm listening history, cross-referencing it with your Discogs vinyl collection, and building a biographical context layer that turns scrobble data into actual stories.

Built in conversation between Joel Goodman and Claude. The code is generic — the stories are yours.

## What's in here

```
lastfm_client.py         # Last.fm API wrapper — all user-relevant endpoints
context_generator.py     # Formats data into injectable context blocks
lastfm_stats.py          # CLI entry point — 13 commands
listening_bio.py         # Biographical layer (YOUR stories go here)
SKILL.md                 # Claude skill definition for integration
bio-interview-questions-template.md  # Question template for the biographical session
```

## Quick start

1. Get a Last.fm API key: https://www.last.fm/api/account/create
2. Set environment variables:
   ```
   export LASTFM_API_KEY="your_key_here"
   export LASTFM_USER="your_username"
   ```
3. Create a virtual environment and install requests:
   ```
   python3 -m venv .venv
   .venv/bin/pip install requests
   ```
4. Run it:
   ```
   .venv/bin/python lastfm_stats.py profile
   .venv/bin/python lastfm_stats.py snapshot --period 7day
   .venv/bin/python lastfm_stats.py years
   .venv/bin/python lastfm_stats.py year 2015
   .venv/bin/python lastfm_stats.py genres --period 1month
   .venv/bin/python lastfm_stats.py evolution
   ```

## The process

### Phase 1: Let the data talk

Run the commands. Look at your year-by-year breakdown (`years`), your all-time
top 50 (`snapshot --period overall --limit 50`), and the genre evolution
(`genres` across different periods). The data will surface patterns you didn't
know about — volume spikes and cliffs, artists that appeared and vanished,
genre drifts.

### Phase 2: Ask the questions

Use the interview template (`bio-interview-questions-template.md`) or better
yet, have Claude generate custom questions from YOUR data. The pattern is:

1. Share your `years` output and `snapshot --period overall` output with Claude
2. Ask Claude to identify unexplained patterns (volume drops, surprise artists,
   genre pivots)
3. Claude generates questions specific to your data
4. You answer conversationally — every correction and story gets logged

### Phase 3: Build the biographical layer

Edit `listening_bio.py` to add your own eras, artist bios, album stories, key
people, and live shows. The data structures are simple:

- **Eras** — life chapters with dates, locations, and sonic palettes
- **Artist bios** — relationship type (formational/sustained/returning/discovery),
  era connection, sonic role, personal story
- **Album bios** — same structure for specific albums
- **Pipeline people** — who introduced you to what
- **Live shows** — experiences that shaped the relationship

### Phase 4: Cross-reference with Discogs (optional)

If you have a Discogs collection, the vinyl cross-reference reveals the
"blind spot" — artists you care about deeply but whose scrobble counts
underrepresent the actual relationship because you listen on vinyl.

```python
# Discogs collection is public by default — no auth needed for read
import requests
resp = requests.get(
    'https://api.discogs.com/users/YOUR_USERNAME/collection/folders/0/releases?per_page=100',
    headers={'User-Agent': 'YourApp/1.0'}
)
```

### Phase 5: Build the timeline (optional)

The toolkit includes a timeline web page generator that pulls album art from
the Last.fm API and displays your listening autobiography as a visual narrative.

## CLI commands

| Command | What it does |
|---------|-------------|
| `profile` | Account stats |
| `now` | Currently playing |
| `snapshot` | Top artists/albums/tracks for a period |
| `recent` | Last N scrobbles |
| `genres` | Weighted genre/mood profile |
| `artist "Name"` | Deep dive on one artist |
| `context` | Compact block for skill injection |
| `annotated` | Snapshot with biographical annotations |
| `bio` | Listening biography summary |
| `evolution` | Compare across time periods |
| `year 2015` | Top artists/albums for a specific year |
| `years` | Summary of all years |
| `raw` | Raw API JSON output |

## Integration with Claude skills

The `context` command generates a `<listening_context>` block designed to be
injected into other Claude skills. If you use Claude for creative work —
writing, visual direction, content strategy — the listening context gives
downstream skills awareness of your current sonic palette and biographical
relationship to it.

## Attribution

This project uses the Last.fm API for listening data and the Discogs API for
collection data. Per the Last.fm API Terms of Service, any public-facing use
must credit Last.fm and link back to the appropriate pages.

Album art is served from Last.fm's CDN via their API and is used under their
non-commercial license terms.
