"""
Discogs collection client for cross-referencing vinyl/physical media
with Last.fm scrobble data.

Discogs collections are public by default — no auth needed for read access.
Just needs a user agent string per their API terms.
"""

import re
import time
from typing import Optional

import requests

API_BASE = "https://api.discogs.com"
USER_AGENT = "ListeningAutobiography/1.0"


class DiscogsClient:
    """Read-only client for a Discogs user's collection."""

    def __init__(self, username: str):
        self.username = username
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})

    def _clean_artist_name(self, name: str) -> str:
        """Strip Discogs disambiguation suffixes like 'Young Thug (2)'."""
        return re.sub(r"\s*\(\d+\)\s*$", "", name).strip()

    def get_collection(self, folder_id: int = 0) -> list:
        """
        Fetch the full collection, paginating automatically.
        folder_id=0 is the 'All' folder.
        Returns a list of release dicts with cleaned-up fields.
        """
        releases = []
        page = 1
        while True:
            url = f"{API_BASE}/users/{self.username}/collection/folders/{folder_id}/releases"
            resp = self.session.get(url, params={"per_page": 100, "page": page})
            resp.raise_for_status()
            data = resp.json()

            for r in data.get("releases", []):
                bi = r.get("basic_information", {})
                releases.append({
                    "id": bi.get("id"),
                    "title": bi.get("title", ""),
                    "artists": [self._clean_artist_name(a["name"]) for a in bi.get("artists", [])],
                    "artist_str": ", ".join(
                        self._clean_artist_name(a["name"]) for a in bi.get("artists", [])
                    ),
                    "year": bi.get("year", 0),
                    "formats": [f["name"] for f in bi.get("formats", [])],
                    "genres": bi.get("genres", []),
                    "styles": bi.get("styles", []),
                    "date_added": r.get("date_added", ""),
                    "cover_image": bi.get("cover_image", ""),
                    "thumb": bi.get("thumb", ""),
                })

            pagination = data.get("pagination", {})
            if page >= pagination.get("pages", 1):
                break
            page += 1
            time.sleep(0.5)  # respect rate limits

        return releases

    def get_collection_artists(self) -> dict:
        """
        Build a dict of {artist_name: [list of releases]} from the collection.
        Useful for cross-referencing with Last.fm data.
        """
        releases = self.get_collection()
        artists = {}
        for r in releases:
            for artist in r["artists"]:
                if artist not in artists:
                    artists[artist] = []
                artists[artist].append({
                    "title": r["title"],
                    "year": r["year"],
                    "formats": r["formats"],
                    "genres": r["genres"],
                    "styles": r["styles"],
                })
        return artists

    def get_collection_summary(self) -> dict:
        """Quick stats about the collection."""
        releases = self.get_collection()
        formats = {}
        genres = {}
        artists = set()

        for r in releases:
            for f in r["formats"]:
                formats[f] = formats.get(f, 0) + 1
            for g in r["genres"]:
                genres[g] = genres.get(g, 0) + 1
            for a in r["artists"]:
                artists.add(a)

        return {
            "total_releases": len(releases),
            "unique_artists": len(artists),
            "formats": dict(sorted(formats.items(), key=lambda x: x[1], reverse=True)),
            "genres": dict(sorted(genres.items(), key=lambda x: x[1], reverse=True)),
        }
