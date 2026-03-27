# A music retrospective

I've done lots of random music analysis over the years — Spotify Wrapped, Last.fm charts, playlists for every occasion — but never anything quite like this.

My friend [Joel Goodman](https://joelgoodman.co/timeline/) shared his listening timeline with me the other day. He'd built a Python script that pulls your Last.fm data and turns it into something you can actually explore. I thought it'd be fun to put my own spin on it, so I remixed it.

The result is [Ron's Listening Journey](https://quarterback.github.io/listening/) — 21 years of scrobble data, 468,910 plays across 45,647 artists, visualized with genre breakdowns, top songs by year (with 30-second previews), my vinyl collection cross-referenced with my listening history, and a bunch of other data I'd never looked at before.

The stack: Joel's Python scripts pull data from the [Last.fm API](https://www.last.fm/api) and the [Discogs API](https://www.discogs.com/developers). The front end is vanilla HTML/CSS/JS with [D3.js](https://d3js.org/) for the charts. Audio previews come from the [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/). Album art from [Deezer](https://developers.deezer.com/api). Hosted on GitHub Pages.

It was a lot of fun to look back at the tunes. Now you can too.

[Check it out →](https://quarterback.github.io/listening/)
