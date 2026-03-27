"""
Context generator for Last.fm data.

Produces structured text blocks that can be injected into other skills
(script writer, visual direction, brand voice) as creative context.

Each generator returns a plain-text block suitable for pasting into
a system prompt, skill context section, or Notion page.
"""

from datetime import datetime, timezone
from typing import Optional

from lastfm_client import LastFMClient
from listening_bio import (
    annotate_artist, annotate_album, relationship_summary,
    get_artist_context, get_era
)


def _fmt_playcount(count) -> str:
    """Format a playcount as a readable string."""
    n = int(count)
    if n >= 1000:
        return f"{n:,}"
    return str(n)


def _period_label(period: str) -> str:
    labels = {
        "7day": "past 7 days",
        "1month": "past month",
        "3month": "past 3 months",
        "6month": "past 6 months",
        "12month": "past year",
        "overall": "all time",
    }
    return labels.get(period, period)


class ContextGenerator:
    """Generate context blocks from Last.fm data for skill injection."""

    def __init__(self, client: LastFMClient):
        self.client = client

    def listening_snapshot(self, period: str = "7day", artist_limit: int = 10,
                           track_limit: int = 10, album_limit: int = 10) -> str:
        """
        Full listening snapshot: top artists, tracks, albums for a period.
        This is the primary context block for injecting into other skills.
        """
        artists = self.client.get_top_artists(period=period, limit=artist_limit)
        tracks = self.client.get_top_tracks(period=period, limit=track_limit)
        albums = self.client.get_top_albums(period=period, limit=album_limit)
        now = self.client.get_now_playing()

        lines = []
        lines.append(f"## Listening Context ({_period_label(period)})")
        lines.append(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
        lines.append("")

        if now:
            artist_name = now.get("artist", {}).get("#text", "Unknown")
            track_name = now.get("name", "Unknown")
            lines.append(f"**Now playing:** {artist_name} — {track_name}")
            lines.append("")

        if artists:
            lines.append(f"### Top Artists ({_period_label(period)})")
            for i, a in enumerate(artists, 1):
                lines.append(f"{i}. {a['name']} ({_fmt_playcount(a['playcount'])} plays)")
            lines.append("")

        if albums:
            lines.append(f"### Top Albums ({_period_label(period)})")
            for i, a in enumerate(albums, 1):
                artist = a.get("artist", {}).get("name", "Unknown")
                lines.append(f"{i}. {artist} — {a['name']} ({_fmt_playcount(a['playcount'])} plays)")
            lines.append("")

        if tracks:
            lines.append(f"### Top Tracks ({_period_label(period)})")
            for i, t in enumerate(tracks, 1):
                artist = t.get("artist", {}).get("name", "Unknown")
                lines.append(f"{i}. {artist} — {t['name']} ({_fmt_playcount(t['playcount'])} plays)")
            lines.append("")

        return "\n".join(lines)

    def annotated_snapshot(self, period: str = "7day", limit: int = 15) -> str:
        """
        Listening snapshot with biographical annotations on each artist.
        Shows the relationship type, era, and any core memories alongside
        the playcount data. Best for exploration and deep-dive sessions.
        """
        artists = self.client.get_top_artists(period=period, limit=limit)
        albums = self.client.get_top_albums(period=period, limit=10)

        lines = []
        lines.append(f"## Annotated Listening Snapshot ({_period_label(period)})")
        lines.append("")

        if artists:
            lines.append("### Artists")
            for i, a in enumerate(artists, 1):
                name = a['name']
                plays = _fmt_playcount(a['playcount'])
                annotation = annotate_artist(name)
                if annotation:
                    lines.append(f"{i}. **{name}** ({plays} plays)")
                    lines.append(f"   {annotation}")
                else:
                    lines.append(f"{i}. {name} ({plays} plays) — no biographical data")
            lines.append("")

        if albums:
            lines.append("### Albums")
            for i, a in enumerate(albums, 1):
                artist = a.get("artist", {}).get("name", "Unknown")
                album_name = a['name']
                plays = _fmt_playcount(a['playcount'])
                annotation = annotate_album(artist, album_name)
                if annotation:
                    lines.append(f"{i}. **{artist} — {album_name}** ({plays} plays)")
                    lines.append(f"   {annotation}")
                else:
                    lines.append(f"{i}. {artist} — {album_name} ({plays} plays)")
            lines.append("")

        return "\n".join(lines)

    def genre_profile(self, period: str = "7day", artist_limit: int = 15) -> str:
        """
        Build a genre/mood profile from the top artists' tags.
        Useful for visual direction mood-mapping and rig context.
        """
        artists = self.client.get_top_artists(period=period, limit=artist_limit)
        tag_weights = {}

        for a in artists:
            playcount = int(a.get("playcount", 1))
            try:
                tags = self.client.get_artist_tags(a["name"])[:5]
                for tag in tags:
                    name = tag["name"].lower()
                    count = int(tag.get("count", 50))
                    weight = playcount * (count / 100)
                    tag_weights[name] = tag_weights.get(name, 0) + weight
            except Exception:
                continue

        sorted_tags = sorted(tag_weights.items(), key=lambda x: x[1], reverse=True)[:20]

        lines = []
        lines.append(f"## Genre/Mood Profile ({_period_label(period)})")
        lines.append(f"Derived from top {artist_limit} artists' tags, weighted by playcount.")
        lines.append("")

        if sorted_tags:
            max_weight = sorted_tags[0][1] if sorted_tags else 1
            for tag, weight in sorted_tags:
                bar_len = int((weight / max_weight) * 20)
                bar = "█" * bar_len
                lines.append(f"  {tag:<25} {bar} ({weight:.0f})")
            lines.append("")

        return "\n".join(lines)

    def recent_activity(self, limit: int = 20) -> str:
        """Recent scrobble history — useful for 'what have I been listening to today' queries."""
        tracks = self.client.get_recent_tracks(limit=limit)

        lines = []
        lines.append("## Recent Scrobbles")
        lines.append("")

        for t in tracks:
            artist = t.get("artist", {}).get("#text", "Unknown")
            name = t.get("name", "Unknown")
            album = t.get("album", {}).get("#text", "")
            attr = t.get("@attr", {})
            date_info = t.get("date", {})

            if attr.get("nowplaying") == "true":
                timestamp = "▶ NOW"
            elif date_info:
                timestamp = date_info.get("#text", "")
            else:
                timestamp = ""

            album_str = f" [{album}]" if album else ""
            lines.append(f"  {timestamp:<22} {artist} — {name}{album_str}")

        lines.append("")
        return "\n".join(lines)

    def artist_deep_dive(self, artist_name: str) -> str:
        """Deep context on a specific artist: tags, similar, user playcount."""
        info = self.client.get_artist_info(artist_name)
        similar = self.client.get_similar_artists(artist_name, limit=8)
        tags = info.get("tags", {}).get("tag", [])
        stats = info.get("stats", {})

        lines = []
        lines.append(f"## Artist Deep Dive: {info.get('name', artist_name)}")
        lines.append("")

        user_playcount = stats.get("userplaycount", "0")
        lines.append(f"Your plays: {_fmt_playcount(user_playcount)}")
        lines.append(f"Global listeners: {_fmt_playcount(stats.get('listeners', '0'))}")
        lines.append("")

        if tags:
            tag_str = ", ".join(t["name"] for t in tags[:8])
            lines.append(f"Tags: {tag_str}")
            lines.append("")

        bio = info.get("bio", {}).get("summary", "")
        if bio:
            # Strip HTML link that Last.fm appends
            bio = bio.split('<a href="')[0].strip()
            if bio:
                lines.append(f"Bio: {bio[:300]}{'...' if len(bio) > 300 else ''}")
                lines.append("")

        if similar:
            lines.append("Similar artists:")
            for s in similar:
                match = float(s.get("match", 0))
                lines.append(f"  - {s['name']} (match: {match:.0%})")
            lines.append("")

        return "\n".join(lines)

    def skill_context_block(self, period: str = "7day", compact: bool = True,
                             include_bio: bool = True) -> str:
        """
        Generate a compact context block specifically designed for injection
        into other skills (script writer, visual direction).

        This is the workhorse output — a single block that gives another
        skill enough listening context to make relevant references without
        overwhelming the prompt.

        When include_bio=True, annotates artists with biographical relationship
        tags (formational, sustained, returning, discovery) and appends the
        listening biography summary.
        """
        artists = self.client.get_top_artists(period=period, limit=8)
        tracks = self.client.get_top_tracks(period=period, limit=5)
        now = self.client.get_now_playing()

        lines = []
        lines.append(f"<listening_context period=\"{_period_label(period)}\">")

        if now:
            artist_name = now.get("artist", {}).get("#text", "Unknown")
            track_name = now.get("name", "Unknown")
            now_line = f"Now playing: {artist_name} — {track_name}"
            if include_bio:
                annotation = annotate_artist(artist_name)
                if annotation:
                    now_line += f"  ({annotation})"
            lines.append(now_line)

        if artists:
            artist_parts = []
            for a in artists:
                part = f"{a['name']} ({a['playcount']})"
                if include_bio:
                    bio = get_artist_context(a["name"])
                    if bio:
                        part += f" [{bio.relationship}]"
                artist_parts.append(part)
            lines.append(f"Top artists: {', '.join(artist_parts)}")

        if tracks:
            track_strs = [f"{t['artist']['name']} — {t['name']}" for t in tracks]
            lines.append(f"Heavy rotation: {'; '.join(track_strs)}")

        # Grab genre tags for the top 5 artists
        genre_counts = {}
        for a in artists[:5]:
            try:
                tags = self.client.get_artist_tags(a["name"])[:3]
                for tag in tags:
                    name = tag["name"].lower()
                    genre_counts[name] = genre_counts.get(name, 0) + 1
            except Exception:
                continue

        if genre_counts:
            top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:8]
            genre_str = ", ".join(g[0] for g in top_genres)
            lines.append(f"Dominant genres: {genre_str}")

        lines.append("</listening_context>")

        if include_bio:
            lines.append("")
            lines.append(relationship_summary())

        return "\n".join(lines)

    def comparison_snapshot(self) -> str:
        """
        Compare listening across time periods to show drift/evolution.
        Useful for identifying creative energy shifts.
        """
        periods = ["7day", "1month", "3month", "12month"]

        lines = []
        lines.append("## Listening Evolution")
        lines.append("")

        for period in periods:
            artists = self.client.get_top_artists(period=period, limit=5)
            if artists:
                names = [a["name"] for a in artists]
                lines.append(f"**{_period_label(period)}:** {', '.join(names)}")

        lines.append("")
        lines.append("Look for: artists appearing in 7day but not 3month+ = new discoveries.")
        lines.append("Artists in 12month but not 7day = comfort rotation you've moved away from.")
        lines.append("")

        return "\n".join(lines)
