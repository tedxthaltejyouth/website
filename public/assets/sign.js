/* Signatures and signing evidence, shared by every page that signs something.
   TXSign.widget(canvas, {name: () => 'Full Name'}) turns a <canvas> into Draw / Type / Upload signature input.
     → { empty(), data(), clear(), method }   (data() is always a PNG data URL, whatever the method)
   TXSign.evidence({title}) asks for location, then takes a photo with the camera ("Look at the camera").
     → Promise<{ photo, lat, lng, accuracy, camera, location, camera_note, location_note, ua }>  (rejects if cancelled) */
(function () {
  if (window.TXSign) return;
  var FONT = 'Great Vibes';
  if (!document.querySelector('link[href*="Great+Vibes"]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap'; document.head.appendChild(l); }
  var css = '.txs-tabs{display:flex;gap:4px;margin:0 0 8px}.txs-tabs button{border:1.5px solid #d9d4c8;background:#fff;border-radius:99px;padding:6px 12px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer;color:#101B3D}' +
    '.txs-tabs button.on{background:#101B3D;color:#fff;border-color:#101B3D}.txs-row{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px;position:relative}.txs-row input{flex:1;border:1.5px solid #d9d4c8;border-radius:10px;padding:10px 12px;font:16px Inter,system-ui,sans-serif}' +
    '.txs-row .btnf{display:inline-flex;align-items:center;border:1.5px solid #101B3D;border-radius:99px;padding:8px 14px;font:700 13px Inter,sans-serif;cursor:pointer;background:#fff;color:#101B3D}' +
    '.txs-ov{position:fixed;inset:0;background:rgba(16,27,61,.62);z-index:2147483600;display:grid;place-items:center;padding:16px;font-family:Inter,system-ui,sans-serif;color:#101B3D}' +
    '.txs-box{background:#fff;border-radius:22px;width:min(520px,100%);max-height:94vh;overflow:auto;padding:22px;display:grid;gap:14px;box-shadow:8px 8px 0 #101B3D;border:2px solid #101B3D}' +
    '.txs-box h3{font-size:21px;letter-spacing:-.02em;margin:0}.txs-box p{margin:0;font-size:14px;line-height:1.5;color:#3b4466}' +
    '.txs-st{display:grid;gap:8px}.txs-st div{display:flex;gap:10px;align-items:center;font-weight:600;font-size:14px}.txs-st i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:13px;background:#eee}' +
    '.txs-st .ok i{background:#13804b;color:#fff}.txs-st .now i{background:#EB0028;color:#fff}' +
    '.txs-cam{position:relative;border-radius:16px;overflow:hidden;background:#000;aspect-ratio:4/3}.txs-cam video,.txs-cam img{width:100%;height:100%;object-fit:cover;display:block;transform:scaleX(-1)}' +
    '.txs-cam .cd{position:absolute;inset:0;display:grid;place-items:center;font:900 80px Inter,sans-serif;color:#fff;text-shadow:0 4px 20px rgba(0,0,0,.6)}' +
    '.txs-cam .lk{position:absolute;left:0;right:0;top:10px;text-align:center;color:#fff;font-weight:800;font-size:16px;text-shadow:0 2px 10px rgba(0,0,0,.7)}' +
    '.txs-btns{display:flex;gap:8px;flex-wrap:wrap}.txs-btns button{border:2px solid #101B3D;border-radius:99px;padding:10px 18px;font:800 14px Inter,sans-serif;cursor:pointer;background:#fff;color:#101B3D}' +
    '.txs-btns button.p{background:#EB0028;color:#fff;border-color:#EB0028}.txs-btns button.q{border:0;background:none;text-decoration:underline;font-weight:600;padding:10px 6px}.txs-err{background:#ffe1e6;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:600}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function widget(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d'), drawing = false, dirty = false, last = null, method = 'draw';
    var tabs = document.createElement('div'); tabs.className = 'txs-tabs';
    tabs.innerHTML = '<button type="button" data-m="draw" class="on">✍️ Draw</button><button type="button" data-m="type">⌨️ Type</button><button type="button" data-m="upload">⇪ Upload</button>';
    var row = document.createElement('div'); row.className = 'txs-row'; row.style.display = 'none';
    row.innerHTML = '<input type="text" placeholder="Type your full name" autocomplete="off"><button type="button" class="btnf" style="display:none">⇪ Choose a photo or scan of your signature</button><input type="file" accept="image/*" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">';
    canvas.parentNode.insertBefore(tabs, canvas); canvas.parentNode.insertBefore(row, canvas);
    var txt = row.querySelector('input[type=text]'), up = row.querySelector('.btnf'), file = row.querySelector('input[type=file]');
    function size() { var r = canvas.getBoundingClientRect(), d = 2; if (!r.width) return; canvas.width = r.width * d; canvas.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#101B3D'; dirty = false; }
    function pt(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function fire() { canvas.dispatchEvent(new Event('pointerup')); }
    function note(msg) { var n = row.querySelector('.txs-note'); if (!n) { n = document.createElement('div'); n.className = 'txs-note'; n.style.cssText = 'flex-basis:100%;font:600 12.5px Inter,sans-serif;color:#b00020'; row.appendChild(n); } n.textContent = msg || ''; }
    canvas.addEventListener('pointerdown', function (e) { if (method !== 'draw') return; drawing = true; last = pt(e); try { canvas.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    canvas.addEventListener('pointermove', function (e) { if (!drawing) return; var p = pt(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; dirty = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { canvas.addEventListener(ev, function () { drawing = false; }); });
    function typed() {
      size(); var v = txt.value.trim(); if (!v) return fire();
      var r = canvas.getBoundingClientRect(), fs = Math.min(64, r.height * .55);
      var go = function () { ctx.fillStyle = '#101B3D'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fs + 'px "' + FONT + '", "Brush Script MT", cursive';
        while (ctx.measureText(v).width > r.width - 30 && fs > 18) { fs -= 2; ctx.font = fs + 'px "' + FONT + '", "Brush Script MT", cursive'; }
        ctx.fillText(v, r.width / 2, r.height / 2 + 4); dirty = true; fire(); };
      if (document.fonts && document.fonts.load) document.fonts.load('40px "' + FONT + '"').then(go, go); else go();
    }
    txt.addEventListener('input', typed);
    // Upload: photo or scan. Paper and shadows become white, the ink becomes clean navy, cropped to the signature.
    function placeImage(img) {
      var W = Math.min(1600, img.naturalWidth || img.width), H = Math.round((img.naturalHeight || img.height) * W / (img.naturalWidth || img.width));
      var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, 0, 0, W, H);
      var d = x.getImageData(0, 0, W, H), p = d.data, sum = 0, n = 0, i;
      for (i = 0; i < p.length; i += 16) { sum += (p[i] + p[i + 1] + p[i + 2]) / 3; n++; }
      var thr = Math.min(200, (sum / n) * 0.72), minX = W, minY = H, maxX = -1, maxY = -1;
      for (var y = 0; y < H; y++) for (var xx = 0; xx < W; xx++) { i = (y * W + xx) * 4; var l = (p[i] + p[i + 1] + p[i + 2]) / 3;
        if (p[i + 3] > 40 && l < thr) { p[i] = 16; p[i + 1] = 27; p[i + 2] = 61; p[i + 3] = 255; if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        else { p[i] = p[i + 1] = p[i + 2] = 255; p[i + 3] = 255; } }
      if (maxX < 0) { note('We couldn’t find a signature in that image. Use dark ink on white paper, or draw it instead.'); return; }
      x.putImageData(d, 0, 0); var pad = 8; minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
      size(); var r = canvas.getBoundingClientRect(), cw = maxX - minX + 1, ch = maxY - minY + 1, k = Math.min((r.width - 20) / cw, (r.height - 20) / ch);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, r.width, r.height); ctx.drawImage(c, minX, minY, cw, ch, (r.width - cw * k) / 2, (r.height - ch * k) / 2, cw * k, ch * k);
      dirty = true; note(''); fire();
    }
    function readFile(f) {
      if (!f) return; if (!/^image\//.test(f.type) && !/\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(f.name)) return note('Please choose an image file (JPG or PNG).');
      if (f.size > 15 * 1024 * 1024) return note('That image is too large. Please use one under 15 MB.');
      note('Reading the image…');
      var url = (window.URL || window.webkitURL).createObjectURL(f), img = new Image();
      img.onload = function () { try { placeImage(img); } catch (e) { note('Couldn’t read that image. Try a JPG or PNG.'); } URL.revokeObjectURL(url); };
      img.onerror = function () { URL.revokeObjectURL(url); note(/hei[cf]/i.test(f.name + f.type) ? 'This browser can’t open HEIC photos. On iPhone, take a screenshot of the photo and upload that, or choose “Most Compatible” in Camera settings.' : 'Couldn’t open that image. Try a JPG or PNG.'); };
      img.src = url;
    }
    up.addEventListener('click', function () { file.value = ''; file.click(); });
    file.addEventListener('change', function () { readFile(file.files && file.files[0]); });
    canvas.addEventListener('dragover', function (e) { if (method === 'upload') e.preventDefault(); });
    canvas.addEventListener('drop', function (e) { if (method !== 'upload') return; e.preventDefault(); readFile(e.dataTransfer.files[0]); });
    tabs.onclick = function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return; method = b.dataset.m;
      [].forEach.call(tabs.children, function (x) { x.classList.toggle('on', x === b); });
      row.style.display = method === 'draw' ? 'none' : 'flex'; txt.style.display = method === 'type' ? '' : 'none'; up.style.display = method === 'upload' ? '' : 'none'; note('');
      canvas.style.cursor = method === 'draw' ? 'crosshair' : 'default';
      size(); if (method === 'type') { if (!txt.value && opts.name) txt.value = opts.name() || ''; typed(); txt.focus(); } fire();
    };
    setTimeout(size, 0);
    return { clear: function () { size(); if (method === 'type') txt.value = ''; fire(); }, empty: function () { return !dirty; },
      data: function () { var c = document.createElement('canvas'); c.width = 600; c.height = 200; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 200); x.drawImage(canvas, 0, 0, 600, 200); return c.toDataURL('image/png'); },
      get method() { return method; } };
  }

  function evidence(opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var ev = { ua: navigator.userAgent }, stream = null;
      var ov = document.createElement('div'); ov.className = 'txs-ov';
      ov.innerHTML = '<div class="txs-box" role="dialog" aria-modal="true"><h3>' + (opts.title || 'Confirm it’s you') + '</h3>' +
        '<p>To make your signature verifiable, we record the area you are signing from and take one photo with your camera. Both are kept privately in TEDxThaltej Youth’s records and printed on the signing record.</p>' +
        '<div class="txs-st"><div data-s="loc"><i>1</i>Share your location</div><div data-s="cam"><i>2</i>Look at the camera for a photo</div></div><div id="txsBody"></div></div>';
      document.body.appendChild(ov);
      var body = ov.querySelector('#txsBody');
      function mark(s, cls) { var el = ov.querySelector('[data-s=' + s + ']'); el.className = cls; el.querySelector('i').textContent = cls === 'ok' ? '✓' : s === 'loc' ? '1' : '2'; }
      function close() { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); ov.remove(); }
      function cancelBtn() { return '<button type="button" class="q" data-x="cancel">Cancel</button>'; }
      ov.addEventListener('click', function (e) { if (e.target.closest('[data-x=cancel]')) { close(); reject(new Error('Signing cancelled.')); } });

      function askLocation() {
        mark('loc', 'now');
        body.innerHTML = '<p>Your browser will ask to share your location. Please tap <b>Allow</b>.</p><div class="txs-btns"><button type="button" class="p" id="txsLoc">Share my location</button>' + cancelBtn() + '</div>';
        ov.querySelector('#txsLoc').onclick = function () {
          this.disabled = true; this.textContent = 'Finding you…';
          if (!navigator.geolocation) return noLoc('This browser cannot share location.', true);
          navigator.geolocation.getCurrentPosition(function (p) {
            ev.location = 'ok'; ev.lat = p.coords.latitude; ev.lng = p.coords.longitude; ev.accuracy = p.coords.accuracy; mark('loc', 'ok'); askCamera();
          }, function (er) { noLoc(er.code === 1 ? 'Location is blocked for this site. Open your browser’s site settings, allow Location, then tap Try again.' : 'We could not get your location (' + (er.message || 'timeout') + ').', er.code !== 1); },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
        };
      }
      function noLoc(msg, allowSkip) {
        body.innerHTML = '<div class="txs-err">' + msg + '</div><div class="txs-btns"><button type="button" class="p" id="txsRetry">Try again</button>' +
          (allowSkip ? '<button type="button" id="txsSkipL">My device can’t share location</button>' : '') + cancelBtn() + '</div>';
        ov.querySelector('#txsRetry').onclick = askLocation;
        if (allowSkip) ov.querySelector('#txsSkipL').onclick = function () { ev.location = 'unavailable'; ev.location_note = msg.slice(0, 180); mark('loc', 'ok'); askCamera(); };
      }
      function askCamera() {
        mark('cam', 'now');
        body.innerHTML = '<p>Next, allow the camera. A photo is taken automatically after a short countdown.</p><div class="txs-btns"><button type="button" class="p" id="txsCam">Turn on camera</button>' + cancelBtn() + '</div>';
        ov.querySelector('#txsCam').onclick = function () {
          this.disabled = true;
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return noCam('This browser cannot use the camera.', true);
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }).then(function (s) { stream = s; shoot(); })
            .catch(function (er) { noCam(er.name === 'NotAllowedError' ? 'The camera is blocked for this site. Open your browser’s site settings, allow Camera, then tap Try again.' : er.name === 'NotFoundError' ? 'No camera was found on this device.' : 'The camera could not start (' + er.name + ').', er.name !== 'NotAllowedError'); });
        };
      }
      function noCam(msg, allowSkip) {
        body.innerHTML = '<div class="txs-err">' + msg + '</div><div class="txs-btns"><button type="button" class="p" id="txsRetryC">Try again</button>' +
          (allowSkip ? '<button type="button" id="txsSkipC">My device has no camera</button>' : '') + cancelBtn() + '</div>';
        ov.querySelector('#txsRetryC').onclick = askCamera;
        if (allowSkip) ov.querySelector('#txsSkipC').onclick = function () { ev.camera = 'unavailable'; ev.camera_note = msg.slice(0, 180); mark('cam', 'ok'); done(); };
      }
      function shoot() {
        body.innerHTML = '<div class="txs-cam"><video autoplay playsinline muted></video><div class="lk">👀 Look at the camera</div><div class="cd"></div></div>';
        var v = body.querySelector('video'), cd = body.querySelector('.cd'); v.srcObject = stream;
        var n = 3; cd.textContent = n;
        var t = setInterval(function () {
          n--; if (n > 0) { cd.textContent = n; return; }
          clearInterval(t); cd.textContent = '';
          var c = document.createElement('canvas'), w = v.videoWidth || 640, h = v.videoHeight || 480, k = Math.min(1, 640 / w);
          c.width = w * k; c.height = h * k; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          var photo = c.toDataURL('image/jpeg', .82);
          body.innerHTML = '<div class="txs-cam"><img alt="Your photo"></div><div class="txs-btns"><button type="button" class="p" id="txsUse">Use this photo and sign</button><button type="button" id="txsRe">Retake</button>' + cancelBtn() + '</div>';
          body.querySelector('img').src = photo;
          ov.querySelector('#txsUse').onclick = function () { ev.camera = 'ok'; ev.photo = photo; mark('cam', 'ok'); done(); };
          ov.querySelector('#txsRe').onclick = shoot;
        }, 1000);
      }
      function done() { close(); resolve(ev); }
      askLocation();
    });
  }
  window.TXSign = { widget: widget, evidence: evidence };
})();
