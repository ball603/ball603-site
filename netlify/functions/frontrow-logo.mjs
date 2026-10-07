// Team and conference logos for NEC Front Row.
// Grabs each school's official logo from its own athletics website once,
// then Netlify's network keeps a copy for 30 days, so visitors get it fast
// and we're not leaning on the schools' servers. If a school's site can't be
// reached, a clean badge with the school's initials is shown instead.

const LOGOS = {
  nec:  { url: 'https://dbukjj6eu5tsf.cloudfront.net/sidearm.sites/northeastconference.org/images/responsive/logo-main.svg', abbr: 'NEC', color: '#1f8fd6' },
  nsu:  { url: 'https://nsuspartans.com/images/logos/site/site.png',        abbr: 'NSU',  color: '#007A53' },
  rmu:  { url: 'https://rmucolonials.com/images/logos/site/site.png',       abbr: 'RMU',  color: '#14234B' },
  wag:  { url: 'https://wagnerathletics.com/images/logos/site/site.png',    abbr: 'WAG',  color: '#00483A' },
  ccsu: { url: 'https://necsports.com/images/logos/Central-Connecticut-State.png', abbr: 'CCSU', color: '#1B49A2' },
  rio:  { url: '',                                                          abbr: 'RIO',  color: '#C8102E' },
  duq:  { url: 'https://goduquesne.com/images/logos/site/site.png',         abbr: 'DUQ',  color: '#002D72' },
  gsu:  { url: 'https://gstatepioneers.com/images/logos/site/site.png',     abbr: 'GSU',  color: '#003DA5' },
  merc: { url: 'https://hurstathletics.com/images/logos/site/site.png',     abbr: 'MERC', color: '#00563F' },
  nova: { url: 'https://villanova.com/images/logos/site/site.png',          abbr: 'NOVA', color: '#00205B' },
  liu:  { url: 'https://www.liuathletics.com/images/logos/site/site.png',   abbr: 'LIU',  color: '#2E86C8' },
  brwn: { url: 'https://brownbears.com/images/logos/site/site.png',         abbr: 'BRWN', color: '#4E3629' },
  unh:  { url: 'https://newhavenchargers.com/images/logos/site/site.png',   abbr: 'UNH',  color: '#0C2340' },
  alb:  { url: 'https://ualbanysports.com/images/logos/site/site.png',      abbr: 'ALB',  color: '#46166B' },
  chs: { url: 'https://gocsucougars.com/images/logos/site/site.png', abbr: 'CHS', color: '#00664F' },
  fdu: { url: 'https://fduknights.com/images/logos/site/site.png', abbr: 'FDU', color: '#72293C' },
  lem: { url: 'https://lemoynedolphins.com/images/logos/site/site.png', abbr: 'LEM', color: '#00573F' },
  sto: { url: 'https://stonehillskyhawks.com/images/logos/site/site.png', abbr: 'STO', color: '#2F2A85' },
  bing: { url: 'https://bubearcats.com/images/logos/site/site.png', abbr: 'BING', color: '#005A43' },
  clev: { url: 'https://csuvikings.com/images/logos/site/site.png', abbr: 'CLEV', color: '#006A4D' },
  copp: { url: 'https://coppinstatesports.com/images/logos/site/site.png', abbr: 'COPP', color: '#003DA5' },
  daem: { url: 'https://daemenwildcats.com/images/logos/site/site.png', abbr: 'DAEM', color: '#003B71' },
  dsu: { url: 'https://dsuhornets.com/images/logos/site/site.png', abbr: 'DSU', color: '#C8102E' },
  udm: { url: 'https://detroittitans.com/images/logos/site/site.png', abbr: 'UDM', color: '#A6192E' },
  dyu: { url: 'https://dyusaints.com/images/logos/site/site.png', abbr: 'DYU', color: '#0B2341' },
  how: { url: 'https://hubison.com/images/logos/site/site.png', abbr: 'HOW', color: '#003A63' },
  man: { url: 'https://gojaspers.com/images/logos/site/site.png', abbr: 'MAN', color: '#00703C' },
  umes: { url: 'https://easternshorehawks.com/images/logos/site/site.png', abbr: 'UMES', color: '#8B2332' },
  merr: { url: 'https://merrimackathletics.com/images/logos/site/site.png', abbr: 'MERR', color: '#003768' },
  monm: { url: 'https://monmouthhawks.com/images/logos/site/site.png', abbr: 'MONM', color: '#0E2A50' },
  niag: { url: 'https://purpleeagles.com/images/logos/site/site.png', abbr: 'NIAG', color: '#4B2E83' },
  nccu: { url: 'https://nccueaglepride.com/images/logos/site/site.png', abbr: 'NCCU', color: '#862633' },
  qu: { url: 'https://gobobcats.com/images/logos/site/site.png', abbr: 'QU', color: '#0C2340' },
  rid: { url: 'https://gobroncs.com/images/logos/site/site.png', abbr: 'RID', color: '#9D2235' },
  shu: { url: 'https://sacredheartpioneers.com/images/logos/site/site.png', abbr: 'SHU', color: '#CE1141' },
  vmi: { url: 'https://vmikeydets.com/images/logos/site/site.png', abbr: 'VMI', color: '#AE122A' },
  sfu: { url: 'https://sfuathletics.com/images/logos/site/site.png', abbr: 'SFU', color: '#B8232F' },
  hws: { url: 'https://hwsathletics.com/images/logos/site/site.png', abbr: 'HWS', color: '#4E2A84' },
  hob: { url: 'https://hwsathletics.com/images/logos/site/site.png', abbr: 'HOB', color: '#4E2A84' },
  wsc: { url: 'https://hwsathletics.com/images/logos/site/site.png', abbr: 'WS', color: '#00573F' },
};

const KEEP = {
  'cache-control': 'public, max-age=86400',
  'netlify-cdn-cache-control': 'public, durable, max-age=2592000, stale-while-revalidate=604800',
  'access-control-allow-origin': '*',
};

function badge(abbr, color) {
  const size = abbr.length > 3 ? 30 : 36;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="${color}" stroke="#fff" stroke-opacity=".25" stroke-width="2"/><text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Arial Narrow,Arial,sans-serif" font-weight="700" font-size="${size}" fill="#fff">${abbr}</text></svg>`;
  return new Response(svg, { headers: { ...KEEP, 'content-type': 'image/svg+xml' } });
}

export default async (req) => {
  const key = (new URL(req.url).searchParams.get('t') || '').toLowerCase();
  const item = LOGOS[key];
  if (!item) return new Response('Unknown team', { status: 404 });
  if (!item.url) return badge(item.abbr, item.color);
  try {
    const r = await fetch(item.url, { headers: { 'user-agent': 'Mozilla/5.0 (NEC Front Row logo fetch)', accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*' } });
    if (!r.ok) throw new Error(String(r.status));
    const type = r.headers.get('content-type') || 'image/png';
    if (!type.startsWith('image/')) throw new Error('not an image');
    return new Response(await r.arrayBuffer(), { headers: { ...KEEP, 'content-type': type } });
  } catch {
    return badge(item.abbr, item.color);
  }
};
