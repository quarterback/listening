"""
Biographical listening context — TEMPLATE.

Copy this file and fill in your own eras, artist bios, album stories,
pipeline people, and live shows. The data structures are designed to
be built incrementally through conversation.

Start with 2-3 eras and a handful of artist bios. Add more as stories
surface. You don't need to fill everything in at once.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class EraMarker:
    era_id: str
    label: str
    years: str
    life_context: str
    sonic_palette: list[str] = field(default_factory=list)
    notes: Optional[str] = None


@dataclass
class ArtistBio:
    name: str
    relationship: str  # formational | sustained | discovery | returning | casual
    era_id: str
    story: Optional[str] = None
    sonic_role: Optional[str] = None


@dataclass
class AlbumBio:
    artist: str
    album: str
    relationship: str
    era_id: str
    story: Optional[str] = None
    sonic_role: Optional[str] = None


# ── Life Eras ──────────────────────────────────────────────────
# Name these after life chapters, not genres.

ERAS = {
    "example-era": EraMarker(
        era_id="example-era",
        label="Example era",
        years="2000-2005",
        life_context="What was happening in your life. Where you lived. "
                     "What you were doing for work or school.",
        sonic_palette=["genre1", "genre2"],
        notes="Any additional context about this period."
    ),
}


# ── Artist Biographical Entries ────────────────────────────────

ARTIST_BIOS = [
    # ArtistBio("Artist Name", "relationship_type", "era_id",
    #           sonic_role="What this artist represents sonically",
    #           story="The personal connection or story"),
]


# ── Album-Specific Entries ─────────────────────────────────────

ALBUM_BIOS = [
    # AlbumBio("Artist", "Album", "relationship_type", "era_id",
    #          story="Why this album matters",
    #          sonic_role="What it sounds like"),
]


# ── Live Show History ──────────────────────────────────────────

LIVE_SHOWS = [
    # {"artist": "Name", "venue": "Venue", "city": "City",
    #  "year": "2015", "notes": "Why it mattered"},
]


# ── Key People (music discovery pipeline) ──────────────────────

MUSIC_PIPELINE_PEOPLE = [
    # {"name": "Person", "context": "How you know them",
    #  "introduced": "What music they brought into your life"},
]


# ── Lookup helpers ─────────────────────────────────────────────

def _artist_bio_map():
    return {ab.name.lower(): ab for ab in ARTIST_BIOS}

def _album_bio_map():
    return {f"{ab.artist.lower()}::{ab.album.lower()}": ab for ab in ALBUM_BIOS}

def get_artist_context(artist_name):
    return _artist_bio_map().get(artist_name.lower())

def get_album_context(artist, album):
    return _album_bio_map().get(f"{artist.lower()}::{album.lower()}")

def get_era(era_id):
    return ERAS.get(era_id)

def annotate_artist(artist_name):
    bio = get_artist_context(artist_name)
    if not bio:
        return ""
    era = ERAS.get(bio.era_id)
    era_label = era.label if era else bio.era_id
    parts = [f"[{bio.relationship}]", f"era: {era_label}"]
    if bio.sonic_role:
        parts.append(bio.sonic_role)
    return " | ".join(parts)

def annotate_album(artist, album):
    bio = get_album_context(artist, album)
    if not bio:
        return ""
    era = ERAS.get(bio.era_id)
    era_label = era.label if era else bio.era_id
    parts = [f"[{bio.relationship}]", f"era: {era_label}"]
    if bio.story:
        parts.append(bio.story[:120])
    return " | ".join(parts)

def relationship_summary():
    lines = []
    lines.append("<listening_biography>")
    lines.append("FILL IN: Your musical identity arc goes here.")
    lines.append("</listening_biography>")
    return "\n".join(lines)
