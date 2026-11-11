/* Shared site chrome: the same header, mobile menu and footer on every page.
   <script src="/assets/site.js" defer
     data-hide="#nav, footer"            page's own header/footer to replace
     data-sub="#nav"                     take this page's in-page links (#...) for the "On this page" strip
     data-title="2025 · A Light Towards Wisdom"   label for that strip
     data-cta="Become a Steward|/ais/apply"></script> */
(function () {
  var me = document.currentScript || document.querySelector('script[src*="/assets/site.js"]');
  var ds = (me && me.dataset) || {};
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  if (!document.querySelector('link[href*="/assets/site.css"]')) {
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/site.css'; document.head.appendChild(l);
  }
  if (!document.querySelector('link[href*="family=Anton"]')) {
    var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800;900&display=swap'; document.head.appendChild(f);
  }
  if (!document.querySelector('link[rel="icon"]')) {
    var ic = document.createElement('link'); ic.rel = 'icon'; ic.href = '/favicon.png'; document.head.appendChild(ic);
  }

  var LINKS = [['/#editions', 'Editions'], ['/ais', 'Idea Search'], ['/virasat', 'Virasat'], ['/events', 'Events'], ['/news', 'News'], ['/team', 'Team'], ['/partner', 'Partner'], ['/join', 'Join us']];
  var path = location.pathname.replace(/\/+$/, '') || '/';
  var on = function (h) { var p = h.split('#')[0].replace(/\/+$/, ''); return p && p !== '' && (path === p || path.indexOf(p + '/') === 0); };

  function build() {
    // hide the page's own header / footer
    if (ds.hide) document.querySelectorAll(ds.hide).forEach(function (n) { n.style.display = 'none'; n.setAttribute('aria-hidden', 'true'); });

    var sub = '';
    if (ds.sub) {
      var src = document.querySelector(ds.sub), items = [];
      if (src) src.querySelectorAll('a[href^="#"]').forEach(function (a) { var t = a.textContent.trim(); if (t && a.getAttribute('href').length > 1) items.push([a.getAttribute('href'), t]); });
      var cta = (ds.cta || '').split('|');
      if (items.length || ds.title) sub = '<div class="tx-sub"><div class="tx-wrap">' + (ds.title ? '<b>' + esc(ds.title) + '</b>' : '') +
        items.map(function (x) { return '<a href="' + esc(x[0]) + '">' + esc(x[1]) + '</a>'; }).join('') +
        (cta[1] ? '<a class="cta" href="' + esc(cta[1]) + '">' + esc(cta[0]) + ' →</a>' : '') + '</div></div>';
    }
    var bar = el('<div class="tx-bar" role="banner"><div class="tx-wrap tx-row">' +
      '<a class="tx-logo" href="/" aria-label="TEDxThaltej Youth home"><img src="/assets/logo-black.png" alt="TEDxThaltej Youth" width="218" height="24"></a>' +
      '<div class="tx-links">' + LINKS.map(function (x) { return '<a href="' + x[0] + '"' + (on(x[0]) ? ' class="on"' : '') + '>' + x[1] + '</a>'; }).join('') +
      '<a class="tx-btn" href="/#attend">Attend</a></div>' +
      '<button class="tx-burger" type="button" aria-label="Menu" aria-expanded="false">☰</button></div>' + sub + '</div>');
    var drawer = el('<div class="tx-drawer" role="dialog" aria-label="Menu"><a href="/">Home</a>' + LINKS.map(function (x) { return '<a href="' + x[0] + '">' + x[1] + '</a>'; }).join('') +
      '<a href="/speaker">Speaker portal</a><a href="/portal">Team portal</a><a href="/#attend" style="color:#EB0028">Attend →</a></div>');
    document.body.insertBefore(drawer, document.body.firstChild);
    document.body.insertBefore(bar, document.body.firstChild);
    var bg = bar.querySelector('.tx-burger');
    bg.onclick = function () { var o = drawer.classList.toggle('on'); bg.setAttribute('aria-expanded', o); bg.textContent = o ? '✕' : '☰'; };
    drawer.onclick = function (e) { if (e.target.tagName === 'A') { drawer.classList.remove('on'); bg.textContent = '☰'; } };

    // anchor jumps should land below the sticky header
    var hh = function () { return bar.getBoundingClientRect().height + 8; };
    document.documentElement.style.scrollPaddingTop = hh() + 'px';

    var foot = el('<footer class="tx-foot" role="contentinfo"><div class="tx-wrap">' +
      '<div class="tx-fbig">Ideas worth<br><span>spreading</span><i>.</i></div>' +
      '<form class="tx-sub" id="txSub"><div><b>Stay informed</b><span>Speakers, side events and ways to take part. A few emails a month.</span></div><input type="email" name="email" placeholder="you@example.com" required aria-label="Your email"><input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true"><button>Subscribe</button><em id="txSubM"></em></form>' +
      '<div class="tx-fcols">' +
      '<div><img src="/assets/logo-white.png" alt="TEDxThaltej Youth" style="height:28px;width:auto;display:block"><p>A youth-led TEDx event from Thaltej, Ahmedabad. x = independently organised TED event.</p>' +
      (ds.contact ? '<p>Questions about this page: <a href="mailto:' + esc(ds.contact) + '" style="color:#fff;font-weight:700">' + esc(ds.contact) + '</a></p>' : '') +
      '<div class="tx-soc"><a href="https://www.instagram.com/tedxthaltejyouth" target="_blank" rel="noopener">Instagram</a><a href="https://www.linkedin.com/company/tedxthaltej-youth/" target="_blank" rel="noopener">LinkedIn</a><a href="https://youtu.be/GG64ZSxIqtQ" target="_blank" rel="noopener">YouTube</a></div></div>' +
      '<div><h5>Editions</h5><a href="/2025">2025 · A Light Towards Wisdom</a><a href="/2026">2026 · Kaleidoscope</a><a href="/2027">2027 · The Zenith</a></div>' +
      '<div><h5>Programmes</h5><a href="/ais">Ahmedabad Idea Search</a><a href="/ais/apply">Steward Desk</a><a href="/virasat">Virasat</a><a href="/events">Side events</a><a href="/story">The story of an idea</a></div>' +
      '<div><h5>Organisation</h5><a href="/news">News</a><a href="/team">Our team</a><a href="/join">Join the team</a><a href="/partner">Partner with us</a><a href="/speaker">Speaker portal</a><a href="/portal">Team portal</a><a href="/subscribe">Stay informed</a><a href="/verify">Verify a document</a><a href="/sitemap">Sitemap</a></div>' +
      '</div><div class="tx-fine"><b>This independent TEDx event is operated under license from TED.</b><span>© ' + new Date().getFullYear() + ' TEDxThaltej Youth · Ahmedabad, India</span></div></div></footer>');
    document.body.appendChild(foot);
    var sf = foot.querySelector('#txSub');
    if (sf) sf.onsubmit = function (e) {
      e.preventDefault(); var b = sf.querySelector('button'), m = sf.querySelector('#txSubM'); b.disabled = true; m.textContent = '';
      var p = window.TXTY_API ? fetch(window.TXTY_API, { method: 'POST', body: JSON.stringify({ action: 'sub_join', email: sf.email.value, website: sf.website.value, source: 'footer:' + location.pathname.split('/')[1] }) }).then(function (r) { return r.json(); }) : Promise.resolve({ ok: true });
      p.then(function (r) { if (!r.ok) throw new Error(r.error); m.textContent = r.already ? 'You’re already subscribed ✓' : 'Check your inbox to confirm ✓'; sf.reset(); })
       .catch(function (x) { m.textContent = x.message || 'Please try again.'; }).then(function () { b.disabled = false; });
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
