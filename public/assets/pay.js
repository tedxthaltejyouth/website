/* TEDxThaltej Youth: UPI payment box. TXPAY.render(element, payment) shows the amount, a UPI QR code with the amount
   filled in, a "Pay with UPI app" button for phones, the UPI ID to copy, and the form for the UPI transaction ID (UTR).
   Needs /assets/qr.js. Payments are confirmed by the Finance team after they see the money in the account. */
(function(){
  var API=window.TXTY_API||'';
  var css='.txp,.txp *{box-sizing:border-box}.txp{background:#fff;border:2.5px solid #101B3D;border-radius:26px;padding:24px;box-shadow:8px 8px 0 #101B3D;color:#101B3D;font-family:Inter,Helvetica,Arial,sans-serif;max-width:560px}'+
  '.txp h3{font-family:Anton,Impact,sans-serif;font-weight:400;text-transform:uppercase;font-size:30px;line-height:1}.txp .amt{font-family:Anton,Impact,sans-serif;font-size:54px;line-height:1;margin:6px 0 2px}'+
  '.txp .to{font-size:14px;color:#3b4466;font-weight:600}.txp .grid{display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center;margin-top:16px}'+
  '.txp .qr{background:#fff;border:2px solid #101B3D;border-radius:18px;padding:8px;line-height:0}.txp .qr svg{width:190px;height:190px}'+
  '.txp .st{display:grid;gap:10px;font-size:14px}.txp .st b{display:block}.txp .copy{display:flex;gap:8px;align-items:center;background:#FFF4E2;border-radius:12px;padding:8px 10px;font-weight:700;font-size:14px;word-break:break-all}'+
  '.txp .copy button{margin-left:auto;border:2px solid #101B3D;background:#fff;border-radius:999px;padding:4px 12px;font-weight:800;font-size:12px;cursor:pointer;flex:none}'+
  '.txp .app{display:none;margin-top:16px;text-align:center;background:#EB0028;color:#fff;border:2.5px solid #101B3D;border-radius:999px;padding:15px;font-weight:900;font-size:17px;text-decoration:none}'+
  '.txp.mob .app{display:block}.txp .apps{font-size:12px;color:#3b4466;margin-top:6px;text-align:center}'+
  '.txp form{display:grid;gap:10px;margin-top:20px;border-top:2px dashed #101B3D33;padding-top:18px}.txp label{font-weight:800;font-size:14px}'+
  '.txp input{height:54px;border:2px solid #101B3D;border-radius:14px;padding:0 16px;font-size:20px;font-weight:700;letter-spacing:.12em;width:100%;font-family:inherit}'+
  '.txp .go{height:54px;border-radius:999px;font-weight:900;font-size:16px;border:2.5px solid #101B3D;background:#101B3D;color:#fff;cursor:pointer}.txp .go:disabled{opacity:.5}'+
  '.txp .m{border-radius:14px;padding:12px 14px;font-weight:700;font-size:14px;margin-top:12px}.txp .m.ok{background:#e6f6ec;color:#13804b}.txp .m.bad{background:#ffe1e6;color:#b00020}.txp .m.wait{background:#FFF4E2}'+
  '.txp .shot{display:grid;gap:8px;border:2px dashed #101B3D;border-radius:16px;padding:14px;text-align:center;cursor:pointer;background:#FFF4E2}.txp .shot img{max-height:220px;max-width:100%;margin:0 auto;border-radius:10px}.txp .shotin{font-weight:800}'+
  '.txp .small{font-size:12px;color:#3b4466;margin-top:12px}.txp .done{text-align:center;padding:10px 0}.txp .done .big{font-size:54px}'+
  '@media(max-width:560px){.txp .grid{grid-template-columns:1fr;justify-items:center;text-align:center}.txp .qr svg{width:220px;height:220px}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function inr(n){return '₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:2});}
  function call(b){var P=b.__p;delete b.__p;return API?fetch(API,{method:'POST',body:JSON.stringify(b)}).then(function(r){return r.json();}):Promise.resolve({ok:true,payment:Object.assign({},P,{status:'Submitted',utr:b.utr?'••••••'+String(b.utr).slice(-4):''})});}
  var mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  /* Screenshots are resized to at most 1600 px and saved as JPEG in the browser before upload (usually under 400 KB). */
  function shrink(fl){return new Promise(function(res,rej){if(!/^image\//.test(fl.type))return rej();var r=new FileReader();r.onerror=rej;r.onload=function(){var im=new Image();im.onerror=rej;im.onload=function(){
    var k=Math.min(1,1600/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);
    var g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(im,0,0,cv.width,cv.height);res(cv.toDataURL('image/jpeg',0.85));};im.src=r.result;};r.readAsDataURL(fl);});}
  function render(el,p){
    var box=document.createElement('div');box.className='txp'+(mobile?' mob':'');el.innerHTML='';el.appendChild(box);
    function paint(p){
      if(p.status==='Verified'){box.innerHTML='<div class="done"><div class="big">✓</div><h3>Payment confirmed</h3><p style="margin-top:8px">We received '+inr(p.amount)+'. Your receipt is in your email. Thank you!</p></div>';return;}
      if(p.status==='Expired'){box.innerHTML='<h3>This payment has expired</h3><p style="margin-top:8px">It wasn’t paid within 48 hours, so the seat was released. Please start again.</p>';return;}
      if(p.status==='Submitted'){box.innerHTML='<h3>Thank you!</h3><div class="m wait">We have your payment screenshot'+(p.utr?' and transaction ID ending <b>'+esc(String(p.utr).slice(-4))+'</b>':'')+'. Our Finance team will confirm '+inr(p.amount)+' once they see it in the account, usually within a day. You’ll get an email.</div><p class="small">Reference: <b>'+esc(p.id)+'</b></p>';return;}
      var qr=window.TXQR?TXQR.svg(p.link,{ecl:'M',size:200,fg:'#101B3D'}):'';
      box.innerHTML='<h3>Pay by UPI</h3><div class="amt">'+inr(p.amount)+'</div><div class="to">'+esc(p.title)+' · to <b>'+esc(p.upi_name)+'</b></div>'+
        (p.status==='Not received'?'<div class="m bad">We couldn’t match your payment yet. '+esc(p.note)+' Please check it went through and upload the screenshot again.</div>':'')+
        '<a class="app" href="'+esc(p.link)+'">Pay '+inr(p.amount)+' with a UPI app →</a><div class="apps" style="display:'+(mobile?'block':'none')+'">Opens Google Pay, PhonePe, Paytm, BHIM or any UPI app on this phone</div>'+
        '<div class="grid"><div class="qr" aria-label="UPI QR code for '+inr(p.amount)+'">'+qr+'</div><div class="st">'+
        '<div><b>1. Scan with any UPI app</b>The amount and reference are filled in for you.</div>'+
        '<div><b>Or pay to this UPI ID</b><div class="copy"><span>'+esc(p.upi)+'</span><button type="button" data-c="'+esc(p.upi)+'">Copy</button></div></div>'+
        '<div><b>Reference for the note</b><div class="copy"><span>'+esc(p.id)+'</span><button type="button" data-c="'+esc(p.id)+'">Copy</button></div></div></div></div>'+
        '<p class="small">Check that the name shown in your app is <b>'+esc(p.upi_name)+'</b> before paying. Pay the exact amount.</p>'+
        '<form novalidate><label>2. After paying, upload a screenshot of the successful payment</label>'+
        '<label class="shot"><input type="file" accept="image/*" hidden><span class="shotin">📷 Choose screenshot</span><img alt="Your payment screenshot" hidden></label>'+
        '<label for="utr'+esc(p.id)+'" style="font-weight:700;font-size:13px;margin-top:4px">UPI transaction ID <span style="font-weight:500;color:#3b4466">(optional, 12 digits: helps us confirm faster)</span></label>'+
        '<input id="utr'+esc(p.id)+'" inputmode="numeric" autocomplete="off" maxlength="16" placeholder="e.g. 431256789012">'+
        '<button class="go" type="submit">I’ve paid: send screenshot</button><div class="m bad" style="display:none"></div></form>'+(p.expires_at?'<p class="small">Please pay within 48 hours, by '+new Date(p.expires_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})+'. Reference '+esc(p.id)+'.</p>':'');
      [].forEach.call(box.querySelectorAll('[data-c]'),function(b){b.onclick=function(){(navigator.clipboard?navigator.clipboard.writeText(b.dataset.c):Promise.reject()).then(function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy';},1500);}).catch(function(){});};});
      var f=box.querySelector('form'),file=f.querySelector('input[type=file]'),inp=f.querySelector('input[inputmode]'),er=f.querySelector('.m'),bt=f.querySelector('.go'),img=f.querySelector('.shot img'),lab=f.querySelector('.shotin'),shot='';
      file.onchange=function(){var fl=file.files[0];if(!fl)return;er.style.display='none';lab.textContent='Preparing…';
        shrink(fl).then(function(d){shot=d;img.src=d;img.hidden=false;lab.textContent='✓ Screenshot added · tap to change';}).catch(function(){lab.textContent='📷 Choose screenshot';er.textContent='That file isn’t an image we can read. Please choose a screenshot.';er.style.display='block';});};
      f.onsubmit=function(e){e.preventDefault();var u=inp.value.replace(/\s/g,'');er.style.display='none';
        if(!shot){er.textContent='Please add a screenshot of the successful payment.';er.style.display='block';return;}
        if(u&&!/^\d{12}$/.test(u)){er.textContent='The transaction ID has 12 digits. Leave it empty if you can’t find it.';er.style.display='block';return;}
        bt.disabled=true;bt.textContent='Sending…';
        call({action:'pay_utr',id:p.id,t:p.token,utr:u,shot:shot,__p:p}).then(function(j){bt.disabled=false;bt.textContent='I’ve paid: send screenshot';
          if(!j.ok){er.textContent=j.error;er.style.display='block';return;}paint(j.payment);})
          .catch(function(){bt.disabled=false;bt.textContent='I’ve paid: send screenshot';er.textContent='We could not reach the server. Please try again.';er.style.display='block';});};
    }
    paint(p);
  }
  window.TXPAY={render:render,inr:inr};
})();
