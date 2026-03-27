"""
Last.fm API client for fetching user listening data.

Designed as a composable module: use standalone for stats exploration,
or import into other tools to generate context blocks for skills
(script writer, visual direction, etc.).
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

import requests

API_BASE = "https://ws.audioscrobbler.com/2.0/"
USER_AGENT = "JoelGoodmanLastFM/1.0 (lastfm-plugin)"

VALID_PERIODS = ["overall", "7day", "1month", "3month", "6month", "12month"]


class LastFMClient:
    """Thin wrapper around the Last.fm API focused on user data retrieval."""

    def __init__(self, api_key: str, username: str):
        self.api_key = api_key
        self.username = username
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})

    def _request(self, method: str, params: Optional[dict] = None) -> dict:
        """Make a rate-limited request to the Last.fm API."""
        base_params = {
            "method": method,
            "api_key": self.api_key,
            "format": "json",
        }
        if params:
            base_params.update(params)

        resp = self.session.get(API_BASE, params=base_params)
        resp.raise_for_status()
        data = resp.json()

        if "error" in data:
            raise Exception(f"Last.fm API error {data['error']}: {data.get('message', 'Unknown error')}")

        return data

    # ── User info ──────────────────────────────────────────────

    def get_user_info(self) -> dict:
        """Get profile info: playcount, registered date, etc."""
        data = self._request("user.getinfo", {"user": self.username})
        return data.get("user", {})

    # ── Top charts (with period support) ──────────────────────

    def get_top_artists(self, period: str = "7day", limit: int = 25) -> list:
        """Top artists for a time period. period: overall|7day|1month|3month|6month|12month"""
        data = self._request("user.gettopartists", {
            "user": self.username, "period": period, "limit": limit
        })
        return data.get("topartists", {}).get("artist", [])

    def get_top_albums(self, period: str = "7day", limit: int = 25) -> list:
        """Top albums for a time period."""
        data = self._request("user.gettopalbums", {
            "user": self.username, "period": period, "limit": limit
        })
        return data.get("topalbums", {}).get("album", [])

    def get_top_tracks(self, period: str = "7day", limit: int = 25) -> list:
        """Top tracks for a time period."""
        data = self._request("user.gettoptracks", {
            "user": self.username, "period": period, "limit": limit
        })
        return data.get("toptracks", {}).get("track", [])

    def get_top_tags(self, limit: int = 50) -> list:
        """User's top tags (genres). No period filter available."""
        data = self._request("user.gettoptags", {
            "user": self.username, "limit": limit
        })
        return data.get("toptags", {}).get("tag", [])

    # ── Recent / now playing ──────────────────────────────────

    def get_recent_tracks(self, limit: int = 50) -> list:
        """Recent scrobbles. First item may have @attr.nowplaying=true."""
        data = self._request("user.getrecenttracks", {
            "user": self.username, "limit": limit
        })
        return data.get("recenttracks", {}).get("track", [])

    def get_now_playing(self) -> Optional[dict]:
        """Return the currently playing track, or None."""
        tracks = self.get_recent_tracks(limit=1)
        if tracks and isinstance(tracks, list):
            track = tracks[0]
            attr = track.get("@attr", {})
            if attr.get("nowplaying") == "true":
                return track
        return None

    # ── Weekly charts (custom date ranges) ────────────────────

    def get_weekly_chart_list(self) -> list:
        """Get available weekly chart date ranges (from/to timestamps)."""
        data = self._request("user.getweeklychartlist", {"user": self.username})
        return data.get("weeklychartlist", {}).get("chart", [])

    def get_weekly_artist_chart(self, from_ts: Optional[int] = None, to_ts: Optional[int] = None) -> list:
        """Weekly artist chart, optionally for a specific date range."""
        params = {"user": self.username}
        if from_ts:
            params["from"] = from_ts
        if to_ts:
            params["to"] = to_ts
        data = self._request("user.getweeklyartistchart", params)
        return data.get("weeklyartistchart", {}).get("artist", [])

    def get_weekly_album_chart(self, from_ts: Optional[int] = None, to_ts: Optional[int] = None) -> list:
        """Weekly album chart, optionally for a specific date range."""
        params = {"user": self.username}
        if from_ts:
            params["from"] = from_ts
        if to_ts:
            params["to"] = to_ts
        data = self._request("user.getweeklyalbumchart", params)
        return data.get("weeklyalbumchart", {}).get("album", [])

    def get_weekly_track_chart(self, from_ts: Optional[int] = None, to_ts: Optional[int] = None) -> list:
        """Weekly track chart, optionally for a specific date range."""
        params = {"user": self.username}
        if from_ts:
            params["from"] = from_ts
        if to_ts:
            params["to"] = to_ts
        data = self._request("user.getweeklytrackchart", params)
        return data.get("weeklytrackchart", {}).get("track", [])

    # ── Loved tracks ──────────────────────────────────────────

    def get_loved_tracks(self, limit: int = 50) -> list:
        """Tracks the user has loved/hearted."""
        data = self._request("user.getlovedtracks", {
            "user": self.username, "limit": limit
        })
        return data.get("lovedtracks", {}).get("track", [])

    # ── Artist enrichment ─────────────────────────────────────

    def get_artist_info(self, artist: str) -> dict:
        """Get detailed info + tags for an artist."""
        data = self._request("artist.getinfo", {
            "artist": artist, "username": self.username
        })
        return data.get("artist", {})

    def get_artist_tags(self, artist: str) -> list:
        """Get top tags for an artist (genre/mood data)."""
        data = self._request("artist.gettoptags", {"artist": artist})
        return data.get("toptags", {}).get("tag", [])

    def get_similar_artists(self, artist: str, limit: int = 10) -> list:
        """Get similar artists."""
        data = self._request("artist.getsimilar", {
            "artist": artist, "limit": limit
        })
        return data.get("similarartists", {}).get("artist", [])

    # ── Library (full history) ────────────────────────────────

    def get_library_artists(self, limit: int = 50, page: int = 1) -> dict:
        """Full library of artists with playcounts. Returns dict with artists + pagination."""
        data = self._request("library.getartists", {
            "user": self.username, "limit": limit, "page": page
        })
        return data.get("artists", {})

    # ── Year-by-year via weekly chart stitching ───────────────

    def get_year_boundaries(self) -> dict:
        """Build a dict of {year: {'from': ts, 'to': ts}} from weekly chart list."""
        from datetime import datetime as dt, timezone as tz
        charts = self.get_weekly_chart_list()
        year_ranges = {}
        for c in charts:
            year = dt.fromtimestamp(int(c['from']), tz=tz.utc).year
            if year not in year_ranges:
                year_ranges[year] = {'from': int(c['from']), 'to': int(c['to'])}
            year_ranges[year]['to'] = int(c['to'])
        return year_ranges

    def get_year_top_artists(self, year: int, limit: int = 25) -> list:
        """Top artists for a specific year via weekly chart stitching."""
        boundaries = self.get_year_boundaries()
        if year not in boundaries:
            return []
        r = boundaries[year]
        artists = self.get_weekly_artist_chart(from_ts=r['from'], to_ts=r['to'])
        for a in artists:
            a['playcount'] = int(a.get('playcount', 0))
        artists.sort(key=lambda x: x['playcount'], reverse=True)
        return artists[:limit]

    def get_year_top_albums(self, year: int, limit: int = 25) -> list:
        """Top albums for a specific year via weekly chart stitching."""
        boundaries = self.get_year_boundaries()
        if year not in boundaries:
            return []
        r = boundaries[year]
        albums = self.get_weekly_album_chart(from_ts=r['from'], to_ts=r['to'])
        for a in albums:
            a['playcount'] = int(a.get('playcount', 0))
        albums.sort(key=lambda x: x['playcount'], reverse=True)
        return albums[:limit]

    def get_year_top_tracks(self, year: int, limit: int = 25) -> list:
        """Top tracks for a specific year via weekly chart stitching."""
        boundaries = self.get_year_boundaries()
        if year not in boundaries:
            return []
        r = boundaries[year]
        tracks = self.get_weekly_track_chart(from_ts=r['from'], to_ts=r['to'])
        for t in tracks:
            t['playcount'] = int(t.get('playcount', 0))
        tracks.sort(key=lambda x: x['playcount'], reverse=True)
        return tracks[:limit]
