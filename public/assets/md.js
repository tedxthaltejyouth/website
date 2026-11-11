/* Tiny, safe formatter for News articles (used by /news and the portal preview).
   Blank line = new paragraph · "## " heading · "### " small heading · "> " quote · "- " or "1. " lists
   **bold** · *italic* · [text](https://link) · ![caption](https://image) on its own line. Everything is escaped first. */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { u = String(u || '').trim(); return /^(https?:\/\/|\/|#|mailto:)/i.test(u) ? u.replace(/"/g, '%22') : '#'; }
  function inline(t) {
    t = esc(t);
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, a, u) { var url = safeUrl(u.replace(/&amp;/g, '&')); return '<a href="' + url + '"' + (/^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : '') + '>' + a + '</a>'; });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return t;
  }
  function render(src) {
    var blocks = String(src || '').replace(/\r/g, '').split(/\n\s*\n/), out = [], heads = [];
    blocks.forEach(function (b) {
      b = b.replace(/^\n+|\n+$/g, ''); if (!b.trim()) return;
      var lines = b.split('\n'), m;
      if ((m = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/))) { out.push('<figure><img src="' + safeUrl(m[2]) + '" alt="' + esc(m[1]) + '" loading="lazy">' + (m[1] ? '<figcaption>' + esc(m[1]) + '</figcaption>' : '') + '</figure>'); return; }
      if (/^###\s+/.test(b)) { out.push('<h3>' + inline(b.replace(/^###\s+/, '')) + '</h3>'); return; }
      if (/^##\s+/.test(b)) { var h = b.replace(/^##\s+/, ''), id = 's-' + (heads.length + 1); heads.push({ id: id, text: h }); out.push('<h2 id="' + id + '">' + inline(h) + '</h2>'); return; }
      if (lines.every(function (l) { return /^>\s?/.test(l); })) { out.push('<blockquote>' + inline(lines.map(function (l) { return l.replace(/^>\s?/, ''); }).join(' ')) + '</blockquote>'); return; }
      if (lines.every(function (l) { return /^[-*]\s+/.test(l); })) { out.push('<ul>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^[-*]\s+/, '')) + '</li>'; }).join('') + '</ul>'); return; }
      if (lines.every(function (l) { return /^\d+[.)]\s+/.test(l); })) { out.push('<ol>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\d+[.)]\s+/, '')) + '</li>'; }).join('') + '</ol>'); return; }
      out.push('<p>' + lines.map(inline).join('<br>') + '</p>');
    });
    return { html: out.join('\n'), headings: heads };
  }
  window.TXMD = { render: render, esc: esc };
})();
