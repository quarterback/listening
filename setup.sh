#!/usr/bin/env bash
# Quick setup for the Last.fm Listening Autobiography toolkit.
# Usage: bash setup.sh

set -e

echo "=== Last.fm Listening Autobiography Setup ==="
echo

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
else
    echo "Virtual environment already exists."
fi

# Install dependencies
echo "Installing dependencies..."
.venv/bin/pip install -q -r requirements.txt

# Create listening_bio.py from template if it doesn't exist
if [ ! -f "listening_bio.py" ]; then
    echo "Creating listening_bio.py from template..."
    cp listening_bio_template.py listening_bio.py
    echo "  -> Edit listening_bio.py to add your own eras, artist bios, and stories."
else
    echo "listening_bio.py already exists (your biographical layer)."
fi

# Make CLI executable
chmod +x lastfm_stats.py

# Check for environment variables
echo
if [ -z "$LASTFM_API_KEY" ]; then
    echo "WARNING: LASTFM_API_KEY is not set."
    echo "  Get one at: https://www.last.fm/api/account/create"
    echo "  Then run:   export LASTFM_API_KEY=\"your_key_here\""
else
    echo "LASTFM_API_KEY is set."
fi

if [ -z "$LASTFM_USER" ]; then
    echo "WARNING: LASTFM_USER is not set."
    echo "  Run:        export LASTFM_USER=\"your_username\""
else
    echo "LASTFM_USER is set."
fi

echo
echo "=== Setup complete ==="
echo
echo "Quick start:"
echo "  export LASTFM_API_KEY=\"your_key\""
echo "  export LASTFM_USER=\"your_username\""
echo "  .venv/bin/python lastfm_stats.py profile"
echo "  .venv/bin/python lastfm_stats.py snapshot --period 7day"
echo "  .venv/bin/python lastfm_stats.py years"
