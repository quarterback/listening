# Listening Biography: Interview Questions (Template)

This template helps you build a biographical context layer from your Last.fm
data. The process: run the data commands first, then use these questions as
starting points. Better yet, share your data output with Claude and ask it
to generate questions specific to YOUR patterns.

## Before you start

Run these commands and review the output:

```bash
./lastfm_stats.py profile
./lastfm_stats.py years
./lastfm_stats.py snapshot --period overall --limit 30
./lastfm_stats.py evolution
./lastfm_stats.py genres --period overall --artists 20
```

If you have a Discogs collection, pull that too and look for the gap between
what you scrobble and what you own on vinyl.

---

## The universal questions

These apply to anyone with a long listening history:

### Origins
1. What were you listening to before you started scrobbling? What was the
   gateway into your primary genre(s)?
2. Was there a specific person, event, or moment that opened the door?
3. Where were you living when your taste formed? Did geography matter?

### The data gaps
4. Look at your `years` output. Where are the volume spikes and cliffs?
   What was happening in your life during the extremes?
5. Are there years where the top artist is completely unexpected? What's
   the story?
6. Which artists appear in one year and never again? Which persist across
   a decade?

### The blind spots
7. Do you listen to music that doesn't get scrobbled? Vinyl, live shows,
   car listening without a phone connected?
8. Is there an artist you consider a favorite whose play count doesn't
   reflect the actual importance?
9. Are there genres or scenes you were part of that the data doesn't capture?

### Relationships
10. How did you discover your top 10 all-time artists? Can you trace each
    one to a specific person, place, or moment?
11. Have you seen any of your top artists live? Did the live experience
    change the relationship?
12. Are any of your top artists connected to specific life periods —
    a job, a city, a relationship, a difficult time?

### Evolution
13. Look at your `evolution` output. What changed between your 12-month
    and your 7-day top artists? Is the shift conscious or accidental?
14. Are there genres you've moved away from? Do you ever go back?
15. What's your comfort music — the stuff you return to when things are
    hard or uncertain?

### Taste identity
16. If someone looked at your top 50 all-time, what would they get wrong
    about you? What wouldn't they understand without context?
17. Is there a single album that defines you more than any other?
18. Do you have a "guilty pleasure" or a taste that surprises people who
    know your main genre(s)?

---

## How to use the answers

Every answer becomes an entry in `listening_bio.py`. The key data structures:

**Eras** — Name them after life chapters, not genres. "College in Ohio" not
"My indie phase." Include the location, the years, and what was happening.

**Artist bios** — Tag each with a relationship type:
- `formational` — you grew up on this, it's autobiography
- `sustained` — deep history, years of listening
- `returning` — re-engagement with something from your past
- `discovery` — newer enthusiasm, still earning its place
- `casual` — you like it but it's not core identity

**Pipeline people** — Name the humans who introduced you to music. The
pattern matters: taste built through human networks vs. algorithmic
discovery is a fundamentally different identity.

**Live shows** — Only the ones that mattered. The show that changed how
you heard a band, the one you'll never forget, the one tied to a
specific life moment.
