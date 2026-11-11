/* Team Portal: FinanceOS (money requests for everyone; Finance for the Organizer and finance users) and account security.
   Loaded after portal-gov.js. */
(function(){
const css=`
.fx-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.fx-tile{background:#fff;border:1.5px solid var(--n,#101B3D);border-radius:18px;padding:14px 16px;box-shadow:4px 4px 0 var(--n,#101B3D)}
.fx-tile small{display:block;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}
.fx-tile b{display:block;font-family:Anton,Impact,sans-serif;font-weight:400;font-size:28px;line-height:1.15;margin-top:4px}
.fx-tile.dark{background:var(--n,#101B3D);color:#fff;box-shadow:4px 4px 0 var(--red)}.fx-tile.dark small{color:#cdd3e6}
.fx-neg{color:var(--bad)!important}.fx-pos{color:var(--ok)}
.fx-bud{display:grid;gap:10px}.fx-bud .r{display:grid;grid-template-columns:minmax(150px,1.2fr) 3fr auto;gap:10px;align-items:center;font-size:13px}
.fx-bar{height:12px;border-radius:99px;background:#eee;overflow:hidden;position:relative}.fx-bar i{display:block;height:100%;background:var(--ok)}.fx-bar i.w{background:#F59E0B}.fx-bar i.o{background:var(--red)}
.fx-amt{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.fx-code{font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:12px;background:#f4f2ee;border-radius:6px;padding:2px 6px;white-space:nowrap}
.fx-tb td,.fx-tb th{padding:8px 10px;border-bottom:1px solid var(--line);font-size:13px}.fx-tb{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden}
.fx-tb th{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);background:#faf8f4}.fx-tb tr.tot td{font-weight:800;border-top:2px solid var(--n,#101B3D);background:#faf8f4}
.fx-tb tr.grp td{font-weight:800;background:#FFF4E2;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
.fx-flow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;font-weight:700;margin:6px 0}
.fx-flow span{padding:4px 10px;border-radius:99px;background:#eee;color:#666}.fx-flow span.done{background:#e6f6ec;color:var(--ok)}.fx-flow span.now{background:var(--n,#101B3D);color:#fff}.fx-flow span.no{background:#fdeaea;color:var(--bad)}
.b-Head.approved,.b-Head{background:#e8f0fe;color:#1a56db}.b-Approved{background:#fff4e0;color:var(--warn)}.b-Paid{background:#e6f6ec;color:var(--ok)}.b-Settled{background:#e6f6ec;color:var(--ok)}.b-Rejected{background:#fdeaea;color:var(--bad)}.b-Withdrawn{background:#f1f1f1;color:#666}
.b-Posted{background:#e6f6ec;color:var(--ok)}.b-Reversed{background:#111;color:#fff}.b-Reversal{background:#fdeaea;color:var(--bad)}
.dev{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}.dev b{flex:1}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

const at=id=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('available'),0,{id:'money',name:'Money requests',ico:'₹',grp:'Overview',always:true});
SECTIONS.splice(at('registrar')+1,0,{id:'finance',name:'Finance',ico:'₹',grp:'Finance'});
SECTIONS.push({id:'security',name:'Sign-in & security',ico:'🔒',grp:'Account',always:true});
const h=location.hash.slice(1);if(h&&SECTIONS.some(s=>s.id===h))CUR=h;

/* ───────── helpers ───────── */
const inr=n=>{const v=Math.round((+n||0)*100)/100,neg=v<0;let [i,d]=Math.abs(v).toFixed(2).split('.');const last=i.slice(-3),rest=i.slice(0,-3);
  return (neg?'−':'')+'₹'+(rest?rest.replace(/\B(?=(\d{2})+(?!\d))/g,',')+',':'')+last+(d!=='00'?'.'+d:'');};
const val=s=>{const e=$(s);return e?e.value.trim():'';};
const istDay=()=>new Date(Date.now()+19800000).toISOString().slice(0,10);
const hero=(t,p,r)=>`<div class="gx-hero"><div style="flex:1;min-width:240px"><h2>${t}</h2>${p?`<p>${p}</p>`:''}</div>${r||''}</div>`;
const tabs=(list,cur,id)=>`<div class="tabsx" id="${id}" style="flex-wrap:wrap;margin-bottom:14px">${list.map(t=>`<button data-t="${t[0]}" class="${cur===t[0]?'on':''}">${t[1]}</button>`).join('')}</div>`;
const code=c=>`<span class="fx-code">${esc(c)}</span>`;
const print=(title,html)=>{const w=window.open('','_blank');if(!w)return toast('Allow pop-ups to print',1);
  w.document.write(`<!doctype html><title>${esc(title)}</title><style>body{font:13px/1.5 Inter,system-ui,sans-serif;color:#101B3D;max-width:900px;margin:24px auto;padding:0 20px}img.h{width:100%}h1{font-size:20px;margin:14px 0 4px}table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}th{font-size:11px;text-transform:uppercase;color:#666}.r{text-align:right}tr.t td{font-weight:800;border-top:2px solid #101B3D}tr.g td{background:#FFF4E2;font-weight:800}</style><img class="h" src="/assets/letterhead/header.png">${html}<p style="color:#666;font-size:11px;margin-top:20px">Generated from the TEDxThaltej Youth books on ${new Date().toLocaleString('en-IN')}.</p><script>onload=()=>setTimeout(()=>print(),300)<\/script>`);w.document.close();};
const NATURE={Asset:1,Expense:1,Liability:-1,Capital:-1,Income:-1};
const FLOW=['Submitted','Head approved','Approved','Paid'];
function flowHTML(r){if(['Rejected','Withdrawn'].includes(r.status))return `<div class="fx-flow"><span class="no">${esc(r.status)}</span></div>`;
  const steps=r.kind==='Advance'?FLOW.concat(['Settled']):FLOW,i=steps.indexOf(r.status);
  return `<div class="fx-flow">${steps.map((s,k)=>`<span class="${k<i||(k===i&&['Paid','Settled'].includes(s)&&k===steps.length-1)?'done':k===i?'now':''}">${s==='Submitted'?'Asked':s}</span>`).join('→')}</div>`;}
function reqModal(r,actions){
  modal(r.id+' · '+r.title,`<div class="row" style="display:flex;gap:6px;flex-wrap:wrap">${badge(r.status)}<span class="badge">${esc(r.kind)}</span>${r.code?code(r.code):''}</div>${flowHTML(r)}
    <dl class="kv"><dt>Amount</dt><dd><b style="font-size:18px">${inr(r.amount)}</b>${r.paid_amount&&+r.paid_amount!==+r.amount?' · paid '+inr(r.paid_amount):''}</dd><dt>Asked by</dt><dd>${esc(r.name)} · ${esc(r.email)}</dd>
    ${r.payee?`<dt>Pay to</dt><dd>${esc(r.payee)}${r.payee_details?`<div class="muted" style="font-size:12px">${esc(r.payee_details)}</div>`:''}</dd>`:''}${r.needed_by?`<dt>Needed by</dt><dd>${fmt(r.needed_by)}</dd>`:''}
    ${r.proof_url?`<dt>Bill / quote</dt><dd><a href="${esc(r.proof_url)}" target="_blank" rel="noopener">Open ↗</a></dd>`:''}${r.voucher_id?`<dt>Voucher</dt><dd class="mono">${esc(r.voucher_id)}</dd>`:''}${r.note?`<dt>Note</dt><dd>${esc(r.note)}</dd>`:''}</dl>
    ${r.details?`<div class="log" style="white-space:pre-wrap">${esc(r.details)}</div>`:''}${r.history?`<b style="font-size:12px">History</b><div class="log">${esc(r.history)}</div>`:''}`,actions||[]);}
const voucherBtn=id=>id&&['⇩ Voucher PDF',async()=>dlPdf(await api('regPdf',{id})),'light'];

/* ═════════════ MONEY REQUESTS (everyone) ═════════════ */
VIEWS.money=async function(){
  const j=await api('finMine');
  addBtn('+ Ask for money',()=>ask());
  const grp={};j.accounts.forEach(a=>(grp[a.grp]=grp[a.grp]||[]).push(a));
  const opts=sel=>Object.keys(grp).map(g=>`<optgroup label="${esc(g)}">${grp[g].map(a=>`<option value="${a.code}" ${a.code===sel?'selected':''}>${a.code} · ${esc(a.name)}</option>`).join('')}</optgroup>`).join('');
  $('#view').innerHTML=hero('Money requests','Ask for a reimbursement, an advance or a payment to a vendor. Your head approves it, then the Organizer (or Finance for small amounts). When it’s paid, you get a voucher anyone can verify.')+
    (j.toApprove.length?`<div class="gx-sec">Waiting for your approval (${j.toApprove.length})</div><div class="gx-grid">${j.toApprove.map((r,i)=>`<div class="gx-card"><div class="row">${badge(r.status)}<span class="badge">${esc(r.kind)}</span></div>
      <h4>${esc(r.title)}</h4><div style="font-family:Anton,Impact;font-size:26px">${inr(r.amount)}</div><div class="meta">${esc(r.name)} · ${fmt(r.created_at)}${r.code?' · '+esc(r.code):''}</div>
      <div class="acts"><button class="btn sm light" data-rv="${i}">Review</button></div></div>`).join('')}</div>`:'')+
    `<div class="gx-sec">My requests</div><div class="panel">${tableHTML(j.rows,[['id','Request',v=>`<span class="mono">${esc(v)}</span>`],['title','For',(v,_,r)=>`<b>${esc(v)}</b><div class="muted">${esc(r.kind)}</div>`],['amount','Amount',v=>`<b>${inr(v)}</b>`],['status','Status',badge],['created_at','Asked',fmt]],{},1)}</div>`;
  $('#view').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>{const r=j.rows[tr.dataset.i];
    reqModal(r,[['Submitted','Head approved','Approved'].includes(r.status)&&['Withdraw request',async()=>{if(!confirm('Withdraw this request?'))return;await api('finReqWithdraw',{id:r.id});toast('Withdrawn');closeM();go('money');},'bad left'],voucherBtn(r.voucher_id)]);});
  $('#view').querySelectorAll('[data-rv]').forEach(b=>b.onclick=()=>{const r=j.toApprove[b.dataset.rv],head=r.status==='Submitted';
    const go2=async d=>{await api(head?'finReqHead':'finReqApprove',{id:r.id,decision:d,note:val('#apN'),code:val('#apC')});toast(d==='approve'?'Approved ✓':'Rejected');closeM();go('money');};
    reqModal(r,[['Reject',()=>go2('reject'),'light'],[head?'Approve as head':'✓ Approve',()=>go2('approve'),'ok']]);
    $('#mBox .bd').insertAdjacentHTML('beforeend',`${!head?`<label>Ledger code<select id="apC"><option value="">— choose —</option>${opts(r.code)}</select></label>`:''}<label>Note (needed to reject)<textarea id="apN"></textarea></label>`);});
  const ask=()=>{modal('Ask for money',`<div class="tabsx" id="kT">${j.kinds.map((k,i)=>`<button type="button" data-k="${k}" class="${i?'':'on'}">${k}</button>`).join('')}</div>
    <p class="gx-note" id="kH"></p><div class="grid2"><label style="grid-column:1/-1">What is it for?<input id="rqT" placeholder="e.g. Snacks for the speaker rehearsal"></label>
    <label>Amount (₹)<input id="rqA" type="number" min="1" step="0.01" inputmode="decimal"></label><label>Needed by<input id="rqD" type="date"></label>
    <label style="grid-column:1/-1">Budget head (ledger)<select id="rqC"><option value="">Not sure, Finance will choose</option>${opts('')}</select></label>
    <label>Pay to<input id="rqP" placeholder="${esc(ME.name)}"></label><label>UPI ID or bank details<input id="rqPD" placeholder="name@upi"></label>
    <label style="grid-column:1/-1" id="rqBL">Link to the bill, receipt or quote<input id="rqU" placeholder="https://drive.google.com/…"></label>
    <label style="grid-column:1/-1">Details<textarea id="rqX" placeholder="Anything Finance should know"></textarea></label></div>`,[
    ['Send request',async()=>{const r=await api('finReqNew',{kind:$('#kT .on').dataset.k,title:val('#rqT'),amount:val('#rqA'),needed_by:val('#rqD'),code:val('#rqC'),payee:val('#rqP'),payee_details:val('#rqPD'),proof_url:val('#rqU'),details:$('#rqX').value});
      toast(r.id+' sent'+(r.status==='Submitted'?' to your head':' for approval'));closeM();go('money');}]]);
    const help={Reimbursement:'You already paid. Add the bill so Finance can pay you back.','Advance':'You need money before spending it. After the work, Finance settles it against the bills and you return anything unspent.','Vendor payment':'Finance pays a vendor directly. Add their quote or invoice.'};
    const sync=()=>{const k=$('#kT .on').dataset.k;$('#kH').textContent=help[k];$('#rqBL').firstChild.textContent=k==='Reimbursement'?'Link to the bill or receipt (required) ':'Link to the quote or invoice (optional) ';};
    $('#kT').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('#kT').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));sync();});sync();};
};

/* ═════════════ FINANCE (Organizer + finance users) ═════════════ */
let finTab='ov',finFY='';
VIEWS.finance=async function(){
  const j=await api('finBoot',{fy:finFY});finFY=j.fy;
  const A={};j.accounts.forEach(a=>A[a.code]=a);
  const budgets=(()=>{try{return JSON.parse((j.years.find(y=>y.id===j.fy)||{}).budgets_json||'{}');}catch(e){return {};}})();
  const year=j.years.find(y=>y.id===j.fy)||{status:'Open'};
  // balances: this year's movement (+ opening for balance-sheet ledgers)
  const mov={};j.entries.forEach(e=>{mov[e.debit]=(mov[e.debit]||0)+(+e.amount);mov[e.credit]=(mov[e.credit]||0)-(+e.amount);});
  const bs=t=>['Asset','Liability','Capital'].includes(t);
  let surplusOpen=0;Object.keys(j.opening||{}).forEach(c=>{const a=A[c];if(a&&!bs(a.type))surplusOpen+=j.opening[c];});
  const bal=c=>{const a=A[c];if(!a)return 0;let n=(mov[c]||0)+(bs(a.type)?(j.opening[c]||0):0);if(c==='CAP-102')n+=surplusOpen;return Math.round(n*NATURE[a.type]*100)/100;};
  const sumType=t=>j.accounts.filter(a=>a.type===t).reduce((s,a)=>s+bal(a.code),0);
  const income=sumType('Income'),expense=sumType('Expense');
  const cash=j.accounts.filter(a=>a.grp==='Bank & cash').reduce((s,a)=>s+bal(a.code),0);
  const pend=j.requests.filter(r=>['Submitted','Head approved','Approved'].includes(r.status));
  const T=[['ov','Overview'],['req','Requests'+(pend.length?' ('+pend.length+')':'')],['jv','Journal'],['led','Ledgers'],['spn','Sponsorships'],['rep','Reports'],['set','Set-up']];
  const draw=()=>{$('#tools').innerHTML='';
    const fs=document.createElement('select');fs.innerHTML=j.years.map(y=>`<option value="${y.id}" ${y.id===j.fy?'selected':''}>${esc(y.label)}${y.status==='Closed'?' (closed)':''}</option>`).join('');fs.onchange=()=>{finFY=fs.value;VIEWS.finance();};$('#tools').appendChild(fs);
    $('#view').innerHTML=hero('Finance',`${esc(year.label||j.fy)} · ${year.status==='Closed'?'<b>closed</b>: no new entries':'open'} · every payment issues a voucher signed by the Organizer & Licensee and verifiable at /verify.`)+
      (j.hasSignature?'':'<div class="banner">The Organizer’s signature isn’t set up, so vouchers show the printed name only. Add it in Office of the Registrar → Signature & seal.</div>')+
      tabs(T,finTab,'fnT')+'<div id="fnB"></div>';
    $('#fnT').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{finTab=b.dataset.t;draw();});
    ({ov,req,jv,led,spn,rep,set})[finTab]();};
  const reload=()=>VIEWS.finance();

  function ov(){const B=$('#fnB');const exp=j.accounts.filter(a=>a.type==='Expense'&&(budgets[a.code]||bal(a.code)));
    B.innerHTML=`<div class="fx-tiles"><div class="fx-tile dark"><small>Bank & cash</small><b>${inr(cash)}</b></div><div class="fx-tile"><small>Income this year</small><b class="fx-pos">${inr(income)}</b></div>
      <div class="fx-tile"><small>Spent this year</small><b>${inr(expense)}</b></div><div class="fx-tile"><small>Surplus</small><b class="${income-expense<0?'fx-neg':''}">${inr(income-expense)}</b></div>
      <div class="fx-tile"><small>Awaiting approval / payment</small><b>${inr(pend.reduce((s,r)=>s+(+r.amount),0))}</b><span class="muted" style="font-size:12px">${pend.length} request${pend.length===1?'':'s'}</span></div>
      <div class="fx-tile"><small>Sponsorship to collect</small><b>${inr(j.pledges.filter(p=>p.status!=='Cancelled').reduce((s,p)=>s+Math.max(0,p.committed-p.received),0))}</b></div></div>
      <div class="two"><div class="panel" style="padding:18px"><h3 style="margin-bottom:12px">Budget vs spent</h3>${exp.length?`<div class="fx-bud">${exp.map(a=>{const b=budgets[a.code]||0,s=bal(a.code),p=b?s/b*100:100;
        return `<div class="r"><span>${code(a.code)} ${esc(a.name)}</span><div class="fx-bar"><i class="${p>100?'o':p>85?'w':''}" style="width:${Math.min(100,p)}%"></i></div><span class="fx-amt">${inr(s)}${b?` / ${inr(b)}`:''}</span></div>`;}).join('')}</div>`:'<p class="muted">Set budgets in Set-up to track spending against them.</p>'}</div>
      <div class="panel" style="padding:18px"><h3 style="margin-bottom:10px">Latest entries</h3>${j.entries.slice(0,8).map(e=>`<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px"><span style="flex:1"><b>${esc(e.narration.slice(0,60))}</b><div class="muted">${fmt(e.date)} · ${esc(e.debit)} ← ${esc(e.credit)}</div></span><b class="fx-amt">${inr(e.amount)}</b></div>`).join('')||'<p class="muted">No entries yet.</p>'}</div></div>`;}

  function req(){const B=$('#fnB');let show='open';
    const paint=()=>{const R=j.requests.filter(r=>show==='all'||(show==='open'?['Submitted','Head approved','Approved'].includes(r.status):show==='adv'?r.kind==='Advance'&&r.status==='Paid':r.status===show));
      B.innerHTML=`<div class="tabsx" id="rqF">${[['open','To act on'],['adv','Advances to settle'],['Paid','Paid'],['all','All']].map(([k,l])=>`<button data-s="${k}" class="${k===show?'on':''}">${l}</button>`).join('')}</div>
        <div class="panel">${tableHTML(R,[['id','Request',v=>`<span class="mono">${esc(v)}</span>`],['title','For',(v,_,r)=>`<b>${esc(v)}</b><div class="muted">${esc(r.name)} · ${esc(r.kind)}</div>`],['code','Ledger',v=>v?code(v):'—'],['amount','Amount',v=>`<b>${inr(v)}</b>`],['status','Status',badge],['created_at','Asked',fmt]],{},1)}</div>`;
      $('#rqF').querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{show=b.dataset.s;paint();});
      B.querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>open(R[tr.dataset.i]));};
    const open=r=>{const canFinal=r.status==='Head approved'&&(j.isSuper||(+r.amount<=j.limit&&r.email!==String(ME.email).toLowerCase()));
      reqModal(r,[canFinal&&['Reject',async()=>{const n=prompt('Why is it rejected?');if(!n)return;await api('finReqApprove',{id:r.id,decision:'reject',note:n});toast('Rejected');closeM();reload();},'light'],
        r.status==='Submitted'&&['Approve as head',async()=>{await api('finReqHead',{id:r.id,decision:'approve'});toast('Approved');closeM();reload();},'light'],
        canFinal&&['✓ Approve',async()=>{await api('finReqApprove',{id:r.id,decision:'approve'});toast('Approved');closeM();reload();},'ok'],
        r.status==='Approved'&&['Record payment…',()=>pay(r)],r.kind==='Advance'&&r.status==='Paid'&&['Settle advance…',()=>settle(r)],voucherBtn(r.voucher_id)]);};
    const ledOpt=(types,sel)=>j.accounts.filter(a=>types.includes(a.type)&&truthy(a.active)).map(a=>`<option value="${a.code}" ${a.code===sel?'selected':''}>${a.code} · ${esc(a.name)}</option>`).join('');
    const pay=r=>modal('Pay '+r.id,`<p class="gx-note">Posts the entry and issues a Payment Voucher, emailed to ${esc(r.name)}. ${r.kind==='Advance'?'Advances are held in ADV-101 until settled.':''}</p>
      <div class="grid2"><label>Amount paid<input id="pA" type="number" step="0.01" value="${esc(r.amount)}"></label><label>Date<input id="pD" type="date" value="${istDay()}"></label>
      <label>Paid from<select id="pF">${ledOpt(['Asset'],'BNK-101')}</select></label><label>Mode<select id="pM">${j.modes.map(m=>`<option>${m}</option>`).join('')}</select></label>
      <label>Expense ledger<select id="pC">${ledOpt(['Expense'],r.code)}</select></label><label>Reference (UTR / cheque no.)<input id="pR"></label></div>
      ${r.payee_details?`<div class="banner">Pay to: <b>${esc(r.payee)}</b> · ${esc(r.payee_details)}</div>`:''}`,[
      ['Record payment',async()=>{const x=await api('finReqPay',{id:r.id,amount:val('#pA'),date:val('#pD'),from:val('#pF'),mode:val('#pM'),code:val('#pC'),reference:val('#pR')});
        toast('Paid · voucher '+(x.voucher_id||'issued'));closeM();reload();}]]);
    const settle=r=>modal('Settle advance '+r.id,`<p class="gx-note">Advance paid: <b>${inr(r.paid_amount)}</b>. Enter what was actually spent. Anything unspent is recorded as returned.</p>
      <div class="grid2"><label>Spent<input id="sS" type="number" step="0.01" value="${esc(r.paid_amount)}"></label><label>Date<input id="sD" type="date" value="${istDay()}"></label>
      <label>Expense ledger<select id="sC">${ledOpt(['Expense'],r.code)}</select></label><label>Returned to<select id="sT">${ledOpt(['Asset'],'BNK-101')}</select></label>
      <label style="grid-column:1/-1">Bills (link)<input id="sU" placeholder="https://"></label></div>`,[
      ['Settle',async()=>{await api('finReqSettle',{id:r.id,spent:val('#sS'),date:val('#sD'),code:val('#sC'),to:val('#sT'),proof_url:val('#sU')});toast('Settled');closeM();reload();}]]);
    paint();}

  function jv(){const B=$('#fnB');let q='';
    if(year.status==='Open') addBtn('+ New entry',()=>entry({}));
    searchBox('Search entries…',v=>{q=v;paint();});
    addBtn('⇩ CSV',()=>csv('journal-'+j.fy,j.entries.map(e=>({entry:e.id,date:e.date,kind:e.kind,debit:e.debit,credit:e.credit,amount:e.amount,party:e.party,narration:e.narration,mode:e.mode,reference:e.reference,ref:e.ref_id,voucher:e.voucher_id,status:e.status,by:e.created_by}))));
    const paint=()=>{const R=j.entries.filter(e=>match(e,q));
      B.innerHTML=`<div class="panel">${tableHTML(R,[['id','Entry',(v,_,e)=>`<span class="mono">${esc(v)}</span><div class="muted">${fmt(e.date)}</div>`],['narration','Narration',(v,_,e)=>`<b>${esc(v)}</b><div class="muted">${esc(e.kind)}${e.party?' · '+esc(e.party):''}</div>`],
        ['debit','Debit',v=>code(v)],['credit','Credit',v=>code(v)],['amount','Amount',v=>`<b class="fx-amt">${inr(v)}</b>`],['status','',(v,_,e)=>e.kind==='Reversal'?badge('Reversal'):badge(v)]],{},1)}</div>`;
      B.querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>show(R[tr.dataset.i]));};
    const show=e=>modal(e.id,`<div class="row" style="display:flex;gap:6px">${badge(e.status)}<span class="badge">${esc(e.kind)}</span></div>
      <dl class="kv"><dt>Date</dt><dd>${fmt(e.date)}</dd><dt>Debit</dt><dd>${code(e.debit)} ${esc((A[e.debit]||{}).name||'')}</dd><dt>Credit</dt><dd>${code(e.credit)} ${esc((A[e.credit]||{}).name||'')}</dd><dt>Amount</dt><dd><b>${inr(e.amount)}</b></dd>
      ${e.party?`<dt>Party</dt><dd>${esc(e.party)}</dd>`:''}<dt>Narration</dt><dd>${esc(e.narration)}</dd>${e.mode?`<dt>Mode</dt><dd>${esc(e.mode)}${e.reference?' · '+esc(e.reference):''}</dd>`:''}
      ${e.ref_id?`<dt>Linked to</dt><dd>${esc(e.ref_id)}</dd>`:''}${e.proof_url?`<dt>Proof</dt><dd><a href="${esc(e.proof_url)}" target="_blank" rel="noopener">Open ↗</a></dd>`:''}${e.voucher_id?`<dt>Voucher</dt><dd class="mono">${esc(e.voucher_id)} · ${esc(e.voucher_code)}</dd>`:''}
      ${e.reversal_of?`<dt>Reverses</dt><dd>${esc(e.reversal_of)}</dd>`:''}<dt>Posted by</dt><dd>${esc(e.created_by)} · ${fmt(e.created_at)}</dd></dl>`,[
      e.status==='Posted'&&e.kind!=='Reversal'&&year.status==='Open'&&['Reverse…',async()=>{const why=prompt('Why reverse this entry? (A reversing entry is posted; any voucher is voided.)');if(!why)return;await api('finReverse',{id:e.id,reason:why});toast('Reversed');closeM();reload();},'bad left'],
      !e.voucher_id&&e.status==='Posted'&&e.kind!=='Reversal'&&['Issue voucher / receipt',async()=>{const em=prompt('Email it to (optional):','')||'';const x=await api('finVoucher',{id:e.id,email:em});toast('Issued '+x.id);closeM();reload();},'light'],
      voucherBtn(e.voucher_id)]);
    paint();}
  const KINDS={Expense:{dr:['Expense'],cr:['Asset','Liability'],h:'Money spent: debit the expense, credit the bank or cash it came from.',v:1},
    Income:{dr:['Asset'],cr:['Income'],h:'Money received: debit the bank or cash, credit the income ledger.',v:1},
    Sponsorship:{dr:['Asset'],cr:['Income'],h:'Sponsor money received against a pledge. A receipt can be emailed to the sponsor.',v:1,p:1,dc:'BNK-101',cc:'INC-101'},
    Transfer:{dr:null,cr:null,dc:'ADJ-101',cc:'EME-105',h:'Move an amount from one ledger to another, e.g. from EME-105 to ADJ-101. The “from” ledger is credited, the “to” ledger debited.'},
    Capital:{dr:['Asset'],cr:['Capital'],h:'Money the Organizer puts in.',s:1,dc:'BNK-101',cc:'CAP-101'},Drawing:{dr:['Capital'],cr:['Asset'],h:'Money the Organizer takes out.',s:1},
    Journal:{dr:null,cr:null,h:'Any other double entry.'}};
  function entry(pre){
    const kinds=Object.keys(KINDS).filter(k=>!KINDS[k].s||j.isSuper);let kind=pre.kind||'Expense';
    const opt=(types,sel)=>j.accounts.filter(a=>truthy(a.active)&&(!types||types.includes(a.type))).map(a=>`<option value="${a.code}" ${a.code===sel?'selected':''}>${a.code} · ${esc(a.name)}</option>`).join('');
    const body=()=>{const K=KINDS[kind],tr=kind==='Transfer';return `<div class="tabsx" id="eK">${kinds.map(k=>`<button type="button" data-k="${k}" class="${k===kind?'on':''}">${k}</button>`).join('')}</div><p class="gx-note">${K.h}</p>
      <div class="grid2"><label>Date<input id="eD" type="date" value="${istDay()}"></label><label>Amount (₹)<input id="eA" type="number" step="0.01" value="${esc(pre.amount||'')}"></label>
      <label>${tr?'From (credit)':'Credit'}<select id="eC">${opt(K.cr,pre.credit||K.cc)}</select></label><label>${tr?'To (debit)':'Debit'}<select id="eDr">${opt(K.dr,pre.debit||K.dc)}</select></label>
      ${K.p?`<label style="grid-column:1/-1">Pledge<select id="eP"><option value="">—</option>${j.pledges.map(p=>`<option value="${p.id}" ${p.id===pre.ref_id?'selected':''}>${esc(p.sponsor)} · ${inr(p.committed-p.received)} to collect</option>`).join('')}</select></label>`:''}
      <label>${kind==='Expense'?'Paid to':'Party'}<input id="eY" value="${esc(pre.party||'')}"></label><label>Mode<select id="eM">${j.modes.map(m=>`<option>${m}</option>`).join('')}</select></label>
      <label>Reference (UTR / cheque no.)<input id="eR"></label><label>Proof link<input id="eU" placeholder="https://"></label>
      <label style="grid-column:1/-1">Narration<textarea id="eN" placeholder="What this entry is for">${esc(pre.narration||'')}</textarea></label></div>
      ${K.v?`<label class="chk"><input type="checkbox" id="eV" ${kind!=='Expense'?'checked':''}> Issue a ${kind==='Expense'?'Payment Voucher':'Receipt'} (signed by the Organizer, verifiable)</label><label>Email it to (optional)<input id="eE" type="email"></label>`:''}`;};
    modal('New journal entry','<div id="eBody"></div>',[['Post entry',async()=>{
      const x=await api('finPost',{kind,date:val('#eD'),amount:val('#eA'),debit:val('#eDr'),credit:val('#eC'),party:val('#eY'),mode:val('#eM'),reference:val('#eR'),proof_url:val('#eU'),narration:$('#eN').value,ref_id:val('#eP'),voucher:!!($('#eV')&&$('#eV').checked),payee_email:val('#eE')});
      toast('Posted '+x.id+(x.voucher_id?' · '+x.voucher_id:'')+(x.voucher_error?' · voucher failed: '+x.voucher_error:''),!!x.voucher_error);closeM();reload();}]]);
    const paintE=()=>{$('#eBody').innerHTML=body();$('#eK').querySelectorAll('button').forEach(b=>b.onclick=()=>{kind=b.dataset.k;pre={};paintE();});
      if($('#eP'))$('#eP').onchange=()=>{const p=j.pledges.find(x=>x.id===val('#eP'));if(p){$('#eY').value=p.sponsor;if(!val('#eA'))$('#eA').value=p.committed-p.received;$('#eN').value='Sponsorship from '+p.sponsor;}};};
    paintE();}
  window.finEntry=entry;

  function led(){const B=$('#fnB');let open=null;
    const types=['Asset','Liability','Capital','Income','Expense'];
    B.innerHTML=types.map(t=>{const L=j.accounts.filter(a=>a.type===t);return `<div class="gx-sec" style="font-size:17px">${t}</div><table class="fx-tb"><tr><th>Code</th><th>Ledger</th><th>Group</th><th class="fx-amt">Balance</th></tr>${L.map(a=>`<tr data-c="${a.code}" style="cursor:pointer;${truthy(a.active)?'':'opacity:.5'}"><td>${code(a.code)}</td><td><b>${esc(a.name)}</b></td><td class="muted">${esc(a.grp)}</td><td class="fx-amt"><b class="${bal(a.code)<0?'fx-neg':''}">${inr(bal(a.code))}</b></td></tr>`).join('')}</table>`;}).join('');
    B.querySelectorAll('tr[data-c]').forEach(tr=>tr.onclick=()=>stmt(tr.dataset.c));}
  function stmt(c){const a=A[c],nat=NATURE[a.type];let run=bs(a.type)?(j.opening[c]||0)*nat:0;const op=run;
    const rows=j.entries.filter(e=>e.debit===c||e.credit===c).slice().reverse().map(e=>{const dr=e.debit===c?+e.amount:0,cr=e.credit===c?+e.amount:0;run+=(dr-cr)*nat;return {e,dr,cr,run};});
    const html=`<table class="fx-tb"><tr><th>Date</th><th>Entry</th><th>Narration</th><th class="fx-amt">Debit</th><th class="fx-amt">Credit</th><th class="fx-amt">Balance</th></tr>${bs(a.type)?`<tr class="grp"><td colspan="5">Opening balance</td><td class="fx-amt">${inr(op)}</td></tr>`:''}
      ${rows.map(r=>`<tr><td>${esc(r.e.date)}</td><td class="mono">${esc(r.e.id)}</td><td>${esc(r.e.narration)}<div class="muted">${r.e.debit===c?'← '+esc(r.e.credit):'→ '+esc(r.e.debit)}</div></td><td class="fx-amt">${r.dr?inr(r.dr):''}</td><td class="fx-amt">${r.cr?inr(r.cr):''}</td><td class="fx-amt"><b>${inr(r.run)}</b></td></tr>`).join('')}
      <tr class="tot"><td colspan="5">Closing balance</td><td class="fx-amt">${inr(run)}</td></tr></table>`;
    modal(c+' · '+a.name,html,[['Print',()=>print(c,`<h1>Ledger ${esc(c)} · ${esc(a.name)}</h1><p>${esc(year.label||j.fy)}</p>`+html.replace(/class="fx-tb"/,'').replace(/fx-amt/g,'r')),'light'],
      ['⇩ CSV',()=>csv(c+'-'+j.fy,rows.map(r=>({date:r.e.date,entry:r.e.id,narration:r.e.narration,debit:r.dr||'',credit:r.cr||'',balance:r.run}))),'light']]);$('#mBox').classList.add('wide');}

  function spn(){const B=$('#fnB');addBtn('+ Add pledge',()=>pledge({}));
    B.innerHTML=j.pledges.length?`<div class="gx-grid">${j.pledges.map((p,i)=>`<div class="gx-card"><div class="row">${badge(p.status)}${p.tier?`<span class="badge">${esc(p.tier)}</span>`:''}</div><h4>${esc(p.sponsor)}</h4>
      <div><div class="meta" style="margin-bottom:4px"><b style="color:var(--ink)">${inr(p.received)}</b> of ${inr(p.committed)}${p.due_date?' · due '+fmt(p.due_date):''}</div><div class="gx-prog"><i style="width:${Math.min(100,p.received/p.committed*100)}%;background:var(--ok)"></i></div></div>
      <div class="acts">${year.status==='Open'&&p.received<p.committed&&p.status!=='Cancelled'?`<button class="btn sm red" data-r="${i}">Record money received</button>`:''}<button class="btn sm light" data-e="${i}">Edit</button></div></div>`).join('')}</div>`:'<div class="panel"><div class="empty">No sponsorship pledges this year.</div></div>';
    B.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const p=j.pledges[b.dataset.r];entry({kind:'Sponsorship',ref_id:p.id,party:p.sponsor,amount:p.committed-p.received,narration:'Sponsorship from '+p.sponsor});});
    B.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>pledge(j.pledges[b.dataset.e]));}
  const pledge=p=>modal(p.id?'Edit pledge':'New sponsorship pledge',`<div class="grid2"><label style="grid-column:1/-1">Sponsor<input id="pS" list="spL" value="${esc(p.sponsor||'')}"><datalist id="spL">${j.sponsors.map(s=>`<option value="${esc(s.name)}">`).join('')}</datalist></label>
    <label>Tier<input id="pT" value="${esc(p.tier||'')}"></label><label>Amount committed (₹)<input id="pC" type="number" value="${esc(p.committed||'')}"></label><label>Due date<input id="pD" type="date" value="${esc(p.due_date||'')}"></label>
    <label>Status<select id="pSt">${['Committed','Agreement signed','Part received','Received','Cancelled'].map(s=>`<option ${s===p.status?'selected':''}>${s}</option>`).join('')}</select></label>
    <label style="grid-column:1/-1">Contact<input id="pK" value="${esc(p.contact||'')}"></label><label style="grid-column:1/-1">Notes<textarea id="pN">${esc(p.notes||'')}</textarea></label></div>`,[
    p.id&&j.isSuper&&['Delete',async()=>{if(!confirm('Delete this pledge?'))return;await api('finPledgeRemove',{id:p.id});toast('Deleted');closeM();reload();},'bad left'],
    ['Save',async()=>{await api('finPledgeSave',{record:{id:p.id,sponsor:val('#pS'),tier:val('#pT'),committed:val('#pC'),due_date:val('#pD'),status:val('#pSt'),contact:val('#pK'),notes:$('#pN').value}});toast('Saved');closeM();reload();}]]);

  function rep(){const B=$('#fnB');let r='tb';
    const tb=()=>{let d=0,c=0;const rows=j.accounts.map(a=>{const n=(mov[a.code]||0)+(bs(a.type)?(j.opening[a.code]||0):0)+(a.code==='CAP-102'?surplusOpen:0);if(Math.abs(n)<0.005)return '';if(n>0)d+=n;else c-=n;
      return `<tr><td>${code(a.code)}</td><td>${esc(a.name)}</td><td class="fx-amt r">${n>0?inr(n):''}</td><td class="fx-amt r">${n<0?inr(-n):''}</td></tr>`;}).join('');
      return `<h3 style="margin:6px 0">Trial balance · ${esc(year.label||j.fy)}</h3><table class="fx-tb"><tr><th>Code</th><th>Ledger</th><th class="fx-amt r">Debit</th><th class="fx-amt r">Credit</th></tr>${rows}<tr class="tot t"><td colspan="2">Total ${Math.abs(d-c)<0.01?'✓ balanced':'⚠ not balanced'}</td><td class="fx-amt r">${inr(d)}</td><td class="fx-amt r">${inr(c)}</td></tr></table>`;};
    const ie=()=>{const sec=t=>{const L=j.accounts.filter(a=>a.type===t&&Math.abs(bal(a.code))>0.004);return `<tr class="grp g"><td colspan="3">${t==='Income'?'Income':'Expenditure'}</td></tr>${L.map(a=>`<tr><td>${code(a.code)}</td><td>${esc(a.name)}</td><td class="fx-amt r">${inr(bal(a.code))}</td></tr>`).join('')}<tr class="tot t"><td colspan="2">Total ${t==='Income'?'income':'expenditure'}</td><td class="fx-amt r">${inr(sumType(t))}</td></tr>`;};
      return `<h3 style="margin:6px 0">Income & expenditure · ${esc(year.label||j.fy)}</h3><table class="fx-tb">${sec('Income')}${sec('Expense')}<tr class="tot t"><td colspan="2">${income-expense>=0?'Surplus':'Deficit'}</td><td class="fx-amt r">${inr(income-expense)}</td></tr></table>`;};
    const bsr=()=>{const sec=(t,l)=>{const L=j.accounts.filter(a=>a.type===t&&Math.abs(bal(a.code))>0.004);return `<tr class="grp g"><td colspan="3">${l}</td></tr>${L.map(a=>`<tr><td>${code(a.code)}</td><td>${esc(a.name)}</td><td class="fx-amt r">${inr(bal(a.code))}</td></tr>`).join('')}`;};
      const assets=sumType('Asset'),liab=sumType('Liability'),cap=sumType('Capital');
      return `<h3 style="margin:6px 0">Position at the end of ${esc(year.label||j.fy)}</h3><table class="fx-tb">${sec('Asset','What we have')}<tr class="tot t"><td colspan="2">Total assets</td><td class="fx-amt r">${inr(assets)}</td></tr>
        ${sec('Liability','What we owe')}${sec('Capital','Capital')}<tr><td></td><td>Surplus for the year</td><td class="fx-amt r">${inr(income-expense)}</td></tr><tr class="tot t"><td colspan="2">Total liabilities and capital</td><td class="fx-amt r">${inr(liab+cap+income-expense)}</td></tr></table>`;};
    const R={tb:['Trial balance',tb],ie:['Income & expenditure',ie],bs:['Position (balance sheet)',bsr]};
    const paint=()=>{B.innerHTML=`<div class="tabsx" id="rpT">${Object.keys(R).map(k=>`<button data-r="${k}" class="${k===r?'on':''}">${R[k][0]}</button>`).join('')}</div><div id="rpB">${R[r][1]()}</div>`;
      $('#rpT').querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{r=b.dataset.r;paint();});};
    addBtn('Print',()=>print(R[r][0],$('#rpB').innerHTML.replace(/class="fx-tb"/g,'')));
    paint();}

  function set(){const B=$('#fnB');
    if(!j.isSuper){B.innerHTML='<div class="panel"><div class="empty">Ledgers, budgets and years are set by the Organizer.</div></div>';return;}
    B.innerHTML=`<div class="two"><div class="panel" style="padding:18px"><h3>Ledgers</h3><p class="gx-note" style="margin:6px 0 10px">Codes look like EME-105. A ledger with entries keeps its type; switch it off instead of deleting.</p>
      <button class="btn sm red" id="aNew">+ New ledger</button><div style="max-height:420px;overflow:auto;margin-top:10px">${j.accounts.map(a=>`<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px;cursor:pointer;${truthy(a.active)?'':'opacity:.5'}" data-a="${a.code}">${code(a.code)}<span style="flex:1">${esc(a.name)}</span><span class="muted">${a.type}</span></div>`).join('')}</div></div>
      <div class="panel" style="padding:18px"><h3>Budgets for ${esc(year.label||j.fy)}</h3><div style="max-height:380px;overflow:auto;margin:10px 0">${j.accounts.filter(a=>a.type==='Expense'&&truthy(a.active)).map(a=>`<label style="display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:center;font-size:13px;margin-bottom:6px"><span>${code(a.code)} ${esc(a.name)}</span><input type="number" class="bud" data-c="${a.code}" value="${budgets[a.code]||''}" placeholder="₹"></label>`).join('')}</div><button class="btn red" id="bSave">Save budgets</button></div></div>
      <div class="panel" style="padding:18px;margin-top:14px"><h3>Financial years</h3>${j.years.map(y=>`<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"><b style="flex:1">${esc(y.label)}</b>${badge(y.status)}<button class="btn sm light" data-y="${y.id}" data-s="${y.status==='Open'?'Closed':'Open'}">${y.status==='Open'?'Close the year':'Reopen…'}</button></div>`).join('')}</div>`;
    B.querySelectorAll('[data-a]').forEach(x=>x.onclick=()=>acct(A[x.dataset.a]));$('#aNew').onclick=()=>acct({active:'TRUE',type:'Expense'});
    $('#bSave').onclick=async()=>{const b={};B.querySelectorAll('.bud').forEach(i=>{if(i.value)b[i.dataset.c]=i.value;});await api('finBudgetSave',{fy:j.fy,budgets:b});toast('Budgets saved');reload();};
    B.querySelectorAll('[data-y]').forEach(x=>x.onclick=async()=>{const s=x.dataset.s;let reason='';if(s==='Open'){reason=prompt('Why reopen this year?');if(!reason)return;}else if(!confirm('Close '+x.dataset.y+'? No entries can be posted to it until it is reopened.'))return;
      try{await api('finYearSave',{id:x.dataset.y,status:s,reason});}catch(e){if(/unpaid/.test(e.message)&&confirm(e.message+'\n\nClose anyway?'))await api('finYearSave',{id:x.dataset.y,status:s,force:true});else throw e;}toast('Done');reload();});}
  const acct=a=>modal(a.code?'Edit ledger '+a.code:'New ledger',`<div class="grid2"><label>Code<input id="lC" value="${esc(a.code||'')}" ${a.code?'readonly':''} placeholder="EME-108"></label><label>Type<select id="lT">${j.types.map(t=>`<option ${t===a.type?'selected':''}>${t}</option>`).join('')}</select></label>
    <label style="grid-column:1/-1">Name<input id="lN" value="${esc(a.name||'')}"></label><label>Group<input id="lG" value="${esc(a.grp||'')}" placeholder="Event management"></label><label>Order<input id="lS" type="number" value="${esc(a.sort||'')}"></label>
    <label style="grid-column:1/-1">Description<input id="lD" value="${esc(a.description||'')}"></label><label class="chk"><input type="checkbox" id="lA" ${truthy(a.active)?'checked':''}> Active</label></div>`,[
    ['Save',async()=>{await api('finAccountSave',{record:{code:val('#lC'),type:val('#lT'),name:val('#lN'),grp:val('#lG'),sort:val('#lS'),description:val('#lD'),active:$('#lA').checked?'TRUE':'FALSE'}});toast('Ledger saved');closeM();reload();}]]);
  draw();
};

/* ═════════════ SIGN-IN & SECURITY ═════════════ */
VIEWS.security=async function(){
  const j=await api('devices');
  $('#view').innerHTML=hero('Sign-in & security','Protect your Team Portal account. People with access to money, documents or other people’s accounts confirm each new sign-in with a code sent to their email.')+
    `<div class="two"><div class="panel" style="padding:18px"><h3>Trusted devices</h3><p class="gx-note" style="margin:6px 0 10px">Devices where you chose “Trust this device for 30 days” skip the email code.</p>
      ${j.rows.length?j.rows.map(d=>`<div class="dev"><span style="font-size:22px">💻</span><b>${esc(d.ua||'Unknown browser')}<div class="muted" style="font-weight:500;font-size:12px">Trusted ${fmt(d.created_at)} · until ${fmt(d.expires)}</div></b><button class="btn sm light" data-d="${esc(d.id)}">Remove</button></div>`).join(''):'<p class="muted">No trusted devices.</p>'}</div>
    <div class="panel" style="padding:18px;display:grid;gap:12px;align-content:start"><h3>Keep your account safe</h3>
      <ul style="margin-left:18px;font-size:14px;line-height:1.7"><li>Use a password you don’t use anywhere else, 10+ characters.</li><li>Never share your sign-in code. TEDxThaltej Youth will never ask for it.</li><li>Sign out on shared computers.</li><li>Changing your password signs you out on every other device.</li></ul>
      <button class="btn light" id="chPw">Change password</button><button class="btn red" id="outAll">Sign out everywhere</button></div></div>`;
  $('#view').querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{await api('deviceRemove',{id:b.dataset.d});toast('Device removed');VIEWS.security();});
  $('#chPw').onclick=()=>show('vChange');
  $('#outAll').onclick=async()=>{if(!confirm('Sign out on every device, including this one? Trusted devices will need a code again.'))return;await api('logoutAll');try{localStorage.removeItem('txty_dev');}catch(e){}store.del('txty_t');location.reload();};
};

/* ═════════════ SUBSCRIBERS (community updates) ═════════════ */
SECTIONS.splice(SECTIONS.findIndex(s=>s.id==='news')+1,0,{id:'subscribers',name:'Subscribers',ico:'✉',grp:'Website',show:()=>ME.role==='super'||ME.scopes.includes('news')});
VIEWS.subscribers=async function(){
  const j=await api('subList');let q='',fS='Confirmed';
  const C=j.rows.filter(r=>r.status==='Confirmed').length;
  addBtn('✉ Send an update',()=>compose());addBtn('⇩ CSV (confirmed)',()=>csv('subscribers',j.rows.filter(r=>r.status==='Confirmed').map(r=>({email:r.email,name:r.name,since:r.confirmed_at,source:r.source}))));
  searchBox('Search…',v=>{q=v;paint();});selectBox(['Confirmed','Pending','Unsubscribed'],v=>{fS=v;paint();},'Everyone');
  const paint=()=>{const R=j.rows.filter(r=>match(r,q)&&(!fS||r.status===fS));
    $('#view').innerHTML=`<div class="fx-tiles"><div class="fx-tile dark"><small>Confirmed subscribers</small><b>${C}</b></div><div class="fx-tile"><small>Waiting to confirm</small><b>${j.rows.filter(r=>r.status==='Pending').length}</b></div>
      <div class="fx-tile"><small>Google Group</small><b style="font-size:16px;font-family:Inter;font-weight:800;margin-top:8px"><a href="${esc(j.groupUrl)}" target="_blank" rel="noopener">${esc(j.group)} ↗</a></b><span class="muted" style="font-size:12px">Invite people from the CSV in Google Groups</span></div></div>
      ${j.campaigns.length?`<div class="panel" style="padding:14px 18px;margin-bottom:14px"><b>Updates sent</b>${j.campaigns.slice(0,5).map(c=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px"><span style="flex:1">${esc(c.subject)}</span><span>${esc(c.sent)}${c.total?' / '+esc(c.total):''}</span>${c.status==='Done'?badge('Done'):`<button class="btn sm red" data-c="${esc(c.id)}">Continue</button>`}</div>`).join('')}</div>`:''}
      <div class="panel">${tableHTML(R,[['email','Email',(v,_,r)=>`<b>${esc(v)}</b><div class="muted">${esc(r.name||'')}</div>`],['status','Status',badge],['source','From'],['created_at','Joined',fmt]],{},1)}</div>`;
    $('#view').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>run(b.dataset.c));
    $('#view').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=async()=>{const r=R[tr.dataset.i];if(!confirm('Remove '+r.email+' from the list completely?'))return;await api('subRemove',{email:r.email});toast('Removed');VIEWS.subscribers();});};
  const run=async id=>{let r;toast('Sending…');do{r=await api('subSend',{id});toast(`Sent ${r.sent}${r.left?' · '+r.left+' left':''}`,!!r.error);if(r.error){alert(r.error);break;}}while(!r.done);VIEWS.subscribers();};
  const compose=()=>modal('Send an update to '+C+' subscribers',`<label>Subject<input id="sS" placeholder="Speakers for The Zenith are here"></label>
    <label>Message<textarea id="sB" style="min-height:220px" placeholder="Write plainly. Leave a blank line between paragraphs. **bold** works, and links starting with https:// become clickable."></textarea></label>
    <p class="gx-note">Each person gets their own email with an unsubscribe link. Sending goes in batches of 40; with Gmail the daily limit is about 100, so a long list may need “Continue” the next day.</p>`,[
    ['Send me a test',async()=>{await api('subSend',{subject:val('#sS'),body:$('#sB').value,test:true});toast('Test sent to '+ME.email);},'light'],
    ['Send to everyone',async()=>{if(!confirm('Send to all '+C+' confirmed subscribers?'))return;const r=await api('subSend',{subject:val('#sS'),body:$('#sB').value});closeM();if(!r.done)await run(r.id);else{toast('Sent to '+r.sent);VIEWS.subscribers();}}]]);
  paint();
};

/* ───────── preview data ───────── */
const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  const a=b.action,now=()=>new Date(Date.now()+19800000).toISOString().slice(0,19);
  if(!D._f){const acc=[['BNK-101','Bank account','Asset','Bank & cash'],['CSH-101','Cash in hand','Asset','Bank & cash'],['ADV-101','Advances to team members','Asset','Receivables'],['PAY-101','Payables (vendors and members)','Liability','Payables'],['CAP-101',"Organizer's capital",'Capital','Capital'],['CAP-102','Accumulated surplus','Capital','Capital'],
      ['INC-101','Sponsorships','Income','Income'],['INC-102','Registrations and tickets','Income','Income'],['INC-104','Side events','Income','Income'],['EME-101','Venue and set-up','Expense','Event management'],['EME-102','Stage, AV and production','Expense','Event management'],['EME-103','Printing and branding','Expense','Event management'],
      ['EME-104','Speaker hospitality and travel','Expense','Event management'],['EME-105','Food and refreshments','Expense','Event management'],['OPX-101','TEDx licence and fees','Expense','Operations'],['OPX-102','Software and subscriptions','Expense','Operations'],['ADJ-101','Adjustments and reallocations','Expense','Adjustments']]
      .map((x,i)=>({code:x[0],name:x[1],type:x[2],grp:x[3],active:'TRUE',sort:String(i+1)}));
    const E=(id,date,kind,dr,cr,amt,party,n,extra)=>Object.assign({id:'JV/2026-27/'+id,fy:'FY2026-27',date,kind,debit:dr,credit:cr,amount:String(amt),party,narration:n,mode:'Bank transfer',reference:'',ref_id:'',proof_url:'',voucher_id:'',voucher_code:'',status:'Posted',created_by:me.email,created_at:date+'T10:00:00'},extra||{});
    D._f={accounts:acc,years:[{id:'FY2026-27',label:'Financial year 2026–27',status:'Open',budgets_json:JSON.stringify({'EME-101':60000,'EME-102':80000,'EME-103':20000,'EME-105':15000,'OPX-102':6000})}],
      entries:[E('00007','2026-11-08','Expense','EME-105','BNK-101',1800,'Sample Member','Reimbursement for Snacks for rehearsal (MR/2026-27/0001)',{voucher_id:'TXTY/REG/2026/0011',voucher_code:'TXTY-V8KD-22QX',ref_id:'MR/2026-27/0001'}),
        E('00006','2026-11-06','Transfer','ADJ-101','EME-105',1200,'','Reallocate catering advance'),E('00005','2026-11-05','Sponsorship','BNK-101','INC-101',40000,'Acme Ltd','Sponsorship from Acme Ltd · first tranche',{ref_id:'SPN-1',voucher_id:'TXTY/REG/2026/0010',voucher_code:'TXTY-R4CP-7MZA'}),
        E('00004','2026-10-28','Expense','EME-103','BNK-101',14500,'PrintHub','Standees and backdrop print'),E('00003','2026-10-20','Expense','OPX-102','BNK-101',4999,'Zoho','Zoho Mail annual plan'),E('00002','2026-10-02','Income','BNK-101','INC-104',6400,'Walk-ins','Side event tickets: Zenith Community Meetup'),
        E('00001','2026-10-01','Capital','BNK-101','CAP-101',50000,'Fenil Pritesh Shah','Capital introduced for 2026–27')],
      reqs:[{id:'MR/2026-27/0003',fy:'FY2026-27',email:'riya@example.com',name:'Riya Patel',department_id:'DP3',kind:'Advance',title:'Speaker welcome kits',amount:'6500',code:'EME-104',status:'Head approved',created_at:'2026-11-10T11:00',history:'2026-11-10 11:00 · Riya Patel · Requested ₹6,500\n2026-11-10 15:20 · Hirva · Head approved',payee:'Riya Patel',payee_details:'riya@okhdfc'},
        {id:'MR/2026-27/0002',fy:'FY2026-27',email:'kalash@example.com',name:'Kalash',department_id:'DP4',kind:'Vendor payment',title:'Instagram ad boost',amount:'3000',code:'OPX-102',status:'Approved',created_at:'2026-11-09T10:00',history:'',payee:'Meta',payee_details:'Card'},
        {id:'MR/2026-27/0001',fy:'FY2026-27',email:me.email,name:me.name,department_id:'',kind:'Reimbursement',title:'Snacks for rehearsal',amount:'1800',code:'EME-105',status:'Paid',paid_amount:'1800',voucher_id:'TXTY/REG/2026/0011',created_at:'2026-11-07T18:00',history:'2026-11-07 · Requested\n2026-11-08 · Paid ₹1,800'}],
      pledges:[{id:'SPN-1',fy:'FY2026-27',sponsor:'Acme Ltd',tier:'Gold',committed:'100000',due_date:'2026-12-15',status:'Part received'},{id:'SPN-2',fy:'FY2026-27',sponsor:'Bright Foods',tier:'Partner',committed:'25000',due_date:'2027-01-10',status:'Agreement signed'}],
      devices:[{id:'DEV1',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/131',created_at:'2026-11-11T22:10',expires:'2026-12-11T22:10'}]};}
  const F=D._f,rcv=id=>F.entries.filter(e=>e.ref_id===id).reduce((s,e)=>s+(+e.amount),0);
  if(a==='finBoot') return {ok:true,fy:'FY2026-27',years:F.years,accounts:F.accounts,opening:{},entries:F.entries,requests:F.reqs,pledges:F.pledges.map(p=>Object.assign({},p,{committed:+p.committed,received:rcv(p.id)})),
    types:['Asset','Liability','Capital','Income','Expense'],kinds:['Reimbursement','Advance','Vendor payment'],statuses:[],modes:['Bank transfer','UPI','Cash','Cheque','Card','Adjustment'],isSuper:true,limit:2000,hasSignature:true,departments:D.departments,sponsors:[{name:'Acme Ltd'}]};
  if(a==='finMine') return {ok:true,rows:F.reqs.filter(r=>r.email===me.email),toApprove:F.reqs.filter(r=>r.status==='Head approved'),kinds:['Reimbursement','Advance','Vendor payment'],accounts:F.accounts.filter(x=>x.type==='Expense'),isStaff:true,isSuper:true,limit:2000};
  if(a==='finReqNew'){if(!b.title||!(+b.amount>0))return {ok:false,error:'Say what it is for and enter a valid amount.'};const id='MR/2026-27/000'+(F.reqs.length+1);F.reqs.unshift({id,fy:'FY2026-27',email:me.email,name:me.name,kind:b.kind,title:b.title,amount:String(b.amount),code:b.code,status:'Head approved',created_at:now(),history:now()+' · Requested'});return {ok:true,id,status:'Head approved'};}
  if(a==='finReqApprove'||a==='finReqHead'){const r=F.reqs.find(x=>x.id===b.id);r.status=b.decision==='approve'?(a==='finReqHead'?'Head approved':'Approved'):'Rejected';return {ok:true};}
  if(a==='finReqWithdraw'){F.reqs.find(x=>x.id===b.id).status='Withdrawn';return {ok:true};}
  if(a==='finReqPay'){const r=F.reqs.find(x=>x.id===b.id);r.status='Paid';r.paid_amount=b.amount;r.voucher_id='TXTY/REG/2026/0012';F.entries.unshift({id:'JV/2026-27/0000'+(F.entries.length+1),fy:'FY2026-27',date:b.date,kind:'Expense',debit:r.kind==='Advance'?'ADV-101':b.code,credit:b.from,amount:String(b.amount),party:r.name,narration:r.kind+' for '+r.title,status:'Posted',voucher_id:r.voucher_id,created_by:me.email,created_at:now()});return {ok:true,voucher_id:r.voucher_id};}
  if(a==='finReqSettle'){F.reqs.find(x=>x.id===b.id).status='Settled';return {ok:true};}
  if(a==='finPost'){if(!(+b.amount>0)||!b.narration)return {ok:false,error:'Enter the amount and a narration.'};const id='JV/2026-27/0000'+(F.entries.length+1);F.entries.unshift({id,fy:'FY2026-27',date:b.date,kind:b.kind,debit:b.debit,credit:b.credit,amount:String(b.amount),party:b.party,narration:b.narration,mode:b.mode,ref_id:b.ref_id||'',status:'Posted',voucher_id:b.voucher?'TXTY/REG/2026/0013':'',created_by:me.email,created_at:now()});return {ok:true,id,voucher_id:b.voucher?'TXTY/REG/2026/0013':''};}
  if(a==='finReverse'){const e=F.entries.find(x=>x.id===b.id);e.status='Reversed';F.entries.unshift(Object.assign({},e,{id:'JV/2026-27/0000'+(F.entries.length+1),kind:'Reversal',debit:e.credit,credit:e.debit,status:'Posted',narration:'Reversal of '+e.id+': '+b.reason,reversal_of:e.id}));return {ok:true};}
  if(a==='finVoucher') return {ok:true,id:'TXTY/REG/2026/0014',code:'TXTY-AAAA-BBBB'};
  if(a==='finAccountSave'){const r=b.record,x=F.accounts.find(y=>y.code===r.code);if(x)Object.assign(x,r);else F.accounts.push(r);return {ok:true};}
  if(a==='finBudgetSave'){F.years[0].budgets_json=JSON.stringify(b.budgets);return {ok:true};}
  if(a==='finYearSave'){F.years[0].status=b.status;return {ok:true};}
  if(a==='finPledgeSave'){const r=b.record;if(r.id)Object.assign(F.pledges.find(p=>p.id===r.id),r);else F.pledges.push(Object.assign({id:'SPN-'+(F.pledges.length+1)},r));return {ok:true};}
  if(a==='finPledgeRemove'){F.pledges=F.pledges.filter(p=>p.id!==b.id);return {ok:true};}
  if(a==='subList') return {ok:true,group:'tedxthaltej-community@googlegroups.com',groupUrl:'https://groups.google.com/g/tedxthaltej-community',
    rows:[{email:'asha@example.com',name:'Asha Patel',status:'Confirmed',source:'footer:events',created_at:'2026-11-10T10:00'},{email:'rohan@example.com',name:'',status:'Confirmed',source:'subscribe',created_at:'2026-11-09T18:20'},{email:'new@example.com',name:'',status:'Pending',source:'footer:',created_at:'2026-11-11T21:00'}],
    campaigns:[{id:'UPD-1',subject:'Idea Search is open',sent:'2',total:'2',status:'Done'}]};
  if(a==='subSend') return b.test?{ok:true,test:true}:{ok:true,id:'UPD-2',sent:2,left:0,done:true};
  if(a==='subRemove') return {ok:true};
  if(a==='devices') return {ok:true,rows:F.devices};
  if(a==='deviceRemove'){F.devices=F.devices.filter(d=>d.id!==b.id);return {ok:true};}
  if(a==='logoutAll') return {ok:true};
  return prev?prev(b,me,D):null;
};
})();
