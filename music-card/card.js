'use strict';

// ── Config ──
var ODESLI = 'https://api.song.link/v1-alpha.1/links?songIfSingle=true&url=';
var PROXY = 'https://api.allorigins.win/raw?url='; // Odesli sends no CORS header; proxy adds one.
var QR = 'https://api.qrserver.com/v1/create-qr-code/?margin=0&format=png&size=600x600&data=';

// Platform display names + brand colors, in the order we want to show them.
var PLATFORMS = [
  ['spotify', 'Spotify', '#1DB954'],
  ['appleMusic', 'Apple Music', '#fa57c1'],
  ['youtube', 'YouTube', '#ff0000'],
  ['youtubeMusic', 'YouTube Music', '#ff0000'],
  ['tidal', 'Tidal', '#00ffff'],
  ['amazonMusic', 'Amazon Music', '#00a8e1'],
  ['deezer', 'Deezer', '#a238ff'],
  ['soundcloud', 'SoundCloud', '#ff7700'],
  ['pandora', 'Pandora', '#3668ff'],
  ['bandcamp', 'Bandcamp', '#629aa9']
];
// Artwork CDNs confirmed to send `access-control-allow-origin: *` (canvas-safe).
var ART_PREFERENCE = ['spotify', 'amazon', 'itunes', 'deezer'];

// ── State ──
var state = { data: null, style: 'dark', qr: false };

var els = {};
['card-input', 'generate-btn', 'status', 'style-grid', 'qr-toggle',
 'canvas-shell', 'card-canvas', 'placeholder', 'actions',
 'download-btn', 'copy-link-btn', 'universal'].forEach(function (id) {
  els[id] = document.getElementById(id);
});
var ctx = els['card-canvas'].getContext('2d');

// ── Helpers ──
function setStatus(msg, kind) {
  els.status.textContent = msg || '';
  els.status.className = 'status' + (kind ? ' ' + kind : '');
}

function fetchJson(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function looksLikeUrl(s) { return /^https?:\/\//i.test(s.trim()); }

// ── Resolvers ──
// Returns a normalized track: { title, artist, artUrls:[], pageUrl, platforms:[{name,color,url}] }
function resolve(input) {
  return looksLikeUrl(input) ? resolveOdesli(input) : resolveItunes(input);
}

function resolveOdesli(link) {
  var target = ODESLI + encodeURIComponent(link.trim());
  // Try direct first (free if CORS ever allowed); fall back to proxy.
  return fetchJson(target)
    .catch(function () { return fetchJson(PROXY + encodeURIComponent(target)); })
    .then(parseOdesli);
}

function parseOdesli(d) {
  var entities = d.entitiesByUniqueId || {};
  var main = entities[d.entityUniqueId] || entities[Object.keys(entities)[0]];
  if (!main) throw new Error('No song found for that link.');

  // Gather artwork candidates, CORS-safe providers first.
  var arts = [];
  ART_PREFERENCE.forEach(function (prov) {
    Object.keys(entities).forEach(function (k) {
      var e = entities[k];
      if (e.apiProvider === prov && e.thumbnailUrl) arts.push(e.thumbnailUrl);
    });
  });
  Object.keys(entities).forEach(function (k) {
    var u = entities[k].thumbnailUrl;
    if (u && arts.indexOf(u) === -1) arts.push(u);
  });

  var links = d.linksByPlatform || {};
  var platforms = [];
  PLATFORMS.forEach(function (p) {
    if (links[p[0]] && links[p[0]].url) {
      platforms.push({ name: p[1], color: p[2], url: links[p[0]].url });
    }
  });

  return {
    title: main.title || 'Unknown title',
    artist: main.artistName || 'Unknown artist',
    artUrls: arts,
    pageUrl: d.pageUrl || (links.spotify && links.spotify.url) || '',
    platforms: platforms
  };
}

function resolveItunes(query) {
  var url = 'https://itunes.apple.com/search?limit=1&entity=song&term=' + encodeURIComponent(query.trim());
  return fetchJson(url).then(function (d) {
    var r = (d.results || [])[0];
    if (!r) throw new Error('No song found. Try "artist - song", or paste a streaming link.');
    var hi = (r.artworkUrl100 || '').replace(/\/\d+x\d+bb\.(jpg|png)$/, '/1000x1000bb.$1');
    return {
      title: r.trackName || 'Unknown title',
      artist: r.artistName || 'Unknown artist',
      artUrls: [hi, r.artworkUrl100].filter(Boolean),
      pageUrl: r.trackViewUrl || '',
      platforms: r.trackViewUrl
        ? [{ name: 'Apple Music', color: '#fa57c1', url: r.trackViewUrl }] : []
    };
  });
}

// ── Image loading (CORS-clean, with proxy fallback) ──
function loadImage(src) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('img load failed')); };
    img.src = src;
  });
}

// Verify an image won't taint the canvas by reading one pixel from a probe.
function isCanvasClean(img) {
  try {
    var c = document.createElement('canvas');
    c.width = c.height = 2;
    var cc = c.getContext('2d');
    cc.drawImage(img, 0, 0, 2, 2);
    cc.getImageData(0, 0, 1, 1);
    return true;
  } catch (e) { return false; }
}

function loadArtwork(urls) {
  var i = 0;
  function next() {
    if (i >= urls.length) {
      // Last resort: route the first URL through the CORS proxy.
      return loadImage(PROXY + encodeURIComponent(urls[0]));
    }
    var u = urls[i++];
    return loadImage(u).then(function (img) {
      return isCanvasClean(img) ? img : next();
    }).catch(next);
  }
  return urls.length ? next() : Promise.reject(new Error('No artwork available.'));
}

// ── Canvas drawing utilities ──
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function drawCover(c, img, x, y, w, h) {
  var ir = img.width / img.height, dr = w / h, sx, sy, sw, sh;
  if (ir > dr) { sh = img.height; sw = sh * dr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / dr; sx = 0; sy = (img.height - sh) / 2; }
  c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function fitFont(c, text, maxW, startPx, family, weight) {
  var px = startPx;
  do {
    c.font = (weight || '700') + ' ' + px + "px '" + family + "'";
    if (c.measureText(text).width <= maxW) break;
    px -= 2;
  } while (px > 24);
  return px;
}

function wrapLines(c, text, maxW, maxLines) {
  var words = text.split(' '), lines = [], line = '';
  for (var i = 0; i < words.length; i++) {
    var test = line ? line + ' ' + words[i] : words[i];
    if (c.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
    else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    var last = lines[maxLines - 1];
    while (c.measureText(last + '…').width > maxW && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function averageColor(img) {
  var c = document.createElement('canvas');
  c.width = c.height = 16;
  var cc = c.getContext('2d');
  cc.drawImage(img, 0, 0, 16, 16);
  var d = cc.getImageData(0, 0, 16, 16).data, r = 0, g = 0, b = 0, n = d.length / 4;
  for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}
function mix(col, t) { // t<1 darken toward black, t>1 lighten toward white
  function ch(v) { return Math.max(0, Math.min(255, Math.round(t <= 1 ? v * t : v + (255 - v) * (t - 1)))); }
  return 'rgb(' + ch(col.r) + ',' + ch(col.g) + ',' + ch(col.b) + ')';
}

function platformsLine(platforms) {
  var names = platforms.map(function (p) { return p.name; });
  if (names.length <= 4) return names.join('  ·  ');
  return names.slice(0, 4).join('  ·  ') + '  +' + (names.length - 4);
}

// ── Templates ── (canvas is 1080×1920)
var W = 1080, H = 1920;

function tDark(c, t, art, qr) {
  var col = averageColor(art);
  var grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, mix(col, 0.85));
  grad.addColorStop(0.55, mix(col, 0.35));
  grad.addColorStop(1, '#080808');
  c.fillStyle = grad; c.fillRect(0, 0, W, H);

  var label = 'NOW PLAYING';
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.font = "700 30px 'JetBrains Mono'"; c.textAlign = 'left';
  c.fillText(label, 110, 170);

  var sz = 740, ax = (W - sz) / 2, ay = 250;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 60; c.shadowOffsetY = 28;
  roundRect(c, ax, ay, sz, sz, 28); c.fillStyle = '#000'; c.fill();
  c.restore();
  c.save(); roundRect(c, ax, ay, sz, sz, 28); c.clip();
  drawCover(c, art, ax, ay, sz, sz); c.restore();

  c.textAlign = 'left';
  var ty = ay + sz + 110;
  c.fillStyle = '#fff';
  var tpx = fitFont(c, t.title, W - 220, 86, 'Instrument Sans', '700');
  var lines = wrapLines(c, t.title, W - 220, 2);
  lines.forEach(function (ln, i) { c.fillText(ln, 110, ty + i * (tpx + 10)); });
  var ay2 = ty + lines.length * (tpx + 10) + 6;
  c.fillStyle = 'rgba(255,255,255,0.72)';
  c.font = "400 46px 'Instrument Sans'";
  c.fillText(wrapLines(c, t.artist, W - 220, 1)[0], 110, ay2);

  drawFooter(c, t, qr, '#fff', 'rgba(255,255,255,0.55)');
}

function tLight(c, t, art, qr) {
  c.fillStyle = '#f4f4f6'; c.fillRect(0, 0, W, H);
  var col = averageColor(art);
  var g = c.createLinearGradient(0, 0, 0, 900);
  g.addColorStop(0, mix(col, 1.35)); g.addColorStop(1, '#f4f4f6');
  c.globalAlpha = 0.3; c.fillStyle = g; c.fillRect(0, 0, W, 900); c.globalAlpha = 1;

  c.textAlign = 'left';
  c.fillStyle = '#fa57c1';
  c.font = "700 30px 'JetBrains Mono'";
  c.fillText('NOW PLAYING', 110, 170);

  var sz = 740, ax = (W - sz) / 2, ay = 250;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.22)'; c.shadowBlur = 50; c.shadowOffsetY = 24;
  roundRect(c, ax, ay, sz, sz, 28); c.fillStyle = '#fff'; c.fill();
  c.restore();
  c.save(); roundRect(c, ax, ay, sz, sz, 28); c.clip();
  drawCover(c, art, ax, ay, sz, sz); c.restore();

  var ty = ay + sz + 110;
  c.fillStyle = '#111';
  var tpx = fitFont(c, t.title, W - 220, 86, 'Instrument Sans', '700');
  var lines = wrapLines(c, t.title, W - 220, 2);
  lines.forEach(function (ln, i) { c.fillText(ln, 110, ty + i * (tpx + 10)); });
  var ay2 = ty + lines.length * (tpx + 10) + 6;
  c.fillStyle = '#555'; c.font = "400 46px 'Instrument Sans'";
  c.fillText(wrapLines(c, t.artist, W - 220, 1)[0], 110, ay2);

  drawFooter(c, t, qr, '#111', '#888');
}

function tVinyl(c, t, art, qr) {
  c.fillStyle = '#0d0d10'; c.fillRect(0, 0, W, H);
  var col = averageColor(art);
  var cx = W / 2, cy = 740, R = 430;

  // Disc
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 70; c.shadowOffsetY = 25;
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fillStyle = '#141414'; c.fill();
  c.restore();
  // Grooves
  c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 2;
  for (var r = R - 14; r > 175; r -= 14) {
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  }
  // Colored sheen ring
  c.strokeStyle = mix(col, 1.1); c.globalAlpha = 0.4; c.lineWidth = 6;
  c.beginPath(); c.arc(cx, cy, R - 6, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
  // Label = album art
  var lr = 165;
  c.save();
  c.beginPath(); c.arc(cx, cy, lr, 0, Math.PI * 2); c.clip();
  drawCover(c, art, cx - lr, cy - lr, lr * 2, lr * 2); c.restore();
  // Spindle hole
  c.beginPath(); c.arc(cx, cy, 16, 0, Math.PI * 2); c.fillStyle = '#0d0d10'; c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 2; c.stroke();

  c.textAlign = 'center';
  var ty = cy + R + 140;
  c.fillStyle = '#fff';
  var tpx = fitFont(c, t.title, W - 200, 84, 'Instrument Serif', '400');
  var lines = wrapLines(c, t.title, W - 200, 2);
  lines.forEach(function (ln, i) { c.fillText(ln, cx, ty + i * (tpx + 8)); });
  var ay2 = ty + lines.length * (tpx + 8) + 4;
  c.fillStyle = 'rgba(255,255,255,0.65)'; c.font = "400 44px 'Instrument Sans'";
  c.fillText(wrapLines(c, t.artist, W - 200, 1)[0], cx, ay2);

  drawFooter(c, t, qr, '#fff', 'rgba(255,255,255,0.5)', true);
}

function tPolaroid(c, t, art, qr) {
  var col = averageColor(art);
  var bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix(col, 0.45)); bg.addColorStop(1, '#0c0c0c');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);

  c.save();
  c.translate(W / 2, 760); c.rotate(-0.035);
  var pw = 760, ph = 940, px = -pw / 2, py = -ph / 2;
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 60; c.shadowOffsetY = 30;
  c.fillStyle = '#fafaf7'; roundRect(c, px, py, pw, ph, 10); c.fill();
  c.shadowColor = 'transparent';
  var pad = 50, isz = pw - pad * 2;
  c.save(); roundRect(c, px + pad, py + pad, isz, isz, 4); c.clip();
  drawCover(c, art, px + pad, py + pad, isz, isz); c.restore();
  // Caption
  c.fillStyle = '#1a1a1a'; c.textAlign = 'center';
  var capY = py + pad + isz + 96;
  var tpx = fitFont(c, t.title, pw - 100, 58, 'Instrument Serif', 'italic 400');
  c.font = "italic 400 " + tpx + "px 'Instrument Serif'";
  c.fillText(wrapLines(c, t.title, pw - 100, 1)[0], 0, capY);
  c.fillStyle = '#666'; c.font = "400 34px 'Instrument Sans'";
  c.fillText(wrapLines(c, t.artist, pw - 100, 1)[0], 0, capY + 56);
  c.restore();

  drawFooter(c, t, qr, '#fff', 'rgba(255,255,255,0.55)', true);
}

function tMinimal(c, t, art, qr) {
  c.fillStyle = '#0a0a0a'; c.fillRect(0, 0, W, H);
  // Small art chip top-left
  var sz = 220, ax = 110, ay = 250;
  c.save(); roundRect(c, ax, ay, sz, sz, 14); c.clip();
  drawCover(c, art, ax, ay, sz, sz); c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 1;
  roundRect(c, ax, ay, sz, sz, 14); c.stroke();

  c.textAlign = 'left';
  c.fillStyle = '#666'; c.font = "700 28px 'JetBrains Mono'";
  c.fillText('NOW PLAYING', ax + sz + 36, ay + 60);
  c.fillStyle = '#ff6b35'; c.font = "400 30px 'JetBrains Mono'";
  c.fillText('♫', ax + sz + 36, ay + 130);

  // Big editorial title
  c.fillStyle = '#fff';
  var ty = 760;
  var tpx = fitFont(c, t.title, W - 220, 120, 'Instrument Sans', '700');
  var lines = wrapLines(c, t.title, W - 220, 3);
  lines.forEach(function (ln, i) { c.fillText(ln, 110, ty + i * (tpx + 6)); });
  var ay2 = ty + lines.length * (tpx + 6) + 30;
  c.fillStyle = '#999'; c.font = "400 52px 'Instrument Sans'";
  c.fillText(wrapLines(c, t.artist, W - 220, 1)[0], 110, ay2);

  drawFooter(c, t, qr, '#fff', '#666');
}

var TEMPLATES = { dark: tDark, light: tLight, vinyl: tVinyl, polaroid: tPolaroid, minimal: tMinimal };

// Shared footer: platform line + universal URL, optional QR bottom-right.
function drawFooter(c, t, qr, fg, muted, centered) {
  var baseY = H - 130;
  c.textAlign = centered ? 'center' : 'left';
  var x = centered ? W / 2 : 110;
  if (qr) { c.textAlign = 'left'; x = 110; centered = false; }

  c.fillStyle = muted;
  c.font = "400 30px 'JetBrains Mono'";
  if (t.platforms.length) c.fillText(platformsLine(t.platforms), x, baseY);
  c.fillStyle = fg; c.font = "700 32px 'JetBrains Mono'";
  var short = (t.pageUrl || '').replace(/^https?:\/\//, '');
  if (short) c.fillText(short, x, baseY + 52);

  if (qr && qr.img) {
    var qs = 190, qx = W - qs - 90, qy = H - qs - 90;
    c.fillStyle = '#fff'; roundRect(c, qx - 16, qy - 16, qs + 32, qs + 32, 14); c.fill();
    c.drawImage(qr.img, qx, qy, qs, qs);
  }
}

// ── Orchestration ──
function render() {
  var t = state.data;
  if (!t || !t._art) return;
  ctx.clearRect(0, 0, W, H);
  (TEMPLATES[state.style] || tDark)(ctx, t, t._art, t._qr ? { img: t._qrImg } : null);
}

function ensureFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load("700 86px 'Instrument Sans'"),
    document.fonts.load("400 46px 'Instrument Sans'"),
    document.fonts.load("700 32px 'JetBrains Mono'"),
    document.fonts.load("italic 400 58px 'Instrument Serif'"),
    document.fonts.load("400 84px 'Instrument Serif'")
  ]).catch(function () {});
}

function generate() {
  var input = els['card-input'].value.trim();
  if (!input) { setStatus('Paste a song link or type a search first.', 'error'); return; }
  els['generate-btn'].disabled = true;
  setStatus('Looking up song…', 'busy');

  resolve(input)
    .then(function (track) {
      setStatus('Loading artwork…', 'busy');
      return Promise.all([track, loadArtwork(track.artUrls), ensureFonts()]);
    })
    .then(function (res) {
      var track = res[0]; track._art = res[1];
      state.data = track;
      // Optional QR (best-effort; never blocks the card).
      var needQr = state.qr && track.pageUrl;
      return needQr
        ? loadImage(QR + encodeURIComponent(track.pageUrl))
            .then(function (img) { track._qrImg = img; track._qr = true; })
            .catch(function () { track._qr = false; })
        : (track._qr = false);
    })
    .then(function () {
      showCard();
      setStatus(state.data.title + ' — ' + state.data.artist, 'ok');
    })
    .catch(function (err) {
      setStatus(err.message || 'Something went wrong. Check the link and try again.', 'error');
    })
    .then(function () { els['generate-btn'].disabled = false; });
}

function showCard() {
  // QR flag may have been toggled before generate; honor current checkbox.
  state.data._qr = state.qr && !!state.data._qrImg;
  render();
  els['placeholder'].hidden = true;
  els['canvas-shell'].hidden = false;
  els['actions'].hidden = false;
  var u = state.data.pageUrl;
  if (u) {
    els['universal'].hidden = false;
    els['universal'].innerHTML = 'Universal link: <a href="' + u + '" target="_blank" rel="noopener">' +
      u.replace(/^https?:\/\//, '') + '</a>';
  }
}

function download() {
  var t = state.data; if (!t) return;
  var name = (t.artist + '-' + t.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  els['card-canvas'].toBlob(function (blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (name || 'music-card') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }, 'image/png');
}

// ── Events ──
els['generate-btn'].addEventListener('click', generate);
els['card-input'].addEventListener('keydown', function (e) { if (e.key === 'Enter') generate(); });

els['style-grid'].addEventListener('click', function (e) {
  var btn = e.target.closest('.style-btn'); if (!btn) return;
  state.style = btn.dataset.style;
  [].forEach.call(els['style-grid'].querySelectorAll('.style-btn'), function (b) {
    b.classList.toggle('is-active', b === btn);
  });
  if (state.data) render();
});

els['qr-toggle'].addEventListener('change', function (e) {
  state.qr = e.target.checked;
  if (!state.data) return;
  if (state.qr && state.data.pageUrl && !state.data._qrImg) {
    setStatus('Adding QR code…', 'busy');
    loadImage(QR + encodeURIComponent(state.data.pageUrl))
      .then(function (img) { state.data._qrImg = img; })
      .catch(function () {})
      .then(function () { showCard(); setStatus('', ''); });
  } else { showCard(); }
});

els['download-btn'].addEventListener('click', download);

els['copy-link-btn'].addEventListener('click', function () {
  var u = state.data && state.data.pageUrl; if (!u) return;
  navigator.clipboard.writeText(u).then(function () {
    var b = els['copy-link-btn'], old = b.textContent;
    b.textContent = 'Copied!';
    setTimeout(function () { b.textContent = old; }, 1500);
  });
});
