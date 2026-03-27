#!/usr/bin/env python3
"""
lastfm-stats: CLI for exploring Last.fm listening data and generating
context blocks for creative skills.

Usage:
    ./lastfm_stats.py snapshot [--period 7day] [--limit 10]
    ./lastfm_stats.py genres [--period 7day] [--artists 15]
    ./lastfm_stats.py recent [--limit 20]
    ./lastfm_stats.py artist "Artist Name"
    ./lastfm_stats.py context [--period 7day]
    ./lastfm_stats.py evolution
    ./lastfm_stats.py profile
    ./lastfm_stats.py now

Environment:
    LASTFM_API_KEY  - Your Last.fm API key (required)
    LASTFM_USER     - Your Last.fm username (required)
"""

import argparse
import json
import os
import sys

# Add the script's directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lastfm_client import LastFMClient, VALID_PERIODS
from context_generator import ContextGenerator


def get_client() -> LastFMClient:
    api_key = os.environ.get("LASTFM_API_KEY")
    username = os.environ.get("LASTFM_USER")

    if not api_key:
        print("Error: LASTFM_API_KEY environment variable not set.", file=sys.stderr)
        print("Get one at https://www.last.fm/api/account/create", file=sys.stderr)
        sys.exit(1)

    if not username:
        print("Error: LASTFM_USER environment variable not set.", file=sys.stderr)
        sys.exit(1)

    return LastFMClient(api_key, username)


def cmd_snapshot(args):
    """Full listening snapshot for a time period."""
    client = get_client()
    gen = ContextGenerator(client)
    print(gen.listening_snapshot(
        period=args.period,
        artist_limit=args.limit,
        track_limit=args.limit,
        album_limit=args.limit,
    ))


def cmd_genres(args):
    """Genre/mood profile weighted by listening."""
    client = get_client()
    gen = ContextGenerator(client)
    print(gen.genre_profile(period=args.period, artist_limit=args.artists))


def cmd_annotated(args):
    """Annotated snapshot with biographical context."""
    client = get_client()
    gen = ContextGenerator(client)
    print(gen.annotated_snapshot(period=args.period, limit=args.limit))


def cmd_bio(args):
    """Print the listening biography summary block."""
    from listening_bio import relationship_summary
    print(relationship_summary())


def cmd_recent(args):
    """Recent scrobble history."""
    client = get_client()
    gen = ContextGenerator(client)
    print(gen.recent_activity(limit=args.limit))


def cmd_artist(args):
    """Deep dive on a specific artist."""
    client = get_client()
    gen = ContextGenerator(client)
    print(gen.artist_deep_dive(args.name))


def cmd_context(args):
    """Compact context block for skill injection."""
    client = get_client()
    gen = ContextGenerator(client)
    print(gen.skill_context_block(period=args.period))


def cmd_evolution(args):
    """Compare listening across time periods."""
    client = get_client()
    gen = ContextGenerator(client)
    print(gen.comparison_snapshot())


def cmd_profile(args):
    """User profile summary."""
    client = get_client()
    info = client.get_user_info()
    print(f"User: {info.get('name', 'Unknown')}")
    print(f"Real name: {info.get('realname', '')}")
    print(f"Total scrobbles: {int(info.get('playcount', 0)):,}")
    print(f"Registered: {info.get('registered', {}).get('#text', 'Unknown')}")
    print(f"URL: {info.get('url', '')}")

    # Quick counts
    artists = client.get_library_artists(limit=1)
    total_artists = artists.get("@attr", {}).get("total", "?")
    print(f"Unique artists: {total_artists}")


def cmd_now(args):
    """What's playing right now."""
    client = get_client()
    track = client.get_now_playing()
    if track:
        artist = track.get("artist", {}).get("#text", "Unknown")
        name = track.get("name", "Unknown")
        album = track.get("album", {}).get("#text", "")
        print(f"▶ {artist} — {name}")
        if album:
            print(f"  Album: {album}")
    else:
        # Show most recent instead
        recent = client.get_recent_tracks(limit=1)
        if recent:
            t = recent[0]
            artist = t.get("artist", {}).get("#text", "Unknown")
            name = t.get("name", "Unknown")
            date = t.get("date", {}).get("#text", "")
            print(f"Nothing playing. Last scrobble:")
            print(f"  {artist} — {name} ({date})")
        else:
            print("Nothing playing and no recent scrobbles found.")


def cmd_raw(args):
    """Raw JSON output for a method — useful for debugging/exploration."""
    client = get_client()
    params = {"user": client.username}
    if args.period:
        params["period"] = args.period
    if args.artist_name:
        params["artist"] = args.artist_name
    params["limit"] = args.limit

    data = client._request(args.method, params)
    print(json.dumps(data, indent=2))


def cmd_year(args):
    """Top artists, albums, and tracks for a specific year."""
    client = get_client()
    year = args.year

    artists = client.get_year_top_artists(year, limit=args.limit)
    albums = client.get_year_top_albums(year, limit=args.limit)

    # Track charts can fail on full-year ranges (server-side limit)
    tracks = []
    try:
        tracks = client.get_year_top_tracks(year, limit=args.limit)
    except Exception:
        pass

    total = sum(a['playcount'] for a in client.get_year_top_artists(year, limit=9999)) if artists else 0

    print(f"## {year} — {total:,} total scrobbles")
    print()

    if artists:
        print(f"### Top Artists")
        for i, a in enumerate(artists, 1):
            annotation = ""
            try:
                from listening_bio import annotate_artist
                annotation = annotate_artist(a['name'])
                if annotation:
                    annotation = f"  — {annotation}"
            except Exception:
                pass
            print(f"{i:>3}. {a['name']:<35} {a['playcount']:>5} plays{annotation}")
        print()

    if albums:
        print(f"### Top Albums")
        for i, a in enumerate(albums, 1):
            artist = a.get('artist', {}).get('#text', 'Unknown')
            print(f"{i:>3}. {artist} — {a['name']:<30} {a['playcount']:>5} plays")
        print()

    if tracks:
        print(f"### Top Tracks")
        for i, t in enumerate(tracks, 1):
            artist = t.get('artist', {}).get('#text', 'Unknown')
            print(f"{i:>3}. {artist} — {t['name']:<30} {t['playcount']:>5} plays")
        print()


def cmd_years(args):
    """Summary of all years with top artist per year."""
    client = get_client()
    boundaries = client.get_year_boundaries()

    import time
    for year in sorted(boundaries.keys()):
        r = boundaries[year]
        artists = client.get_weekly_artist_chart(from_ts=r['from'], to_ts=r['to'])
        for a in artists:
            a['_plays'] = int(a.get('playcount', 0))
        artists.sort(key=lambda x: x['_plays'], reverse=True)

        total = sum(a['_plays'] for a in artists)
        top3 = artists[:3]
        names = [f"{a['name']} ({a['_plays']})" for a in top3]
        print(f"{year} | {total:>6} scrobbles | {' · '.join(names)}")
        time.sleep(0.2)


def main():
    parser = argparse.ArgumentParser(
        description="Last.fm listening data explorer and context generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    sub = parser.add_subparsers(dest="command", help="Command to run")

    # snapshot
    p = sub.add_parser("snapshot", help="Full listening snapshot")
    p.add_argument("--period", default="7day", choices=VALID_PERIODS)
    p.add_argument("--limit", type=int, default=10)
    p.set_defaults(func=cmd_snapshot)

    # genres
    p = sub.add_parser("genres", help="Genre/mood profile")
    p.add_argument("--period", default="7day", choices=VALID_PERIODS)
    p.add_argument("--artists", type=int, default=15)
    p.set_defaults(func=cmd_genres)

    # annotated
    p = sub.add_parser("annotated", help="Snapshot with biographical annotations")
    p.add_argument("--period", default="7day", choices=VALID_PERIODS)
    p.add_argument("--limit", type=int, default=15)
    p.set_defaults(func=cmd_annotated)

    # bio
    p = sub.add_parser("bio", help="Listening biography summary block")
    p.set_defaults(func=cmd_bio)

    # recent
    p = sub.add_parser("recent", help="Recent scrobble history")
    p.add_argument("--limit", type=int, default=20)
    p.set_defaults(func=cmd_recent)

    # artist
    p = sub.add_parser("artist", help="Deep dive on an artist")
    p.add_argument("name", help="Artist name")
    p.set_defaults(func=cmd_artist)

    # context
    p = sub.add_parser("context", help="Compact context block for skills")
    p.add_argument("--period", default="7day", choices=VALID_PERIODS)
    p.set_defaults(func=cmd_context)

    # evolution
    p = sub.add_parser("evolution", help="Listening evolution across periods")
    p.set_defaults(func=cmd_evolution)

    # profile
    p = sub.add_parser("profile", help="User profile summary")
    p.set_defaults(func=cmd_profile)

    # now
    p = sub.add_parser("now", help="Currently playing track")
    p.set_defaults(func=cmd_now)

    # year
    p = sub.add_parser("year", help="Top artists/albums/tracks for a specific year")
    p.add_argument("year", type=int, help="Year to explore (e.g. 2005)")
    p.add_argument("--limit", type=int, default=15)
    p.set_defaults(func=cmd_year)

    # years
    p = sub.add_parser("years", help="Summary of all years")
    p.set_defaults(func=cmd_years)

    # raw (for debugging)
    p = sub.add_parser("raw", help="Raw API JSON output")
    p.add_argument("method", help="API method (e.g. user.gettopartists)")
    p.add_argument("--period", default=None)
    p.add_argument("--limit", type=int, default=10)
    p.add_argument("--artist-name", default=None)
    p.set_defaults(func=cmd_raw)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
