// Vercel serverless function: resolves a song link via Odesli server-side.
// Odesli's public API sends no CORS header, so the browser can't call it
// directly. This runs on the same origin as the app, sidestepping CORS
// entirely, and is far more reliable than a public proxy.

export default async function handler(req, res) {
  const link = req.query.url;

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!link || !/^https?:\/\//i.test(link)) {
    res.status(400).json({ error: 'Missing or invalid ?url= parameter.' });
    return;
  }

  const target = 'https://api.song.link/v1-alpha.1/links?songIfSingle=true&url=' +
    encodeURIComponent(link);

  try {
    const r = await fetch(target, { headers: { 'User-Agent': 'music-card/1.0' } });
    if (!r.ok) {
      res.status(r.status).json({ error: 'Odesli returned ' + r.status });
      return;
    }
    const data = await r.json();
    // Cache at the edge: the same link always resolves the same way.
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Failed to reach Odesli.' });
  }
}
