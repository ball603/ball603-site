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

// Opponents (from the On Demand library): the NCAA's official logo for each school, by its NCAA name.
// Some logos only exist in the NCAA's light-background folder, so we try both.
const NCAA = {"x-aic":["american-intl","AIC"],"x-air-force":["air-force","AF"],"x-akron":["akron","AKRO"],"x-alabama-a-m":["alabama-am","AAM"],"x-alaska-anchorage":["alas-anchorage","AA"],"x-albertus-magnus":["albertus-magnus","AM"],"x-alfred":["alfred","ALFR"],"x-allegheny":["allegheny","ALLE"],"x-american":["american","AMER"],"x-army":["army","ARMY"],"x-ashland":["ashland","ASHL"],"x-assumption":["assumption","ASSU"],"x-augustana":["augustana-sd","AUGU"],"x-austin-peay":["austin-peay","AP"],"x-bard":["bard","BARD"],"x-bentley":["bentley","BENT"],"x-bethany":["bethany-wv","BETH"],"x-bloomfield":["bloomfield","BLOO"],"x-bloomsburg":["bloomsburg","BLOO"],"x-boston":["boston-u","BOST"],"x-boston-college":["boston-college","BC"],"x-bowdoin":["bowdoin","BOWD"],"x-bowling-green":["bowling-green","BG"],"x-brandeis":["brandeis","BRAN"],"x-bridgeport":["bridgeport","BRID"],"x-bridgewater-state":["bridgewater-st","BS"],"x-bryant":["bryant","BRYA"],"x-bucknell":["bucknell","BUCK"],"x-buffalo":["buffalo","BUFF"],"x-buffalo-state":["buffalo-st","BS"],"x-california-pa":["california-pa","CP"],"x-canisius":["canisius","CANI"],"x-canton":["suny-canton","CANT"],"x-carnegie-mellon":["carnegie-mellon","CM"],"x-catawba":["catawba","CATA"],"x-catholic":["catholic","CATH"],"x-central-michigan":["central-mich","CM"],"x-clarkson":["clarkson","CLAR"],"x-clemson":["clemson","CLEM"],"x-colgate":["colgate","COLG"],"x-columbia":["columbia","COLU"],"x-cornell":["cornell","CORN"],"x-cortland":["suny-cortland","CORT"],"x-dartmouth":["dartmouth","DART"],"x-davidson":["davidson","DAVI"],"x-dayton":["dayton","DAYT"],"x-delaware":["delaware","DELA"],"x-dominican":["dominican-ny","DOMI"],"x-dominican-ny":["dominican-ny","DN"],"x-drexel":["drexel","DREX"],"x-east-stroudsburg":["east-stroudsburg","ES"],"x-east-texas-a-m":["tex-am-commerce","ETAM"],"x-eastern-illinois":["eastern-ill","EI"],"x-elmira":["elmira","ELMI"],"x-fairfield":["fairfield","FAIR"],"x-fordham":["fordham","FORD"],"x-franciscan":["franciscan","FRAN"],"x-franklin-marshall":["frank-marsh","FM"],"x-franklin-pierce":["franklin-pierce","FP"],"x-fredonia":["fredonia-st","FRED"],"x-frostburg-state":["frostburg-st","FS"],"x-gannon":["gannon","GANN"],"x-george-mason":["george-mason","GM"],"x-george-washington":["george-washington","GW"],"x-georgetown":["georgetown","GEOR"],"x-georgian-court":["georgian-court","GC"],"x-gettysburg":["gettysburg","GETT"],"x-grove-city":["grove-city","GC"],"x-hamilton":["hamilton","HAMI"],"x-hampton":["hampton","HAMP"],"x-hartwick":["hartwick","HART"],"x-harvard":["harvard","HARV"],"x-hawai-i":["hawaii","HAWA"],"x-high-point":["high-point","HP"],"x-hiram":["hiram","HIRA"],"x-hofstra":["hofstra","HOFS"],"x-holy-cross":["holy-cross","HC"],"x-iona":["iona","IONA"],"x-ithaca":["ithaca","ITHA"],"x-jacksonville":["jacksonville","JACK"],"x-james-madison":["james-madison","JM"],"x-johnson-wales-ri":["johnson-wales-ri","JWR"],"x-kean":["kean","KEAN"],"x-kennesaw-state":["kennesaw-st","KS"],"x-kent-state":["kent-st","KS"],"x-la-salle":["la-salle","LS"],"x-lafayette":["lafayette","LAFA"],"x-lake-superior-state":["lake-superior-st","LSS"],"x-lehigh":["lehigh","LEHI"],"x-lehman":["lehman","LEHM"],"x-lincoln-pa":["lincoln-pa","LP"],"x-lindenwood":["lindenwood-mo","LIND"],"x-lock-haven":["lock-haven","LH"],"x-maine":["maine","MAIN"],"x-manhattanville":["manhattanville","MANH"],"x-marist":["marist","MARI"],"x-marymount":["marymount-va","MARY"],"x-merchant-marine":["merchant-marine","MM"],"x-mercy":["mercy","MERC"],"x-michigan-state":["michigan-st","MS"],"x-minnesota":["minnesota","MINN"],"x-misericordia":["misericordia","MISE"],"x-missouri-s-t":["missouri-snt","MST"],"x-mit":["mit","MIT"],"x-mitchell":["mitchell","MITC"],"x-montclair-state":["montclair-st","MS"],"x-morehead-state":["morehead-st","MS"],"x-morgan-state":["morgan-st","MS"],"x-morrisville":["morrisville-st","MORR"],"x-mount-st-mary-s":["mt-st-marys","MSM"],"x-navy":["navy","NAVY"],"x-nazareth":["nazareth","NAZA"],"x-new-hampshire":["new-hampshire","NH"],"x-new-jersey-city":["new-jersey-city","NJC"],"x-new-paltz":["suny-new-paltz","NP"],"x-njit":["njit","NJIT"],"x-northeastern":["northeastern","NORT"],"x-norwich":["norwich","NORW"],"x-nyu":["new-york-u","NYU"],"x-oakland":["oakland","OAKL"],"x-oswego":["oswego-st","OSWE"],"x-pace":["pace","PACE"],"x-penn":["penn","PENN"],"x-penn-state":["penn-st","PS"],"x-penn-state-behrend":["penn-st-behrend","PSB"],"x-plattsburgh":["plattsburgh-st","PLAT"],"x-post":["post","POST"],"x-potsdam":["suny-potsdam","POTS"],"x-presbyterian":["presbyterian","PRES"],"x-princeton":["princeton","PRIN"],"x-providence":["providence","PROV"],"x-queens-of-charlotte":["queens-nc","QC"],"x-radford":["radford","RADF"],"x-rhode-island":["rhode-island","RI"],"x-rit":["rochester-inst","RIT"],"x-roberts-wesleyan":["roberts-wesleyan","RW"],"x-roosevelt":["roosevelt-university","ROOS"],"x-rpi":["rensselaer","RPI"],"x-russell-sage":["sage-colleges","RS"],"x-rutgers":["rutgers","RUTG"],"x-sage":["sage-colleges","SAGE"],"x-saginaw-valley-state":["saginaw-valley","SVS"],"x-saint-anselm":["st-anselm","SA"],"x-saint-elizabeth":["st-elizabeth","SE"],"x-saint-joseph-s":["saint-josephs","SJ"],"x-saint-louis":["saint-louis","SL"],"x-saint-michael-s":["saint-michaels","SM"],"x-saint-peter-s":["st-peters","SP"],"x-salve-regina":["salve-regina","SR"],"x-seton-hall":["seton-hall","SH"],"x-siena":["siena","SIEN"],"x-simon-fraser":["simon-fraser","SF"],"x-skidmore":["skidmore","SKID"],"x-slippery-rock":["slippery-rock","SR"],"x-southern-connecticut":["southern-conn-st","SC"],"x-southern-illinois":["southern-ill","SI"],"x-springfield":["springfield","SPRI"],"x-st-bonaventure":["st-bonaventure","SB"],"x-st-john-fisher":["st-john-fisher","SJF"],"x-st-john-s":["st-johns-ny","SJ"],"x-st-lawrence":["st-lawrence","SL"],"x-st-thomas-aquinas":["st-thomas-aquinas","STA"],"x-stony-brook":["stony-brook","SB"],"x-suny-cobleskill":["cobleskill-st","SC"],"x-suny-geneseo":["suny-geneseo","SG"],"x-suny-new-paltz":["suny-new-paltz","SNP"],"x-suny-polytechnic-institute":["sunyit","SPI"],"x-suny-purchase":["purchase-st","SP"],"x-syracuse":["syracuse","SYRA"],"x-temple":["temple","TEMP"],"x-thomas":["thomas-me","THOM"],"x-towson":["towson","TOWS"],"x-trine":["trine","TRIN"],"x-uc-davis":["uc-davis","UD"],"x-uic":["ill-chicago","UIC"],"x-umass":["massachusetts","UMAS"],"x-umass-lowell":["umass-lowell","UL"],"x-union":["union-ny","UNIO"],"x-university-of-rochester":["rochester-ny","UR"],"x-ursinus":["ursinus","URSI"],"x-ut-martin":["ut-martin","UM"],"x-utica":["utica","UTIC"],"x-vassar":["vassar","VASS"],"x-vermont":["vermont","VERM"],"x-vermont-state-johnson":["johnson-st","VSJ"],"x-vermont-state-lyndon":["lyndon-st","VSL"],"x-virginia-state":["virginia-st","VS"],"x-vul":["virginia-union","VUL"],"x-walsh":["walsh","WALS"],"x-washington-and-jefferson":["wash-jeff","WJ"],"x-west-liberty":["west-liberty","WL"],"x-west-virginia-state":["west-virginia-st","WVS"],"x-western-connecticut-state":["western-conn-st","WCS"],"x-wheaton-mass":["wheaton-ma","WM"],"x-wilkes":["wilkes","WILK"],"x-winthrop":["winthrop","WINT"],"x-xavier":["xavier","XAVI"],"x-yale":["yale","YALE"],"x-york":["york-ny","YORK"],"x-youngstown-state":["youngstown-st","YS"]};
const NCAA_URL = (slug, dir) => `https://www.ncaa.com/sites/default/files/images/logos/schools/${dir}/${slug}.svg`;

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
  if (NCAA[key]) {
    const [slug, abbr] = NCAA[key];
    for (const dir of ['bgd', 'bgl']) {
      try {
        const r = await fetch(NCAA_URL(slug, dir), { headers: { 'user-agent': 'Mozilla/5.0 (NEC Front Row logo fetch)' } });
        const body = r.ok ? await r.text() : '';
        if (body.includes('<svg')) return new Response(body, { headers: { ...KEEP, 'content-type': 'image/svg+xml' } });   // a missing logo comes back empty
      } catch {}
    }
    return badge(abbr, '#3a4a63');
  }
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
