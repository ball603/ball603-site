// Ball603 Page Sponsor Utility
// Fetches and renders a sponsor banner for data pages (standings, rpi, playoffs, etc.)
// Usage: loadPageSponsor('rpi', 'basketball')  — call on page load and on sport change

window.Ball603PageSponsor = (function() {

  // Cache to avoid re-fetching for same page+sport
  const _cache = {};

  async function fetchPageSponsor(page, sport) {
    const key = `${page}:${sport}`;
    if (_cache[key] !== undefined) return _cache[key];

    try {
      const res = await fetch(`/.netlify/functions/get-sponsors?page=${encodeURIComponent(page)}&sport=${encodeURIComponent(sport)}`);
      const data = await res.json();
      const sponsors = data.sponsors || [];
      // Pick one randomly if multiple
      const sponsor = sponsors.length > 0 ? sponsors[Math.floor(Math.random() * sponsors.length)] : null;
      _cache[key] = sponsor;
      return sponsor;
    } catch (e) {
      _cache[key] = null;
      return null;
    }
  }

  function renderBanner(containerId, sponsor, sportLabel) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!sponsor) {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'flex';
    el.innerHTML = `
      <style>
        #${containerId} {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 10px 20px;
          background: #fff;
          border: 1px solid #eee;
          border-radius: 10px;
          margin: 0 0 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        #${containerId} .psb-label {
          font-size: 10px;
          font-weight: 700;
          color: #aaa;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        #${containerId} a {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #333;
        }
        #${containerId} img {
          height: 32px;
          max-width: 120px;
          object-fit: contain;
        }
        #${containerId} .psb-sname {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }
        @media (max-width: 480px) {
          #${containerId} {
            flex-direction: column;
            align-items: center;
            gap: 8px;
            text-align: center;
            padding: 12px 14px;
          }
          #${containerId} a {
            flex-direction: column;
            align-items: center;
            gap: 6px;
          }
          #${containerId} img { height: 32px; max-width: 140px; }
          #${containerId} .psb-sname { font-size: 13px; }
        }
      </style>
      <span class="psb-label">${sportLabel ? sportLabel + ' ' : ''}Presented By</span>
      <a href="${sponsor.url || '#'}" ${sponsor.url ? 'target="_blank" rel="noopener"' : ''} title="${sponsor.name}">
        ${sponsor.logo_url ? `<img src="${sponsor.logo_url}" alt="${sponsor.name}" onerror="this.style.display='none'">` : ''}
        <span class="psb-sname">${sponsor.name}</span>
      </a>
    `;
  }

  async function load(containerId, page, sport, sportLabel) {
    const sponsor = await fetchPageSponsor(page, sport || 'basketball');
    renderBanner(containerId, sponsor, sportLabel || '');
  }

  return { load };

})();
