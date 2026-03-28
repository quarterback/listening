// ── Audio Player ──
var audioEl = document.getElementById('global-audio');
var currentBtn = null;

function playPreview(artist, track, btn) {
  if (currentBtn) {
    currentBtn.classList.remove('playing');
    currentBtn.textContent = '\u25B6';
  }
  if (currentBtn === btn) {
    audioEl.pause();
    currentBtn = null;
    return;
  }
  btn.textContent = '\u00B7\u00B7\u00B7';
  var q = encodeURIComponent(artist + ' ' + track);
  fetch('https://itunes.apple.com/search?term=' + q + '&limit=1&entity=song')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var results = data.results || [];
      if (results.length && results[0].previewUrl) {
        audioEl.src = results[0].previewUrl;
        audioEl.play();
        btn.classList.add('playing');
        btn.textContent = '\u275A\u275A';
        currentBtn = btn;
      } else {
        btn.textContent = '\u25B6';
      }
    })
    .catch(function() { btn.textContent = '\u25B6'; });
}

audioEl.addEventListener('ended', function() {
  if (currentBtn) {
    currentBtn.classList.remove('playing');
    currentBtn.textContent = '\u25B6';
    currentBtn = null;
  }
});

// ── Tooltip ──
function showTooltip(evt, html) {
  var tt = document.getElementById('tooltip');
  tt.innerHTML = html;
  tt.classList.add('show');
  var x = Math.min(evt.clientX + 12, window.innerWidth - 360);
  var y = Math.min(evt.clientY - 8, window.innerHeight - 140);
  tt.style.left = x + 'px';
  tt.style.top = y + 'px';
}
function hideTooltip() {
  document.getElementById('tooltip').classList.remove('show');
}

// ── Escape for safe HTML insertion ──
function esc(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Colors ──
var COLORS = {
  "indie rock": "#4ecdc4",
  "post-hardcore / emo": "#ff6b6b",
  "shoegaze / dream pop": "#a78bfa",
  "post-punk / darkwave": "#c084fc",
  "hip-hop / rap": "#fbbf24",
  "jazz": "#34d399",
  "folk / singer-songwriter": "#fb923c",
  "metal / heavy": "#ef4444",
  "soul / r&b": "#f472b6",
  "electronic / ambient": "#38bdf8",
  "post-rock": "#6ee7b7",
  "punk / garage": "#f87171",
  "other": "#555"
};

var FAMILIES = Object.keys(COLORS);

// ── Load Data ──
fetch('viz_data.json')
  .then(function(r) { return r.json(); })
  .then(function(DATA) {
    var years = Object.keys(DATA.yearGenres).sort();

    // Stats
    document.getElementById('stat-obscure').textContent = DATA.obscureGems.length;
    document.getElementById('stat-vinyl').textContent = DATA.vinyl.totalVinyl;

    // ── Last Scrobble ──
    (function() {
      var container = document.getElementById('last-scrobble');
      if (!container) return;
      fetch('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=statechampion&limit=1&api_key=4f1d49f394a1567717e2c9049947d004&format=json')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var tracks = (data.recenttracks || {}).track || [];
          if (!tracks.length) return;
          var t = tracks[0];
          var nowPlaying = t['@attr'] && t['@attr'].nowplaying === 'true';
          var images = t.image || [];
          var imgUrl = '';
          for (var i = 0; i < images.length; i++) {
            if (images[i].size === 'large' && images[i]['#text']) imgUrl = images[i]['#text'];
          }

          if (imgUrl) {
            var img = document.createElement('img');
            img.src = imgUrl;
            img.alt = t.artist['#text'] + ' - ' + t.name;
            container.appendChild(img);
          }

          var info = document.createElement('div');
          var label = document.createElement('div');
          label.className = 'ls-label';
          label.textContent = nowPlaying ? 'Now playing' : 'Last scrobble';
          if (nowPlaying) label.classList.add('ls-now');
          info.appendChild(label);

          var track = document.createElement('div');
          track.className = 'ls-track';
          track.textContent = t.name;
          info.appendChild(track);

          var artist = document.createElement('div');
          artist.className = 'ls-artist';
          artist.textContent = t.artist['#text'];
          info.appendChild(artist);

          container.appendChild(info);
        })
        .catch(function() {});
    })();

    // ── Memorable Albums ──
    var albumGrid = document.getElementById('album-grid');
    if (DATA.memorableAlbums && albumGrid) {
      DATA.memorableAlbums.forEach(function(a) {
        var card = document.createElement('div');
        card.className = 'album-card';

        if (a.cover) {
          var img = document.createElement('img');
          img.src = a.cover;
          img.alt = a.input_artist + ' - ' + a.input_album;
          img.loading = 'lazy';
          card.appendChild(img);
        } else {
          var placeholder = document.createElement('div');
          placeholder.style.cssText = 'width:100%;aspect-ratio:1;background:#1a1a24;display:flex;align-items:center;justify-content:center;color:#333;font-size:2rem';
          placeholder.textContent = '\u266B';
          card.appendChild(placeholder);
        }

        var info = document.createElement('div');
        info.className = 'ac-info';

        var artistDiv = document.createElement('div');
        artistDiv.className = 'ac-artist';
        artistDiv.textContent = a.input_artist;
        info.appendChild(artistDiv);

        var titleDiv = document.createElement('div');
        titleDiv.className = 'ac-title';
        titleDiv.textContent = a.input_album;
        info.appendChild(titleDiv);

        if (a.preview_track) {
          var btn = document.createElement('button');
          btn.className = 'ac-play';
          var trackName = a.preview_track.length > 30 ? a.preview_track.slice(0, 28) + '\u2026' : a.preview_track;
          btn.textContent = '\u25B6 ' + trackName;
          btn.addEventListener('click', function() { playPreview(a.input_artist, a.preview_track, btn); });
          info.appendChild(btn);
        }

        card.appendChild(info);
        albumGrid.appendChild(card);
      });
    }

    // ── Stream Chart ──
    (function() {
      var margin = {top: 30, right: 30, bottom: 40, left: 50};
      var width = Math.max(900, years.length * 50);
      var height = 400;

      var svg = d3.select("#stream-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
        .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var tableData = years.map(function(y) {
        var row = {year: y};
        var g = DATA.yearGenres[y].genres;
        var total = Object.values(g).reduce(function(a,b) { return a+b; }, 0) || 1;
        FAMILIES.forEach(function(f) { row[f] = (g[f] || 0) / total; });
        return row;
      });

      var stack = d3.stack().keys(FAMILIES)
        .offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut);
      var series = stack(tableData);

      var x = d3.scalePoint().domain(years).range([0, width]).padding(0.5);
      var yExt = [
        d3.min(series, function(s) { return d3.min(s, function(d) { return d[0]; }); }),
        d3.max(series, function(s) { return d3.max(s, function(d) { return d[1]; }); })
      ];
      var y = d3.scaleLinear().domain(yExt).range([height, 0]);

      var area = d3.area()
        .x(function(d, i) { return x(years[i]); })
        .y0(function(d) { return y(d[0]); })
        .y1(function(d) { return y(d[1]); })
        .curve(d3.curveBasis);

      svg.selectAll(".area").data(series).join("path")
        .attr("class", "area").attr("d", area)
        .attr("fill", function(d) { return COLORS[d.key] || "#555"; })
        .on("mousemove", function(evt, d) {
          var pt = d3.pointer(evt);
          var mx = pt[0];
          var nearest = years[0];
          var minD = Infinity;
          years.forEach(function(yr) {
            var dist = Math.abs(x(yr) - mx);
            if (dist < minD) { minD = dist; nearest = yr; }
          });
          var artists = DATA.yearGenres[nearest].artists
            .filter(function(a) { return a.f.includes(d.key); })
            .map(function(a) { return esc(a.n) + ' <span style="color:#555">(' + a.p + ')</span>'; }).join('<br>');
          showTooltip(evt,
            '<div style="font-weight:600;color:' + COLORS[d.key] + '">' + esc(d.key) + '</div>' +
            '<div style="color:#ff6b35;font-size:0.8rem">' + nearest + '</div>' +
            '<div style="margin-top:5px;line-height:1.6">' + (artists || 'none') + '</div>'
          );
        })
        .on("mouseleave", hideTooltip);

      svg.append("g").attr("transform", "translate(0," + (height + 8) + ")")
        .selectAll("text").data(years).join("text")
        .attr("x", function(d) { return x(d); }).attr("text-anchor", "middle").attr("dy", 12)
        .style("fill", "#555").style("font-size", "11px")
        .style("font-family", "'JetBrains Mono', monospace")
        .text(function(d) { return "'" + d.slice(-2); });

      var legend = d3.select("#stream-legend");
      FAMILIES.filter(function(f) {
        return years.some(function(y) { return (DATA.yearGenres[y].genres[f] || 0) > 0; });
      }).forEach(function(f) {
        var item = legend.append("div").attr("class", "stream-legend-item");
        item.append("div").attr("class", "swatch").style("background", COLORS[f]);
        item.append("span").text(f);
      });
    })();

    // ── Tracks by Year ──
    (function() {
      var grid = document.getElementById('tracks-grid');

      years.forEach(function(year) {
        var tracks = DATA.tracks[year];
        if (!tracks || tracks.length === 0) return;

        var card = document.createElement('div');
        card.className = 'year-card';

        var yearLabel = document.createElement('div');
        yearLabel.className = 'yc-year';
        yearLabel.textContent = year;
        card.appendChild(yearLabel);

        tracks.slice(0, 5).forEach(function(t) {
          var row = document.createElement('div');
          row.className = 'yc-track';

          var btn = document.createElement('button');
          btn.className = 'yc-btn';
          btn.textContent = '\u25B6';
          btn.addEventListener('click', function() { playPreview(t.artist, t.name, btn); });
          row.appendChild(btn);

          var text = document.createElement('span');
          text.className = 'yc-text';
          var artistSpan = document.createElement('span');
          artistSpan.className = 'yc-artist';
          artistSpan.textContent = t.artist;
          var songSpan = document.createElement('span');
          songSpan.className = 'yc-song';
          songSpan.textContent = t.name;
          text.appendChild(artistSpan);
          text.appendChild(document.createTextNode(' \u2014 '));
          text.appendChild(songSpan);
          row.appendChild(text);

          var plays = document.createElement('span');
          plays.className = 'yc-plays';
          plays.textContent = t.plays;
          row.appendChild(plays);

          card.appendChild(row);
        });

        grid.appendChild(card);
      });
    })();

    // ── Bump Chart ──
    (function() {
      var margin = {top: 20, right: 160, bottom: 40, left: 160};
      var width = Math.max(900, years.length * 50);
      var height = 650;

      var svg = d3.select("#bump-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
        .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var multiYear = Object.entries(DATA.multiYear)
        .filter(function(e) { return Object.keys(e[1].y).length >= 2; })
        .sort(function(a, b) {
          return Object.keys(b[1].y).length - Object.keys(a[1].y).length ||
            parseInt(Object.keys(a[1].y).sort()[0]) - parseInt(Object.keys(b[1].y).sort()[0]);
        })
        .slice(0, 28);

      var names = multiYear.map(function(d) { return d[0]; });
      var x = d3.scalePoint().domain(years).range([0, width]).padding(0.5);
      var y = d3.scalePoint().domain(names).range([0, height]).padding(0.5);

      svg.append("g").attr("transform", "translate(0," + (height + 8) + ")")
        .selectAll("text").data(years).join("text")
        .attr("x", function(d) { return x(d); }).attr("text-anchor", "middle").attr("dy", 12)
        .style("fill", "#555").style("font-size", "11px")
        .style("font-family", "'JetBrains Mono', monospace")
        .text(function(d) { return "'" + d.slice(-2); });

      multiYear.forEach(function(entry) {
        var name = entry[0];
        var data = entry[1];
        var active = Object.entries(data.y)
          .map(function(e) { return {year: e[0], plays: e[1]}; })
          .sort(function(a, b) { return a.year.localeCompare(b.year); });
        var color = COLORS[data.f[0]] || "#888";

        svg.append("path")
          .datum(active)
          .attr("class", "bump-line")
          .attr("d", d3.line()
            .x(function(d) { return x(d.year); })
            .y(function() { return y(name); })
            .curve(d3.curveMonotoneX))
          .attr("stroke", color)
          .on("mousemove", function(evt) {
            var yrs = active.map(function(d) { return d.year + ': <strong>' + d.plays + '</strong>'; }).join('<br>');
            var total = active.reduce(function(s, d) { return s + d.plays; }, 0);
            showTooltip(evt,
              '<div style="font-weight:600">' + esc(name) + '</div>' +
              '<div style="color:#666;font-size:0.8rem">' + esc((data.f || []).join(", ")) + '</div>' +
              '<div style="color:#4ecdc4;font-size:0.8rem;margin-top:3px">' + total + ' total plays, ' + active.length + ' years</div>' +
              '<div style="margin-top:5px;font-size:0.8rem;line-height:1.6">' + yrs + '</div>'
            );
            d3.select(this).attr("opacity", 1).attr("stroke-width", 4);
          })
          .on("mouseleave", function() {
            hideTooltip();
            d3.select(this).attr("opacity", 0.6).attr("stroke-width", 2.5);
          });

        svg.selectAll(null).data(active).join("circle")
          .attr("class", "bump-dot")
          .attr("cx", function(d) { return x(d.year); })
          .attr("cy", y(name))
          .attr("r", function(d) { return Math.max(3, Math.min(8, d.plays / 28)); })
          .attr("fill", color);

        svg.append("text")
          .attr("x", -10).attr("y", y(name))
          .attr("text-anchor", "end").attr("dy", "0.35em")
          .style("fill", color).style("font-size", "10px")
          .style("font-family", "'JetBrains Mono', monospace")
          .text(name);
      });
    })();

    // ── Before The Scrobbles (Eras) ──
    (function() {
      var container = document.getElementById('eras-list');
      if (!DATA.eras || !container) return;

      DATA.eras.forEach(function(era) {
        var block = document.createElement('div');
        block.className = 'era-block';

        var title = document.createElement('div');
        title.className = 'era-title';
        title.textContent = era.title;
        block.appendChild(title);

        var text = document.createElement('div');
        text.className = 'era-text';
        text.textContent = era.text;
        block.appendChild(text);

        if (era.albums && era.albums.length > 0) {
          var strip = document.createElement('div');
          strip.className = 'era-albums';

          era.albums.forEach(function(a) {
            var card = document.createElement('div');
            card.className = 'era-album';

            if (a.cover) {
              var img = document.createElement('img');
              img.src = a.cover;
              img.alt = a.artist + ' - ' + a.album;
              img.loading = 'lazy';
              card.appendChild(img);
            }

            var artist = document.createElement('div');
            artist.className = 'ea-artist';
            artist.textContent = a.artist;
            card.appendChild(artist);

            var albumTitle = document.createElement('div');
            albumTitle.className = 'ea-title';
            albumTitle.textContent = a.album;
            card.appendChild(albumTitle);

            if (a.preview_track) {
              var btn = document.createElement('button');
              btn.className = 'ea-play';
              btn.textContent = '\u25B6 ' + (a.preview_track.length > 20 ? a.preview_track.slice(0, 18) + '\u2026' : a.preview_track);
              btn.addEventListener('click', function() { playPreview(a.artist, a.preview_track, btn); });
              card.appendChild(btn);
            }

            strip.appendChild(card);
          });

          block.appendChild(strip);
        }

        container.appendChild(block);
      });
    })();

    // ── Deep Cuts ──
    (function() {
      var list = document.getElementById('obscure-list');
      DATA.obscureGems.forEach(function(gem) {
        var li = document.createElement('li');
        li.className = 'obscure-item';

        var nameSpan = document.createElement('span');
        nameSpan.className = 'oi-name';
        nameSpan.style.color = COLORS[gem.families[0]] || '#ccc';
        nameSpan.textContent = gem.name;
        li.appendChild(nameSpan);

        var listenersSpan = document.createElement('span');
        listenersSpan.className = 'oi-listeners';
        listenersSpan.textContent = gem.listeners.toLocaleString() + ' listeners';
        li.appendChild(listenersSpan);

        var playsSpan = document.createElement('span');
        playsSpan.className = 'oi-plays';
        playsSpan.textContent = gem.your_plays + ' plays';
        li.appendChild(playsSpan);

        var detailSpan = document.createElement('span');
        detailSpan.className = 'oi-detail';
        detailSpan.textContent = gem.tags.join(", ") + ' \u00B7 top 15 in ' + gem.years.join(", ");
        li.appendChild(detailSpan);

        list.appendChild(li);
      });
    })();

    // ── Same Year Different Universe ──
    (function() {
      var grid = document.getElementById('contrast-grid');
      years.forEach(function(year) {
        var artists = DATA.yearGenres[year].artists;
        var maxDist = 0, best = null;
        for (var i = 0; i < artists.length; i++) {
          for (var j = i + 1; j < artists.length; j++) {
            var a = artists[i], b = artists[j];
            var shared = a.f.filter(function(f) { return b.f.includes(f); }).length;
            var total = new Set(a.f.concat(b.f)).size;
            var dist = total - shared;
            if (dist > maxDist || (dist === maxDist && a.p + b.p > (best ? best[0].p + best[1].p : 0))) {
              maxDist = dist; best = [a, b];
            }
          }
        }
        if (best && maxDist >= 2) {
          var card = document.createElement('div');
          card.className = 'contrast-card';

          var yearDiv = document.createElement('div');
          yearDiv.className = 'cc-year';
          yearDiv.textContent = year;
          card.appendChild(yearDiv);

          var pair = document.createElement('div');
          pair.className = 'cc-pair';

          [0, 1].forEach(function(idx) {
            if (idx === 1) {
              var vs = document.createElement('div');
              vs.className = 'cc-vs';
              vs.textContent = '+';
              pair.appendChild(vs);
            }
            var side = document.createElement('div');
            side.className = 'cc-artist';
            var nm = document.createElement('div');
            nm.className = 'cc-name';
            nm.style.color = COLORS[best[idx].f[0]] || '#ccc';
            nm.textContent = best[idx].n;
            side.appendChild(nm);
            var genre = document.createElement('div');
            genre.className = 'cc-genre';
            genre.textContent = best[idx].f.join(", ");
            side.appendChild(genre);
            var count = document.createElement('div');
            count.className = 'cc-count';
            count.textContent = best[idx].p + ' plays';
            side.appendChild(count);
            pair.appendChild(side);
          });

          card.appendChild(pair);
          grid.appendChild(card);
        }
      });
    })();

    // ── Vinyl ──
    (function() {
      var grid = document.getElementById('vinyl-grid');
      var items = DATA.vinyl.inTop.slice().sort(function(a, b) { return b.total_plays - a.total_plays; });
      items.forEach(function(v) {
        var item = document.createElement('div');
        item.className = 'vinyl-item';

        var artist = document.createElement('div');
        artist.className = 'vi-artist';
        artist.textContent = v.artist;
        item.appendChild(artist);

        var album = document.createElement('div');
        album.className = 'vi-album';
        album.textContent = v.album;
        item.appendChild(album);

        var meta = document.createElement('div');
        meta.className = 'vi-meta';
        var scrobbles = document.createElement('span');
        scrobbles.className = 'vi-scrobbles';
        scrobbles.textContent = v.total_plays + ' scrobbles';
        meta.appendChild(scrobbles);
        var yrs = document.createElement('span');
        yrs.className = 'vi-years';
        yrs.textContent = 'top 15 in ' + v.years_in_top.join(", ");
        meta.appendChild(yrs);
        item.appendChild(meta);

        grid.appendChild(item);
      });
    })();

    // ── Across The Decades ──
    (function() {
      var grid = document.getElementById('decades-grid');
      if (!DATA.musicDecades) return;
      var allDecades = Object.keys(DATA.musicDecades).sort();
      var maxPlays = Math.max.apply(null, allDecades.map(function(dec) { return DATA.musicDecades[dec].plays; }));

      allDecades.forEach(function(dec) {
        var ddata = DATA.musicDecades[dec];
        var card = document.createElement('div');
        card.className = 'decade-card';

        var label = document.createElement('div');
        label.className = 'dc-label';
        label.textContent = dec;
        card.appendChild(label);

        var stats = document.createElement('div');
        stats.className = 'dc-years';
        stats.textContent = ddata.plays.toLocaleString() + ' plays \u00B7 ' + ddata.artist_count + ' artists';
        card.appendChild(stats);

        // Bar showing relative weight
        var barRow = document.createElement('div');
        barRow.className = 'dc-genre';
        var bar = document.createElement('div');
        bar.className = 'dc-bar';
        bar.style.width = Math.round((ddata.plays / maxPlays) * 160) + 'px';
        bar.style.background = '#ff6b35';
        barRow.appendChild(bar);
        card.appendChild(barRow);

        // Sample artists
        var sample = document.createElement('div');
        sample.className = 'dc-years';
        sample.style.marginTop = '0.5rem';
        sample.textContent = ddata.sample_artists.join(', ');
        card.appendChild(sample);

        grid.appendChild(card);
      });
    })();

    // ── Fun Facts ──
    (function() {
      var grid = document.getElementById('facts-grid');
      DATA.funFacts.forEach(function(fact) {
        var card = document.createElement('div');
        card.className = 'fact-card';

        var label = document.createElement('div');
        label.className = 'fc-label';
        var value = document.createElement('div');
        value.className = 'fc-value';
        var detail = document.createElement('div');
        detail.className = 'fc-detail';

        if (fact.type === 'biggest_obsession') {
          label.textContent = 'Biggest single-year obsession';
          value.textContent = fact.data.name;
          detail.textContent = fact.data.plays + ' plays in ' + fact.data.year;
        } else if (fact.type === 'longest_running') {
          label.textContent = 'Longest-running top 15 artist';
          value.textContent = fact.data.name;
          detail.textContent = fact.data.years + ' years (' + fact.data.span + ')';
        } else if (fact.type === 'classical_outlier') {
          label.textContent = 'The classical outlier';
          value.textContent = fact.data.name;
          detail.textContent = fact.data.detail + ' (' + fact.data.plays + ' plays, ' + fact.data.year + ')';
        } else if (fact.type === 'deepest_devotion') {
          label.textContent = 'Deepest devotion';
          value.textContent = fact.data.name;
          detail.textContent = fact.data.your_plays + ' of your plays \u00B7 ' + fact.data.listeners.toLocaleString() + ' listeners worldwide';
        } else if (fact.type === 'widest_year') {
          label.textContent = 'Widest year';
          value.textContent = fact.data.year;
          detail.textContent = fact.data.families + ' genre families in your top 15';
        }

        card.appendChild(label);
        card.appendChild(value);
        card.appendChild(detail);
        grid.appendChild(card);
      });
    })();

  })
  .catch(function(err) {
    console.error('Failed to load viz_data.json:', err);
  });
