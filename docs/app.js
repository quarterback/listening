// ── Audio Player ──
const audioEl = document.getElementById('global-audio');
let currentBtn = null;

function playPreview(url, btn) {
  if (currentBtn) {
    currentBtn.classList.remove('playing');
    currentBtn.textContent = '\u25B6';
  }
  if (currentBtn === btn) {
    audioEl.pause();
    currentBtn = null;
    return;
  }
  audioEl.src = url;
  audioEl.play();
  btn.classList.add('playing');
  btn.textContent = '\u275A\u275A';
  currentBtn = btn;
}

audioEl.addEventListener('ended', () => {
  if (currentBtn) {
    currentBtn.classList.remove('playing');
    currentBtn.textContent = '\u25B6';
    currentBtn = null;
  }
});

// ── Tooltip ──
function showTooltip(evt, html) {
  const tt = document.getElementById('tooltip');
  tt.innerHTML = html;
  tt.classList.add('show');
  const x = Math.min(evt.clientX + 12, window.innerWidth - 360);
  const y = Math.min(evt.clientY - 8, window.innerHeight - 140);
  tt.style.left = x + 'px';
  tt.style.top = y + 'px';
}
function hideTooltip() {
  document.getElementById('tooltip').classList.remove('show');
}

// ── Colors ──
const COLORS = {
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

const FAMILIES = Object.keys(COLORS);

// ── Load Data ──
fetch('viz_data.json').then(r => r.json()).then(DATA => {
  const years = Object.keys(DATA.yearGenres).sort();

  // Stats
  document.getElementById('stat-obscure').textContent = DATA.obscureGems.length;
  document.getElementById('stat-vinyl').textContent = DATA.vinyl.totalVinyl;

  // ── Memorable Albums ──
  (function() {
    const grid = document.getElementById('album-grid');
    if (!DATA.memorableAlbums) return;

    DATA.memorableAlbums.forEach(a => {
      const card = document.createElement('div');
      card.className = 'album-card';

      const img = a.cover
        ? `<img src="${a.cover}" alt="${a.artist} - ${a.album}" loading="lazy">`
        : `<div style="width:100%;aspect-ratio:1;background:#1a1a24;display:flex;align-items:center;justify-content:center;color:#333;font-size:2rem">\u266B</div>`;

      const playBtn = a.preview
        ? `<button class="ac-play" data-preview="${a.preview}">\u25B6 ${a.preview_track}</button>`
        : '';

      card.innerHTML = `
        ${img}
        <div class="ac-info">
          <div class="ac-artist">${a.input_artist}</div>
          <div class="ac-title">${a.input_album}</div>
          ${playBtn}
        </div>
      `;

      const btn = card.querySelector('.ac-play');
      if (btn) {
        btn.addEventListener('click', () => playPreview(a.preview, btn));
      }

      grid.appendChild(card);
    });
  })();

  // ── Stream Chart ──
  (function() {
    const margin = {top: 30, right: 30, bottom: 40, left: 50};
    const width = Math.max(900, years.length * 50);
    const height = 400;

    const svg = d3.select("#stream-chart")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tableData = years.map(y => {
      const row = {year: y};
      const g = DATA.yearGenres[y].genres;
      const total = Object.values(g).reduce((a,b) => a+b, 0) || 1;
      FAMILIES.forEach(f => { row[f] = (g[f] || 0) / total; });
      return row;
    });

    const stack = d3.stack().keys(FAMILIES)
      .offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut);
    const series = stack(tableData);

    const x = d3.scalePoint().domain(years).range([0, width]).padding(0.5);
    const yExt = [
      d3.min(series, s => d3.min(s, d => d[0])),
      d3.max(series, s => d3.max(s, d => d[1]))
    ];
    const y = d3.scaleLinear().domain(yExt).range([height, 0]);

    const area = d3.area()
      .x((d, i) => x(years[i]))
      .y0(d => y(d[0])).y1(d => y(d[1]))
      .curve(d3.curveBasis);

    svg.selectAll(".area").data(series).join("path")
      .attr("class", "area").attr("d", area)
      .attr("fill", d => COLORS[d.key] || "#555")
      .on("mousemove", function(evt, d) {
        const [mx] = d3.pointer(evt);
        let nearest = years[0];
        let minD = Infinity;
        years.forEach(yr => { const dist = Math.abs(x(yr) - mx); if (dist < minD) { minD = dist; nearest = yr; } });
        const artists = DATA.yearGenres[nearest].artists
          .filter(a => a.f.includes(d.key))
          .map(a => `${a.n} <span style="color:#555">(${a.p})</span>`).join('<br>');
        showTooltip(evt, `
          <div style="font-weight:600;color:${COLORS[d.key]}">${d.key}</div>
          <div style="color:#ff6b35;font-family:'Space Mono',monospace;font-size:0.8rem">${nearest}</div>
          <div style="margin-top:5px;line-height:1.6">${artists || 'none'}</div>
        `);
      })
      .on("mouseleave", hideTooltip);

    svg.append("g").attr("transform", `translate(0,${height + 8})`)
      .selectAll("text").data(years).join("text")
      .attr("x", d => x(d)).attr("text-anchor", "middle").attr("dy", 12)
      .style("fill", "#555").style("font-size", "11px")
      .style("font-family", "'Space Mono', monospace")
      .text(d => "'" + d.slice(-2));

    const legend = d3.select("#stream-legend");
    FAMILIES.filter(f => years.some(y => (DATA.yearGenres[y].genres[f] || 0) > 0))
      .forEach(f => {
        const item = legend.append("div").attr("class", "stream-legend-item");
        item.append("div").attr("class", "swatch").style("background", COLORS[f]);
        item.append("span").text(f);
      });
  })();

  // ── Tracks by Year ──
  (function() {
    const grid = document.getElementById('tracks-grid');

    years.forEach(year => {
      const tracks = DATA.tracks[year];
      if (!tracks || tracks.length === 0) return;

      const card = document.createElement('div');
      card.className = 'year-card';
      let html = `<div class="yc-year">${year}</div>`;

      tracks.slice(0, 5).forEach(t => {
        const hasPreview = !!t.preview;
        const btnClass = hasPreview ? 'yc-btn' : 'yc-btn no-preview';
        html += `<div class="yc-track">
          <button class="${btnClass}" ${hasPreview ? `data-preview="${t.preview}"` : ''}>\u25B6</button>
          <span class="yc-text"><span class="yc-artist">${t.artist}</span> &mdash; <span class="yc-song">${t.name}</span></span>
          <span class="yc-plays">${t.plays}</span>
        </div>`;
      });

      card.innerHTML = html;
      card.querySelectorAll('.yc-btn[data-preview]').forEach(btn => {
        btn.addEventListener('click', () => playPreview(btn.dataset.preview, btn));
      });
      grid.appendChild(card);
    });
  })();

  // ── Bump Chart ──
  (function() {
    const margin = {top: 20, right: 160, bottom: 40, left: 160};
    const width = Math.max(900, years.length * 50);
    const height = 650;

    const svg = d3.select("#bump-chart")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const multiYear = Object.entries(DATA.multiYear)
      .filter(([_, d]) => Object.keys(d.y).length >= 2)
      .sort((a, b) => Object.keys(b[1].y).length - Object.keys(a[1].y).length || parseInt(Object.keys(a[1].y)[0]) - parseInt(Object.keys(b[1].y)[0]))
      .slice(0, 28);

    const names = multiYear.map(d => d[0]);
    const x = d3.scalePoint().domain(years).range([0, width]).padding(0.5);
    const y = d3.scalePoint().domain(names).range([0, height]).padding(0.5);

    svg.append("g").attr("transform", `translate(0,${height + 8})`)
      .selectAll("text").data(years).join("text")
      .attr("x", d => x(d)).attr("text-anchor", "middle").attr("dy", 12)
      .style("fill", "#555").style("font-size", "11px")
      .style("font-family", "'Space Mono', monospace")
      .text(d => "'" + d.slice(-2));

    multiYear.forEach(([name, data]) => {
      const active = Object.entries(data.y)
        .map(([yr, plays]) => ({year: yr, plays}))
        .sort((a, b) => a.year.localeCompare(b.year));
      const color = COLORS[data.f[0]] || "#888";

      svg.append("path")
        .datum(active)
        .attr("class", "bump-line")
        .attr("d", d3.line().x(d => x(d.year)).y(() => y(name)).curve(d3.curveMonotoneX))
        .attr("stroke", color)
        .on("mousemove", function(evt) {
          const yrs = active.map(d => `${d.year}: <strong>${d.plays}</strong>`).join('<br>');
          const total = active.reduce((s, d) => s + d.plays, 0);
          showTooltip(evt, `
            <div style="font-weight:600">${name}</div>
            <div style="color:#666;font-size:0.8rem">${(data.f || []).join(", ")}</div>
            <div style="color:#4ecdc4;font-family:'Space Mono',monospace;font-size:0.8rem;margin-top:3px">${total} total plays, ${active.length} years</div>
            <div style="margin-top:5px;font-size:0.8rem;line-height:1.6">${yrs}</div>
          `);
          d3.select(this).attr("opacity", 1).attr("stroke-width", 4);
        })
        .on("mouseleave", function() {
          hideTooltip();
          d3.select(this).attr("opacity", 0.6).attr("stroke-width", 2.5);
        });

      svg.selectAll(null).data(active).join("circle")
        .attr("class", "bump-dot")
        .attr("cx", d => x(d.year)).attr("cy", y(name))
        .attr("r", d => Math.max(3, Math.min(8, d.plays / 28)))
        .attr("fill", color);

      svg.append("text")
        .attr("x", -10).attr("y", y(name))
        .attr("text-anchor", "end").attr("dy", "0.35em")
        .style("fill", color).style("font-size", "10px")
        .style("font-family", "'Space Mono', monospace")
        .text(name);
    });
  })();

  // ── Deep Cuts ──
  (function() {
    const list = document.getElementById('obscure-list');
    DATA.obscureGems.forEach(gem => {
      const li = document.createElement('li');
      li.className = 'obscure-item';
      li.innerHTML = `
        <span class="oi-name" style="color:${COLORS[gem.families[0]] || '#ccc'}">${gem.name}</span>
        <span class="oi-listeners">${gem.listeners.toLocaleString()} listeners</span>
        <span class="oi-plays">${gem.your_plays} plays</span>
        <span class="oi-detail">${gem.tags.join(", ")} &middot; top 15 in ${gem.years.join(", ")}</span>
      `;
      list.appendChild(li);
    });
  })();

  // ── Same Year Different Universe ──
  (function() {
    const grid = document.getElementById('contrast-grid');
    years.forEach(year => {
      const artists = DATA.yearGenres[year].artists;
      let maxDist = 0, best = null;
      for (let i = 0; i < artists.length; i++) {
        for (let j = i + 1; j < artists.length; j++) {
          const a = artists[i], b = artists[j];
          const shared = a.f.filter(f => b.f.includes(f)).length;
          const total = new Set([...a.f, ...b.f]).size;
          const dist = total - shared;
          if (dist > maxDist || (dist === maxDist && a.p + b.p > (best ? best[0].p + best[1].p : 0))) {
            maxDist = dist; best = [a, b];
          }
        }
      }
      if (best && maxDist >= 2) {
        const card = document.createElement('div');
        card.className = 'contrast-card';
        card.innerHTML = `
          <div class="cc-year">${year}</div>
          <div class="cc-pair">
            <div class="cc-artist">
              <div class="cc-name" style="color:${COLORS[best[0].f[0]] || '#ccc'}">${best[0].n}</div>
              <div class="cc-genre">${best[0].f.join(", ")}</div>
              <div class="cc-count">${best[0].p} plays</div>
            </div>
            <div class="cc-vs">+</div>
            <div class="cc-artist">
              <div class="cc-name" style="color:${COLORS[best[1].f[0]] || '#ccc'}">${best[1].n}</div>
              <div class="cc-genre">${best[1].f.join(", ")}</div>
              <div class="cc-count">${best[1].p} plays</div>
            </div>
          </div>
        `;
        grid.appendChild(card);
      }
    });
  })();

  // ── Vinyl ──
  (function() {
    const grid = document.getElementById('vinyl-grid');
    DATA.vinyl.inTop.sort((a, b) => b.total_plays - a.total_plays).forEach(v => {
      const item = document.createElement('div');
      item.className = 'vinyl-item';
      item.innerHTML = `
        <div class="vi-artist">${v.artist}</div>
        <div class="vi-album">${v.album}</div>
        <div class="vi-meta">
          <span class="vi-scrobbles">${v.total_plays} scrobbles</span>
          <span class="vi-years">top 15 in ${v.years_in_top.join(", ")}</span>
        </div>
      `;
      grid.appendChild(item);
    });
  })();

  // ── Fun Facts ──
  (function() {
    const grid = document.getElementById('facts-grid');
    DATA.funFacts.forEach(fact => {
      const card = document.createElement('div');
      card.className = 'fact-card';
      if (fact.type === 'biggest_obsession') {
        card.innerHTML = `<div class="fc-label">Biggest single-year obsession</div><div class="fc-value">${fact.data.name}</div><div class="fc-detail">${fact.data.plays} plays in ${fact.data.year}</div>`;
      } else if (fact.type === 'longest_running') {
        card.innerHTML = `<div class="fc-label">Longest-running top 15 artist</div><div class="fc-value">${fact.data.name}</div><div class="fc-detail">${fact.data.years} years (${fact.data.span})</div>`;
      } else if (fact.type === 'most_obscure') {
        card.innerHTML = `<div class="fc-label">Most obscure top 15 artist</div><div class="fc-value">${fact.data.name}</div><div class="fc-detail">${fact.data.listeners.toLocaleString()} global listeners &middot; ${fact.data.tags.slice(0,3).join(", ")}</div>`;
      }
      grid.appendChild(card);
    });
  })();

}); // end fetch
