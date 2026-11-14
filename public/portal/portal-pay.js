/* Team Portal: UPI payments (support page contributions, paid tickets, paid side events).
   Finance checks each transaction ID (UTR) in the bank app, then marks it verified or not received. */
(function(){
const at=id=>SECTIONS.findIndex(s=>s.id===id);
const canPay=()=>ME&&(ME.role==='super'||(ME.scopes||[]).includes('finance'));
SECTIONS.splice(at('finance')+1,0,{id:'payments',name:'UPI payments',ico:'⌁',grp:'Finance',show:canPay});
const h=location.hash.slice(1);if(h==='payments')CUR=h;
const inr=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const fdt=s=>s?String(s).replace('T',' ').slice(0,16):'';
const PUR={support:'Contribution',ticket:'Event ticket',side:'Side event'};
const css=`.b-Awaiting.payment{background:#f1f1f1;color:#666}.b-Submitted{background:#101B3D;color:#fff}.b-Verified{background:#e6f6ec;color:var(--ok)}.b-Not.received{background:#fdeaea;color:var(--bad)}.b-Expired{background:#f1f1f1;color:#999}
.py-utr{font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;letter-spacing:.06em}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

VIEWS.payments=async function(tab){
  const j=await api('payList');let T=['check','all','settings'].includes(tab)?tab:'check',q='';
  searchBox('Search name, reference, UTR…',v=>{q=v;paint();});
  const paint=()=>{
    const rows=j.rows.filter(r=>match(r,q));
    const wait=rows.filter(r=>r.status==='Submitted'),ver=j.rows.filter(r=>r.status==='Verified');
    const sum=k=>ver.filter(r=>r.purpose===k).reduce((a,r)=>a+r.amount,0);
    const tabs=[['check','To check'+(wait.length?' · '+wait.length:'')],['all','All payments']].concat(ME.role==='super'?[['settings','Settings']]:[]);
    let body='';
    if(T==='check')body=wait.length?`<div class="panel">${tableHTML(wait,[['submitted_at','Paid on',fdt],['name','From',(v,_,r)=>`<b>${esc(v)}</b><div class="muted">${esc(r.email)}</div>`],['amount','Amount',v=>`<b>${inr(v)}</b>`],['has_shot','Proof',(v,_,r)=>(v?'📷 Screenshot':'—')+(r.utr?`<div class="py-utr">${esc(r.utr)}</div>`:'')],['purpose','For',(v,_,r)=>esc(PUR[v]||v)+'<div class="muted">'+esc(r.title)+'</div>'],['id','Reference',v=>`<span class="mono">${esc(v)}</span>`]])}</div>`
      :'<div class="panel"><div class="empty" style="padding:30px;text-align:center">No payments waiting to be checked. ✓</div></div>';
    else if(T==='all')body=`<div class="panel">${tableHTML(rows,[['created_at','Started',fdt],['name','From',(v,_,r)=>`<b>${esc(v)}</b><div class="muted">${esc(r.email)}</div>`],['amount','Amount',inr],['purpose','For',v=>esc(PUR[v]||v)],['status','Status',badge],['utr','UTR',v=>v?`<span class="py-utr">${esc(v)}</span>`:'—'],['receipt_code','Receipt',v=>v?`<span class="mono">${esc(v)}</span>`:'—']])}</div>`;
    else{const c=j.conf;body=`<div class="panel" style="padding:20px;display:grid;gap:12px;max-width:720px">
      <div class="banner"><b>Where the money goes.</b> Payers see a QR code and button for this UPI ID. Their app shows the name registered with the bank, so check it matches before going live.</div>
      <div class="grid2"><label>UPI ID<input id="psU" value="${esc(c.upi)}"></label><label>Name on the account<input id="psN" value="${esc(c.name)}"></label>
      <label>Main event ticket price (₹, 0 = free)<input id="psT" type="number" min="0" max="100000" value="${esc(c.ticket_price||0)}"></label>
      <label>Support page amounts (₹, comma separated)<input id="psP" value="${esc(c.presets.join(','))}"></label></div>
      <label class="chk"><input type="checkbox" id="psOn" ${c.on?'checked':''}> Take UPI payments on the website (tickets, side events, support page)</label>
      <label class="chk"><input type="checkbox" id="psS" ${c.support_on?'checked':''}> Show the <b>Contribute by UPI</b> form on /support</label>
      <p class="gx-note">Side event prices are set on each event (Website → Side events). Unpaid payments expire after 48 hours and free the seat.</p>
      <div><button class="btn red" id="psSave">Save</button></div></div>`;}
    $('#view').innerHTML=`<div class="gx-hero"><div style="flex:1;min-width:240px"><h2>UPI payments</h2><p>Contributions from /support, paid tickets and paid side events. Open a payment, look at the screenshot, find the same <b>amount and UPI reference</b> in the bank app, then mark it. Verifying posts the income to the books, emails a receipt and confirms the seat.</p></div></div>
      <div class="fx-tiles"><div class="fx-tile dark"><small>To check</small><b>${j.rows.filter(r=>r.status==='Submitted').length}</b></div><div class="fx-tile"><small>Contributions received</small><b>${inr(sum('support'))}</b></div><div class="fx-tile"><small>Tickets</small><b>${inr(sum('ticket'))}</b></div><div class="fx-tile"><small>Side events</small><b>${inr(sum('side'))}</b></div></div>
      <div class="tabsx" style="margin:14px 0">${tabs.map(t=>`<button data-t="${t[0]}" class="${T===t[0]?'on':''}">${t[1]}</button>`).join('')}</div>`+body;
    $('#view').querySelectorAll('.tabsx [data-t]').forEach(b=>b.onclick=()=>{T=b.dataset.t;paint();});
    const list=T==='check'?wait:rows;
    $('#view').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>open(list[tr.dataset.i]));
    if($('#psSave'))$('#psSave').onclick=async()=>{await api('paySettings',{upi_id:$('#psU').value,upi_name:$('#psN').value,ticket_price:$('#psT').value,support_presets:$('#psP').value,payments_on:$('#psOn').checked,support_on:$('#psS').checked});toast('Saved');VIEWS.payments('settings');};
  };
  const open=r=>{
    const acts=r.status==='Submitted'?[['Not received…',()=>modal('Not received · '+r.id,`<p class="gx-note">The payer gets an email asking them to check the transaction ID and enter it again.</p><label>Note for the payer<textarea id="nrN" rows="3">We could not find a payment with this transaction ID and amount in our account.</textarea></label>`,
        [['Back',()=>open(r),'light'],['Send',async()=>{await api('payNotReceived',{id:r.id,note:$('#nrN').value});toast('Payer told');closeM();VIEWS.payments();},'bad']]),'light'],
      ['✓ Payment verified',async()=>{if(!$('#pyC').checked)return toast('Tick the box once you have found it in the bank app',1);const x=await api('payVerify',{id:r.id,confirm:true});toast('Verified · receipt '+(x.receipt_code||'issued')+(x.seat?' · '+x.seat:''));closeM();VIEWS.payments();},'ok']]:[];
    modal(r.id,`<dl class="kv"><dt>Status</dt><dd>${badge(r.status)}</dd><dt>Amount</dt><dd><b style="font-size:20px">${inr(r.amount)}</b></dd><dt>UPI transaction ID</dt><dd><span class="py-utr">${esc(r.utr||'not given')}</span></dd>
      <dt>From</dt><dd>${esc(r.name)} · ${esc(r.email)} · ${esc(r.phone)}</dd><dt>For</dt><dd>${esc(PUR[r.purpose]||r.purpose)}: ${esc(r.title)}</dd><dt>Started</dt><dd>${fdt(r.created_at)}${r.submitted_at?' · paid '+fdt(r.submitted_at):''}</dd>
      ${r.message?`<dt>Message</dt><dd>${esc(r.message)}</dd>`:''}${r.note?`<dt>Note</dt><dd>${esc(r.note)}</dd>`:''}${r.verified_at?`<dt>Verified</dt><dd>${fdt(r.verified_at)} by ${esc(r.verified_by)} · entry ${esc(r.entry_id)} · receipt ${esc(r.receipt_code)}</dd>`:''}</dl>
      ${r.has_shot?`<div id="pyShot" style="margin-top:10px;text-align:center;background:#f4f2ee;border-radius:14px;padding:10px;min-height:80px;font-size:13px;color:var(--mute)">Loading screenshot…</div>`:''}
      ${r.status==='Submitted'?`<div class="banner" style="margin-top:10px"><b>A screenshot can be edited, so don’t rely on it alone.</b> Open the bank app and find a credit of <b>${inr(r.amount)}</b>${r.utr?` with UPI reference <b>${esc(r.utr)}</b>`:' at the time shown in the screenshot, and match the UPI reference number in it'}.</div><label class="chk" style="margin-top:8px"><input type="checkbox" id="pyC"> I have found this payment in the bank account</label>`:''}`,acts);
    $('#mBox').classList.add('wide');
    if(r.has_shot)api('payShot',{id:r.id}).then(s=>{const el=$('#pyShot');if(el&&s.base64)el.innerHTML=`<img alt="Payment screenshot from ${esc(r.name)}" src="data:${s.type};base64,${s.base64}" style="max-height:460px;max-width:100%;border-radius:10px">`;}).catch(e=>{const el=$('#pyShot');if(el)el.textContent=e.message;});
  };
  paint();
};

const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  if(!D._py){D._py={conf:{upi:'8980005283@idfcfirst',name:'Shah Fenil Pritesh',on:true,support_on:true,presets:[500,1000,2500,5000],ticket_price:1000},rows:[
    {id:'PAY/2026-27/0014',purpose:'ticket',title:'Ticket: TEDxThaltej Youth 2027',name:'Riya Shah',email:'riya@example.com',phone:'+91 98765 43210',amount:1000,utr:'431256789012',has_shot:true,status:'Submitted',created_at:'2026-11-13T10:02',submitted_at:'2026-11-13T10:06'},
    {id:'PAY/2026-27/0013',purpose:'support',title:'Contribution to TEDxThaltej Youth',name:'Asha Rao',email:'asha@example.com',phone:'+91 99887 66554',amount:2500,utr:'',has_shot:true,status:'Submitted',message:'For the young speakers!',created_at:'2026-11-13T09:40',submitted_at:'2026-11-13T09:44'},
    {id:'PAY/2026-27/0012',purpose:'side',title:'Design Thinking Workshop',name:'Dev Patel',email:'dev@example.com',phone:'+91 90000 11122',amount:299,utr:'',status:'Awaiting payment',created_at:'2026-11-13T08:15'},
    {id:'PAY/2026-27/0011',purpose:'support',title:'Contribution to TEDxThaltej Youth',name:'Kunal Mehta',email:'kunal@example.com',phone:'+91 91234 56789',amount:5000,utr:'231256780011',status:'Verified',created_at:'2026-11-10T19:02',submitted_at:'2026-11-10T19:05',verified_at:'2026-11-11T09:30',verified_by:'finance@example.com',entry_id:'JE/2026-27/0031',receipt_code:'TXTY-RC-7KQ2'}]};}
  const a=b.action,P=D._py;
  if(a==='payList')return {ok:true,conf:P.conf,rows:P.rows};
  if(a==='payVerify'){const r=P.rows.find(x=>x.id===b.id);r.status='Verified';r.receipt_code='TXTY-RC-'+Math.random().toString(36).slice(2,6).toUpperCase();return {ok:true,receipt_code:r.receipt_code,seat:r.purpose==='ticket'?'ticket QX7K2M':''};}
  if(a==='payShot'){const sv='<svg xmlns="http://www.w3.org/2000/svg" width="300" height="520"><rect width="300" height="520" fill="#fff"/><circle cx="150" cy="120" r="44" fill="#13804b"/><path d="M128 120l15 15 30-30" stroke="#fff" stroke-width="8" fill="none"/><text x="150" y="210" font-family="Arial" font-size="30" font-weight="700" text-anchor="middle">₹1,000</text><text x="150" y="245" font-family="Arial" font-size="15" text-anchor="middle">Paid to SHAH FENIL PRITESH</text><text x="150" y="300" font-family="Arial" font-size="13" fill="#666" text-anchor="middle">UPI transaction ID</text><text x="150" y="322" font-family="Arial" font-size="15" text-anchor="middle">431256789012</text><text x="150" y="360" font-family="Arial" font-size="12" fill="#999" text-anchor="middle">Sample screenshot (preview)</text></svg>';return {ok:true,type:'image/svg+xml',base64:btoa(unescape(encodeURIComponent(sv)))};}
  if(a==='payNotReceived'){P.rows.find(x=>x.id===b.id).status='Not received';return {ok:true};}
  if(a==='paySettings'){Object.assign(P.conf,{upi:b.upi_id,name:b.upi_name,ticket_price:+b.ticket_price,on:b.payments_on,support_on:b.support_on,presets:String(b.support_presets).split(',').map(Number).filter(Boolean)});return {ok:true};}
  return prev?prev(b,me,D):null;
};
})();
