// Fetches a Hudl stream's starting playlist for the multiview player.
// Hudl blocks this one file when another website asks for it directly,
// so the site fetches it here and passes it along. Only Hudl stream IDs are allowed.
export default async (req) => {
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^\d{1,12}$/.test(id)) return new Response('Missing or bad stream id', { status: 400 });

  const src = `https://vcloud.hudl.com/file/hls/${id}.m3u8`;
  let r;
  try { r = await fetch(src); } catch { return new Response('Could not reach Hudl', { status: 502 }); }
  if (!r.ok) return new Response('Hudl returned ' + r.status, { status: r.status });

  const base = r.url || src;
  const abs = (u) => { try { return new URL(u, base).href; } catch { return u; } };
  const text = (await r.text())
    .split('\n')
    .map((l) => (l && !l.startsWith('#') ? abs(l.trim()) : l.replace(/URI="([^"]+)"/g, (m, u) => `URI="${abs(u)}"`)))
    .join('\n');

  return new Response(text, {
    headers: {
      'content-type': 'application/vnd.apple.mpegurl',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=5',
    },
  });
};
