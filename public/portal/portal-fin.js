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
SECTIONS.push({id:'health',name:'Admin Health',ico:'♥',grp:'Account',show:()=>ME&&ME.role==='super'});
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
  $('#view').innerHTML=hero('Money requests','<b>Rule: ask before you spend.</b> Get a Spending approval first. After you spend, claim the reimbursement against it with the bill, up to the approved amount. Spending that was never approved is not reimbursed. Advances and vendor payments are also asked for before spending.')+
    (j.claimable&&j.claimable.length?`<div class="banner" style="margin-bottom:12px">You have ${j.claimable.length} approved spending ${j.claimable.length>1?'approvals':'approval'} to claim: ${j.claimable.map(p=>`<b>${esc(p.id)}</b> (${inr(p.amount)}, ${esc(p.title)})`).join(', ')}. After spending, tap <b>Ask for money → Reimbursement</b>.</div>`:'')+
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
    <label style="grid-column:1/-1" id="rqPreL">Approved spending to claim against<select id="rqPre">${(j.claimable||[]).map(p=>`<option value="${esc(p.id)}" data-a="${esc(p.amount)}" data-t="${esc(p.title)}">${esc(p.id)} · ${esc(p.title)} · up to ${inr(p.amount)}</option>`).join('')}</select></label>
    <div class="banner bad" id="rqNo" style="grid-column:1/-1;display:none"><b>You can’t claim yet.</b> Money is only reimbursed for spending that was approved first. Ask for a <b>Spending approval</b> before you spend; once it’s approved, come back here and claim it with the bill.</div>
    <label style="grid-column:1/-1">Budget head (ledger)<select id="rqC"><option value="">Not sure, Finance will choose</option>${opts('')}</select></label>
    <label>Pay to<input id="rqP" placeholder="${esc(ME.name)}"></label><label>UPI ID or bank details<input id="rqPD" placeholder="name@upi"></label>
    <label style="grid-column:1/-1" id="rqBL">Link to the bill, receipt or quote<input id="rqU" placeholder="https://drive.google.com/…"></label>
    <label style="grid-column:1/-1">Details<textarea id="rqX" placeholder="Anything Finance should know"></textarea></label></div>`,[
    ['Send request',async()=>{const r=await api('finReqNew',{pre_id:$('#kT .on').dataset.k==='Reimbursement'?val('#rqPre'):'',kind:$('#kT .on').dataset.k,title:val('#rqT'),amount:val('#rqA'),needed_by:val('#rqD'),code:val('#rqC'),payee:val('#rqP'),payee_details:val('#rqPD'),proof_url:val('#rqU'),details:$('#rqX').value});
      toast(r.id+(r.status==='Approved'?' claimed. Finance will check the bill and pay you':' sent'+(r.status==='Submitted'?' to your head':' for approval')));closeM();go('money');}]]);
    const help={'Spending approval':'Ask BEFORE you spend. Say what you will buy and the most it will cost. Once approved, spend up to that amount, keep the bill, then claim the reimbursement.',Reimbursement:'Claim money you spent against an approved Spending approval. Attach the bill. You can claim up to the approved amount.','Advance':'You need money before spending it. After the work, Finance settles it against the bills and you return anything unspent.','Vendor payment':'Finance pays a vendor directly. Add their quote or invoice.'};
    const sync=()=>{const k=$('#kT .on').dataset.k,re=k==='Reimbursement',none=re&&!(j.claimable||[]).length;$('#kH').textContent=help[k];$('#rqBL').firstChild.textContent=re?'Link to the bill or receipt (required) ':'Link to the quote or invoice (optional) ';
      $('#rqPreL').style.display=re&&!none?'':'none';$('#rqNo').style.display=none?'':'none';$('#mBox').querySelectorAll('.grid2 > label:not(#rqPreL)').forEach(l=>l.style.display=none?'none':'');
      const sb=[...$('#mBox').querySelectorAll('.ft .btn')].pop();if(sb)sb.disabled=none;$('#rqA').placeholder=k==='Spending approval'?'Most it will cost':re?'Amount on the bill':'';
      if(re&&!none){const o=$('#rqPre').selectedOptions[0];$('#rqA').max=o.dataset.a;if(!val('#rqT'))$('#rqT').value=o.dataset.t;}};
    if($('#rqPre'))$('#rqPre').onchange=sync;
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
        r.status==='Approved'&&r.kind==='Reimbursement'&&['Send back claim',async()=>{const n=prompt('What is wrong with the claim? (The member can claim again with the right bill.)');if(!n)return;await api('finReqReturn',{id:r.id,note:n});toast('Sent back');closeM();reload();},'light'],
        r.status==='Approved'&&r.kind!=='Spending approval'&&['Record payment…',()=>pay(r)],r.kind==='Advance'&&r.status==='Paid'&&['Settle advance…',()=>settle(r)],voucherBtn(r.voucher_id)]);};
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
      <button class="btn light" id="chPw">Change password</button><button class="btn red" id="outAll">Sign out everywhere</button></div></div>
    <div class="two" style="margin-top:16px"><div class="panel" style="padding:18px;display:grid;gap:10px;align-content:start"><h3>Google account</h3>
      ${ME.google_email?`<p style="font-size:14px">Connected: <b>${esc(ME.google_email)}</b>. You can use <b>Sign in with Google</b>. Official emails can CC this address, and replies to them come here.</p>`:'<p style="font-size:14px">Not connected yet. Connect any Google account to use Sign in with Google.</p>'}
      <div id="gSec"></div><p class="gx-note">We only receive your name and email from Google, never your Gmail or Drive.</p></div>
      ${ME.role==='super'?`<div class="panel" style="padding:18px;display:grid;gap:10px;align-content:start" id="gSetup"><h3>Google sign-in setup</h3><p class="muted">Loading…</p></div>`:'<div></div>'}</div>`;
  if(typeof gButton==='function'){const run=()=>gButton($('#gSec'),'continue_with',async cred=>{try{const r=await api('googleLink',{credential:cred});ME=r.me;toast('Google connected ✓');VIEWS.security();}catch(e){toast(e.message,1);}});
    if(G_CID)run();else api('googleConfig').then(x=>{G_CID=x.client_id;if(G_CID)run();else $('#gSec').innerHTML='<p class="muted" style="font-size:13px">The Organizer hasn’t set up Google sign-in yet.</p>';}).catch(()=>{});}
  if(ME.role==='super'){const g=await api('googleSettings',{});$('#gSetup').innerHTML=`<h3>Google sign-in setup</h3>
      <p class="gx-note">${g.linked} of ${g.total} active users have connected Google.</p>
      <label>OAuth Client ID<input id="gCid" value="${esc(g.client_id||'')}" placeholder="1234-abc.apps.googleusercontent.com"></label>
      <label class="chk"><input type="checkbox" id="gReq" ${g.required?'checked':''}> Require everyone to connect Google at their next sign-in</label>
      <details style="font-size:13px"><summary style="cursor:pointer;font-weight:700">How to get a Client ID (5 minutes, free)</summary><ol style="margin:8px 0 0 18px;line-height:1.7">
        <li>Open <b>console.cloud.google.com</b> with the TEDxThaltej Google account and create a project.</li>
        <li><b>Google Auth Platform → Branding</b>: app name <b>TEDxThaltej Youth Master Ctrl</b>, support email, logo optional. Audience: <b>External</b>, then <b>Publish app</b>.</li>
        <li><b>Clients → Create client → Web application</b>. Authorised JavaScript origins: <b>https://tedxthaltejyouth.in</b> (and https://www.tedxthaltejyouth.in if you use it).</li>
        <li>Copy the <b>Client ID</b> here. No secret is needed. Only name and email are requested, so users see no warning.</li></ol></details>
      <div><button class="btn red" id="gSave">Save</button></div>`;
    $('#gSave').onclick=async()=>{await api('googleSettings',{client_id:$('#gCid').value,required:$('#gReq').checked});G_CID=$('#gCid').value.trim();toast('Saved');ME=(await api('me')).me;if(ME.needs_google)return boot();VIEWS.security();};}
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

/* ═════════════ ONBOARD EXISTING MEMBERS ═════════════ */
window.onboardExisting=async function(){
  let deps=[];try{deps=(await api('list',{module:'departments'})).rows;}catch(e){}
  const dOpt=sel=>deps.map(d=>`<option value="${esc(d.id)}" ${d.id===sel?'selected':''}>${esc(d.name)}</option>`).join('');
  const row=()=>`<div class="obr" style="display:grid;grid-template-columns:1.2fr 1.5fr 1.1fr 1.1fr .9fr 30px;gap:6px;margin-bottom:6px">
    <input placeholder="Full name" class="oN"><input placeholder="email@example.com" class="oE" type="email"><select class="oD">${dOpt('')}</select>
    <input placeholder="Title, e.g. Design Associate" class="oT"><select class="oR"><option value="member">Member</option><option value="lead">Head (lead)</option><option value="editor">Editor</option></select><button type="button" class="oX" style="border:0;background:#f4f2ee;border-radius:8px;cursor:pointer">×</button></div>`;
  modal('Onboard existing team members',`<p class="gx-note">Each person gets a <b>secret, single-use link</b> by email. On it they read and sign the Charter (signature, location and camera photo), create their password, and their Team Portal opens straight away. They skip the application and interview.</p>
    <div style="display:flex;gap:10px;align-items:center;margin:10px 0"><label style="display:flex;gap:8px;align-items:center;font-weight:700">Link valid for <select id="oH"><option value="24" selected>24 hours</option><option value="48">48 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></label></div>
    <div id="oRows">${row()}${row()}${row()}</div><button type="button" class="btn sm light" id="oAdd">+ Another person</button>
    <details style="margin-top:10px"><summary class="gx-note" style="cursor:pointer">Paste a list instead (name, email, one per line)</summary><textarea id="oPaste" placeholder="Kavya Shah, kavya@example.com&#10;Arjun Mehta, arjun@example.com"></textarea><button type="button" class="btn sm light" id="oFill" style="margin-top:6px">Fill the rows</button></details>
    <div id="oRes"></div>`,[['Send onboarding links',async()=>{
      const people=[...$('#oRows').querySelectorAll('.obr')].map(r=>({name:r.querySelector('.oN').value.trim(),email:r.querySelector('.oE').value.trim(),department_id:r.querySelector('.oD').value,title:r.querySelector('.oT').value.trim(),portal_role:r.querySelector('.oR').value})).filter(p=>p.name||p.email);
      if(!people.length)return toast('Add at least one person',1);
      const j=await api('recInviteExisting',{people,hours:val('#oH')});
      $('#oRes').innerHTML=`<div class="gx-sec" style="font-size:16px">Sent ${j.results.filter(x=>x.ok).length} of ${j.results.length}</div>`+j.results.map((x,i)=>`<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px"><span style="flex:1"><b>${esc(x.name||x.email)}</b> <span class="muted">${esc(x.email)}</span></span>${x.ok?`<span class="badge b-Valid">Emailed</span><button class="btn sm light" data-cp="${i}">Copy link</button>`:`<span class="badge b-Rejected">${esc(x.error)}</span>`}</div>`).join('')+
        '<p class="gx-note" style="margin-top:8px">You can also send the link on WhatsApp. It is secret: anyone with it can onboard as that person until it is used or expires.</p>';
      $('#oRes').querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>{try{navigator.clipboard.writeText(j.results[b.dataset.cp].link);toast('Link copied');}catch(e){prompt('Copy:',j.results[b.dataset.cp].link);}});
      $('#oRows').innerHTML=row();bind();}]]);
  $('#mBox').classList.add('wide');
  const bind=()=>$('#oRows').querySelectorAll('.oX').forEach(b=>b.onclick=()=>b.parentNode.remove());bind();
  $('#oAdd').onclick=()=>{$('#oRows').insertAdjacentHTML('beforeend',row());bind();};
  $('#oFill').onclick=()=>{const L=$('#oPaste').value.split('\n').map(l=>l.split(/[,\t;]/).map(x=>x.trim())).filter(x=>x[0]);$('#oRows').innerHTML=L.map(()=>row()).join('');
    [...$('#oRows').querySelectorAll('.obr')].forEach((r,i)=>{const x=L[i];const em=x.find(v=>/@/.test(v))||'';r.querySelector('.oE').value=em;r.querySelector('.oN').value=x.find(v=>v&&!/@/.test(v))||'';});bind();};
};
/* one shared link for the whole team + activation queue */
window.teamOnboarding=async function(){
  const j=await api('teamLinks');const dn=id=>(j.departments.find(d=>d.id===id)||{}).name||id;
  modal('Team onboarding link',`<p class="gx-note">Share <b>one secret link</b> with your existing team (WhatsApp group, email). Each person enters their details and the date they joined, reads and signs the Charter (signature, location, camera photo) and creates their password. Then you just click <b>Activate</b>.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin:12px 0"><label>Valid for<select id="tlH"><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></label>
      <label>Up to<input id="tlM" type="number" value="20" min="1" max="200" style="width:90px"> people</label><label style="flex:1">Note<input id="tlN" placeholder="e.g. Core team 2026-27"></label><button class="btn red" id="tlGo" type="button">Create link</button></div>
    <div id="tlNew"></div>
    <div class="gx-sec" style="font-size:16px">Waiting for activation (${j.pending.length})</div>
    ${j.pending.length?j.pending.map((p,i)=>`<div class="gx-card" style="box-shadow:none;margin-bottom:8px"><div class="row" style="justify-content:space-between"><h4>${esc(p.name)}</h4><span class="badge b-Submitted">Signed ${fmt(p.signed_at)}</span></div>
      <div class="meta">${esc(p.email)}${p.phone?' · '+esc(p.phone):''} · joined <b>${esc(p.joined_on)}</b>${p.evidence?' · signed near '+esc(p.evidence):''}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap;display:flex;align-items:center"><select style="width:auto" data-d="${i}">${j.departments.map(d=>`<option value="${esc(d.id)}" ${d.id===p.department_id?'selected':''}>${esc(d.name)}</option>`).join('')}</select>
        <span class="meta">${esc(p.title||'Member')}</span><select style="width:auto" data-r="${i}"><option value="member">Member</option><option value="lead">Head (lead)</option><option value="editor">Editor</option></select>
        <button class="btn sm ok" data-a="${i}">✓ Activate</button><button class="btn sm light" data-x="${i}">Reject</button></div></div>`).join(''):'<p class="muted">Nobody waiting.</p>'}
    <div class="gx-sec" style="font-size:16px">Links</div>${j.links.map(l=>`<div style="display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px"><span style="flex:1"><b>${esc(l.note||l.id)}</b> <span class="muted">until ${esc(String(l.expires).replace('T',' ').slice(0,16))}</span></span><span>${esc(l.uses)} / ${esc(l.max_uses)} used</span>${l.live?`<span class="badge b-Valid">Live</span><button class="btn sm light" data-cl="${esc(l.id)}">Close</button>`:`<span class="badge b-Closed">${l.status==='Closed'?'Closed':'Ended'}</span>`}</div>`).join('')||'<p class="muted">No links yet.</p>'}`,[]);
  $('#mBox').classList.add('wide');
  $('#tlGo').onclick=async()=>{const r=await api('teamLinkCreate',{hours:val('#tlH'),max:val('#tlM'),note:val('#tlN')});
    $('#tlNew').innerHTML=`<div class="banner" style="display:grid;gap:8px"><b>Your link (secret, shown only now):</b><code class="mono" style="word-break:break-all;background:#fff;padding:8px;border-radius:8px">${esc(r.url)}</code><div style="display:flex;gap:8px"><button class="btn sm red" id="tlC">Copy link</button><a class="btn sm light" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Hi team! Please complete your TEDxThaltej Youth onboarding (Charter + Team Portal) here before '+String(r.expires).replace('T',' ').slice(0,16)+' IST: '+r.url)}">Share on WhatsApp</a></div></div>`;
    $('#tlC').onclick=()=>{try{navigator.clipboard.writeText(r.url);toast('Link copied');}catch(e){prompt('Copy:',r.url);}};};
  $('#mBox').querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{const i=b.dataset.a,p=j.pending[i];b.disabled=true;
    try{const x=await api('teamActivate',{id:p.id,department_id:$('#mBox').querySelector(`[data-d="${i}"]`).value,portal_role:$('#mBox').querySelector(`[data-r="${i}"]`).value});toast(x.emailed===false?p.name+' activated, but the email failed: '+x.email_error+'. Check Admin Health → email.':p.name+' activated ✓ · email sent',x.emailed===false?1:0);b.closest('.gx-card').remove();}catch(e){toast(e.message,1);b.disabled=false;}});
  $('#mBox').querySelectorAll('[data-x]').forEach(b=>b.onclick=async()=>{const p=j.pending[b.dataset.x];if(!confirm('Reject '+p.name+'? Their waiting account is removed.'))return;await api('teamActivate',{id:p.id,decision:'reject'});toast('Rejected');b.closest('.gx-card').remove();});
  $('#mBox').querySelectorAll('[data-cl]').forEach(b=>b.onclick=async()=>{await api('teamLinkClose',{id:b.dataset.cl});toast('Link closed');teamOnboarding();});
};
{const _r=VIEWS.recruit,_a=VIEWS.admins;
 VIEWS.recruit=async function(){await _r.call(VIEWS);if(ME.role==='super'){const c=document.createElement('button');c.className='btn red';c.textContent='Team onboarding link';c.onclick=teamOnboarding;$('#tools').appendChild(c);const b=document.createElement('button');b.className='btn light';b.textContent='Personal links';b.onclick=onboardExisting;$('#tools').appendChild(b);}};
 VIEWS.admins=async function(){await _a.call(VIEWS);if(ME.role==='super'){const b=document.createElement('button');b.className='btn red';b.textContent='Team onboarding link';b.onclick=teamOnboarding;$('#tools').prepend(b);}};}

/* ═════════════ SPEAKERS: interview or direct selection, profile, availability ═════════════ */
window.spkAvailHTML=function(sp,compact){
  let A=null;try{A=JSON.parse(sp.availability_json||'null');}catch(e){}
  if(!A)return `<div class="banner" style="margin-top:12px">${esc(sp.name)} hasn’t shared their free times yet. They add them in the speaker portal under “Profile & availability”.</div>`;
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],slots=['08–10','10–12','12–14','14–16','16–18','18–20','20–22'];
  return `<div class="panel" style="padding:14px 16px;margin-top:12px"><b>${esc(String(sp.name).split(' ')[0])} is usually free</b> <span class="muted" style="font-size:12px">${A.online!==false?'· online ✓':''} ${A.inperson!==false?'· in person ✓':''} · updated ${fmt(A.updated_at)}</span>
    <div style="overflow-x:auto"><table style="border-collapse:separate;border-spacing:3px;margin-top:8px;font-size:11px"><tr><th></th>${slots.map(x=>`<th style="color:var(--mute);font-weight:700;padding:0 4px">${x}</th>`).join('')}</tr>
    ${days.map(d=>`<tr><th style="text-align:left;padding-right:6px">${d}</th>${slots.map(x=>`<td style="width:44px;height:${compact?18:22}px;border-radius:6px;background:${(A.grid[d]||[]).includes(x)?'#13804b':'#f1efea'}"></td>`).join('')}</tr>`).join('')}</table></div>
    ${(A.away||[]).length?`<div style="margin-top:8px;font-size:13px"><b>Away:</b> ${A.away.map(a=>esc(fmt(a.from)+(a.to!==a.from?' – '+fmt(a.to):'')+(a.why?' ('+a.why+')':''))).join(' · ')}</div>`:''}${A.note?`<div class="muted" style="font-size:13px;margin-top:4px">“${esc(A.note)}”</div>`:''}</div>`;
};
window.spkOverviewPlus=function(T,sp,d,j,reopen){
  const fmtDT=s=>s?new Date(String(s).slice(0,16)+':00+05:30').toLocaleString('en-IN',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'}):'';
  const st=sp.stage||'Not invited',pre=['Not invited','Interview scheduled','Interviewed',''].includes(st);
  let html='';
  if(j.canWrite&&pre) html+=`<div class="panel" style="padding:16px;margin-top:16px"><b>Selection</b> <span class="muted" style="font-size:13px">${sp.selection==='interview'?'Interview path':'Choose a path'}</span>
    ${sp.interview_at?`<div style="margin-top:8px;font-size:14px">Interview: <b>${fmtDT(sp.interview_at)}</b> · ${esc(sp.interview_minutes)} min ${/^https:/.test(sp.interview_link||'')?`· <a href="${esc(sp.interview_link)}" target="_blank" rel="noopener">Join Meet ↗</a>`:esc(sp.interview_link||'')}</div>`:''}
    ${sp.interview_note?`<div class="log" style="margin-top:8px">${esc(sp.interview_note)}</div>`:''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn light" id="spIv">${sp.interview_at?'Reschedule interview':'Interview first (no commitment)'}</button>
    ${sp.interview_at?`<button class="btn light" id="spNote">Add interview notes</button>${d.isSuper?`<button class="btn ok" id="spSel">✓ Select → send portal invite</button><button class="btn light" id="spDec">Not selected…</button>`:''}`:'<span class="muted" style="font-size:13px;align-self:center">or use “Invite to speaker portal” above for direct selection</span>'}</div></div>`;
  html+=`<div class="panel" style="padding:16px;margin-top:12px;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">${sp.photo_url?`<img src="${esc(sp.photo_url)}" alt="" style="width:110px;height:138px;object-fit:cover;border-radius:12px">`:'<div style="width:110px;height:138px;border-radius:12px;background:#f1efea;display:grid;place-items:center;font-size:12px;color:var(--mute);text-align:center">No headshot yet</div>'}
    <div style="flex:1;min-width:220px"><b>${esc(sp.designation||'No designation yet')}</b>${sp.linkedin?` · <a href="${esc(sp.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>`:''}<p style="font-size:13.5px;margin-top:6px;white-space:pre-wrap">${esc(sp.bio||'No bio yet. The speaker adds it in their portal.')}</p>${sp.bio_short?`<p style="font-size:12.5px;margin-top:6px"><b>Short:</b> ${esc(sp.bio_short)}</p>`:''}${sp.bio_line?`<p style="font-size:12.5px"><b>Card line:</b> ${esc(sp.bio_line)}</p>`:''}
    ${sp.photo_url?`<a class="btn sm light" href="${esc(sp.photo_url.replace('thumbnail?id=','uc?export=download&id=').replace(/&sz=.*/,''))}" target="_blank" rel="noopener" style="margin-top:6px">⇩ Full-size headshot</a>`:''}</div></div>`+window.spkAvailHTML(sp);
  T.insertAdjacentHTML('beforeend',html);
  if($('#spIv'))$('#spIv').onclick=()=>modal('Interview '+sp.name,`<p class="gx-note">The email makes clear this conversation is <b>not a confirmation of selection</b> and carries no commitment.</p>
    <div class="grid2"><label>Date<input type="date" id="iD" value="${esc(String(sp.interview_at||'').slice(0,10))}"></label><label>Time (IST)<input type="time" id="iT" value="${esc(String(sp.interview_at||'').slice(11,16)||'17:00')}"></label>
    <label>Minutes<input type="number" id="iM" value="${esc(sp.interview_minutes||30)}"></label><label>Interviewers (emails, comma-separated)<input id="iP" placeholder="hirva@…, jagruti@…"></label>
    <label class="chk" style="grid-column:1/-1"><input type="checkbox" id="iG" checked> Google Meet + calendar invites</label><label style="grid-column:1/-1">Or place / link<input id="iL"></label>
    <label style="grid-column:1/-1">Personal note (optional)<textarea id="iN"></textarea></label></div>`,[
    ['Send interview invite',async()=>{const r=await api('spkInterview',{id:sp.id,at:val('#iD')+'T'+val('#iT'),minutes:val('#iM'),interviewers:val('#iP').split(/[,\s]+/).filter(Boolean),meet:$('#iG').checked,location:val('#iL'),note:$('#iN').value});
      toast('Interview invite sent'+(r.link?' · '+r.link:''));closeM();reopen();}]]);
  if($('#spNote'))$('#spNote').onclick=async()=>{const n=prompt('Interview notes (visible to the team):',sp.interview_note||'');if(n==null)return;await api('spkInterviewOutcome',{id:sp.id,decision:'interviewed',note:n});toast('Saved');reopen();};
  if($('#spSel'))$('#spSel').onclick=async()=>{if(!confirm('Select '+sp.name+' and send the speaker portal invitation?'))return;await api('spkInterviewOutcome',{id:sp.id,decision:'select'});toast('Selected · portal invitation sent');reopen();};
  if($('#spDec'))$('#spDec').onclick=async()=>{if(!confirm('Mark '+sp.name+' as not selected and send a polite thank-you email?'))return;await api('spkInterviewOutcome',{id:sp.id,decision:'decline'});toast('Marked not selected');reopen();};
};

/* ═════════════ CURATION REPORT (TEDx Content Guidelines) ═════════════ */
document.addEventListener('click',e=>{const b=e.target.closest('[data-cur]');if(b){e.preventDefault();curationReport(b.dataset.cur);}});
window.curationReport=async function(id,refresh){
  toast(refresh?'Re-running the curation report…':'Preparing the curation report…');
  let j;try{j=await api('aiCurate',{draftId:id,refresh:!!refresh});}catch(e){return toast(e.message,1);}
  const R=j.report,V={ready:['Ready for the stage','#13804b'],minor:['Minor changes','#a86a00'],major:['Major changes needed','#EB0028'],not_suitable:['Not suitable for TEDx','#111']};
  const ST={pass:['✓ Pass','#13804b','#e6f6ec'],caution:['! Caution','#8a6100','#fff4e0'],fail:['✕ Fails','#b00020','#fdeaea']};
  const bar=n=>`<span style="display:inline-flex;gap:3px;vertical-align:middle">${[1,2,3,4,5].map(i=>`<i style="width:14px;height:8px;border-radius:3px;background:${i<=n?'#101B3D':'#e4e2dd'}"></i>`).join('')}</span>`;
  const CR={opening:'Opening',structure:'Structure',evidence:'Evidence',storytelling:'Storytelling',ending:'Ending',accessibility:'Accessibility'};
  const html=`<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><span style="background:${V[R.verdict][1]};color:#fff;border-radius:999px;padding:8px 16px;font-weight:900">${V[R.verdict][0]}</span>
    <span class="muted" style="font-size:13px">${esc(R.speaker)} · v${esc(R.version)} · ${R.words} words · ~${R.minutes} min${R.minutes>18?' <b style="color:#b00020">(over 18 min)</b>':''}</span></div>
    <p style="font-size:15px">${esc(R.summary)}</p>
    <div class="panel" style="padding:14px 16px;margin:12px 0"><div class="muted" style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">The idea worth spreading</div><div style="font-size:18px;font-weight:800;margin-top:4px">${esc(R.idea)}</div>
      <div style="font-size:13px;margin-top:6px">Strength ${bar(R.idea_strength)} · ${esc(R.theme_fit)}</div></div>
    <h3 style="margin:16px 0 8px">TEDx Content Guidelines</h3>
    ${R.guidelines.map(g=>`<div style="border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:8px"><div style="display:flex;gap:10px;align-items:center"><b style="flex:1">${esc(g.title)}</b><span style="background:${ST[g.status][2]};color:${ST[g.status][1]};border-radius:999px;padding:3px 10px;font-weight:800;font-size:12px">${ST[g.status][0]}</span></div>
      ${g.note?`<div style="font-size:13px;margin-top:4px">${esc(g.note)}</div>`:''}${g.findings.map(f=>`<div style="margin-top:8px;padding:8px 10px;background:#faf8f4;border-radius:10px;font-size:13px">${f.paragraph?`<b>¶${f.paragraph}</b> `:''}${f.quote?`“${esc(f.quote)}”`:''}<div>${esc(f.issue)}</div>${f.fix?`<div style="color:#13804b"><b>Fix:</b> ${esc(f.fix)}</div>`:''}</div>`).join('')}</div>`).join('')}
    <h3 style="margin:16px 0 8px">Talk craft</h3><table style="width:100%;font-size:13px;border-collapse:collapse">${Object.keys(CR).map(k=>`<tr style="border-bottom:1px solid var(--line)"><td style="padding:6px 0;font-weight:700;width:130px">${CR[k]}</td><td style="width:100px">${bar(R.craft[k].score)}</td><td>${esc(R.craft[k].note)}</td></tr>`).join('')}</table>
    ${R.strengths.length?`<h3 style="margin:16px 0 6px">Strengths</h3><ul style="margin-left:18px;font-size:14px">${R.strengths.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
    ${R.risks.length?`<h3 style="margin:16px 0 6px">Check carefully</h3><ul style="margin-left:18px;font-size:14px">${R.risks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
    ${R.next_steps.length?`<h3 style="margin:16px 0 6px">Next steps for the speaker</h3><ol style="margin-left:18px;font-size:14px">${R.next_steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}
    <p class="muted" style="font-size:11.5px;margin-top:14px">AI-assisted report (${esc(R.model)}, ${fmt(R.made_at)}) against TED’s TEDx Content Guidelines. It advises; the curation team decides. Verify every flagged point yourself.</p>`;
  modal('Curation report: '+R.title,html,[
    ['Re-run',()=>curationReport(id,true),'light left'],
    ['Copy next steps',()=>{const t=R.next_steps.map((x,i)=>(i+1)+'. '+x).join('\n');try{navigator.clipboard.writeText(t);toast('Copied');}catch(e){prompt('Copy:',t);}},'light'],
    ['Print / PDF',()=>print('Curation report — '+R.speaker,`<h1>Curation report · ${esc(R.title)}</h1>`+html.replace(/var\(--line\)/g,'#ddd'))]]);
  $('#mBox').classList.add('wide');
};

/* ═════════════ ADMIN HEALTH ═════════════ */
VIEWS.health=async function(){
  const j=await api('opsHealth');const E=j.email,S=j.switches;
  addBtn('↻ Refresh',()=>VIEWS.health());
  const tile=(lab,val,sub,cls)=>`<div class="fx-tile ${cls||''}"><small>${lab}</small><b style="font-size:24px">${val}</b>${sub?`<span class="muted" style="font-size:12px">${sub}</span>`:''}</div>`;
  const PN={zepto:'ZeptoMail',zoho:'Zoho Mail',gmail:'Gmail'},Z=E.zepto||{};
  const lim=E.provider==='zepto'?E.limit_zepto:E.provider==='zoho'?E.limit_zoho:E.limit_gmail, used=E.sent_today[E.provider]||0;
  const sw=(k,lab,help,on)=>`<label style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer"><input type="checkbox" data-sw="${k}" ${on?'checked':''} style="width:20px;height:20px;margin-top:2px;accent-color:#EB0028"><span><b>${lab}</b><div class="muted" style="font-size:12.5px">${help}</div></span></label>`;
  const maxM=Math.max(5,...j.traffic.minutes.map(m=>m.get+m.post)),maxH=Math.max(5,...j.traffic.hours.map(m=>m.get+m.post));
  const bars=(arr,max,lab)=>`<div style="display:flex;align-items:flex-end;gap:2px;height:90px">${arr.map(m=>`<div title="${esc(m[lab])} · ${m.get} views, ${m.post} actions" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%"><i style="display:block;height:${m.post/max*100}%;background:#EB0028;border-radius:2px 2px 0 0"></i><i style="display:block;height:${m.get/max*100}%;background:#101B3D"></i></div>`).join('')}</div>`;
  const ST={Queued:'b-Submitted',Held:'b-Open',Failed:'b-Rejected'};
  $('#view').innerHTML=`<div class="fx-tiles">
    ${tile('Team Portal',S.portal?'Paused':'Running',S.portal?'Only you can sign in':'Everyone can sign in',S.portal?'':'dark')}
    ${tile('Public forms',S.forms?'Paused':S.busy?'Busy':'Open',S.busy?'Traffic guard is on':S.traffic_limit?'Guard at '+S.traffic_limit+'/min':'No traffic guard')}
    ${tile('Email today',used+' / '+lim,PN[E.provider]+(E.gmail_quota_left!=null&&E.provider==='gmail'?' · Google allows '+E.gmail_quota_left+' more':''))}
    ${tile('Email queue',E.queued,(E.held?E.held+' held · ':'')+(E.failed?E.failed+' failed':'waiting to send'),E.failed?'':'')}
    ${tile('AI',j.ai?'On':'Off',j.ai?'Groq / Gemini key set':'Add GROQ_API_KEY')}
    ${tile('Last backup',j.backup.at?fmt(j.backup.at):'Never',j.backup.at?'Daily at 3 am, last 30 kept':'Click “Back up now”')}
    ${tile('Errors',j.errors.length,j.errors.length?'see below':'none logged')}</div>
    ${!j.triggers.daily||!j.triggers.hourly?'<div class="banner"><b>Scheduled jobs are not installed.</b> In Apps Script, run <code>authorize</code> once to install the daily and hourly jobs (backups, email queue).</div>':''}
    <div class="two"><div class="panel" style="padding:18px"><h3>Pause switches</h3>
      ${sw('forms','Pause public forms','Applications, registrations, subscriptions and onboarding links show a message instead. Pages, the portal and /verify still work.',S.forms)}
      <label style="display:block;margin:8px 0">Message people see<input id="hMsg" value="${esc(S.message)}" placeholder="Forms are paused for a short while. Please try again later."></label>
      ${sw('email','Pause outgoing email','Emails wait in the queue. Sign-in codes and password emails still go out.',S.email)}
      ${sw('portal','Pause the Team Portal (maintenance)','Only you can sign in. Others see the maintenance message.',S.portal)}
      <div style="display:flex;gap:10px;align-items:end;margin-top:12px;flex-wrap:wrap"><label>Traffic guard (actions per minute, 0 = off)<input id="hTr" type="number" min="0" value="${S.traffic_limit}" style="width:140px"></label>
        <button class="btn sm red" id="hTrS">Save</button>${S.busy?'<button class="btn sm light" id="hBusy">Turn off “busy” now</button>':''}</div>
      <p class="gx-note" style="margin-top:6px">When more public actions than this arrive in one minute, forms pause themselves for 10 minutes. Try 120.</p></div>
    <div class="panel" style="padding:18px"><h3>Email sending</h3>
      <div style="border:1.5px solid ${Z.on?'#13804b':'var(--line)'};border-radius:14px;padding:12px 14px;margin:10px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>ZeptoMail (Zoho transactional API)</b>${Z.on?'<span class="badge b-Valid">Connected</span>':'<span class="badge">Not connected</span>'}</div>
        <div class="gx-note" style="margin:4px 0 8px">${Z.on?`Sends from <b>${esc(Z.from)}</b> via ${esc(Z.host)} · token ${esc(Z.key_hint)}${Z.alias?' · agent '+esc(Z.alias):''}`:'For sign-in codes, vouchers, letters, onboarding and every other website email. Subscriber updates still go through Zoho Mail or Gmail, because ZeptoMail doesn’t allow newsletters.'}</div>
        ${Z.error?`<div style="color:var(--bad);font-size:12.5px;margin-bottom:6px">Last error: ${esc(Z.error)}</div>`:''}
        <button class="btn sm ${Z.on?'light':'red'}" id="zpSet">${Z.on?'Change settings':'Connect ZeptoMail'}</button>${Z.on?' <button class="btn sm light" id="zpOff">Disconnect</button>':''}</div>
      <div style="margin:12px 0 4px"><b style="font-size:13px">Which services send email</b><p class="gx-note" style="margin:2px 0 8px">Switch each on or off and set the order with the arrows. The first one that is on and set up sends; if it fails, the next takes over.</p>
        ${(E.order||['zepto','zoho','gmail']).map((p,i,arr)=>{const ready=p==='zepto'?Z.on:p==='zoho'?E.zoho:true,on=(E.use||{})[p]!==false,act=(E.chain||[])[0]===p;
          return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border:1.5px solid ${act?'#13804b':'var(--line)'};border-radius:12px;margin-bottom:6px;background:${on&&ready?'#fff':'#f6f5f2'}">
            <span style="font-family:Anton,Impact,sans-serif;font-size:18px;width:22px">${i+1}</span>
            <div style="flex:1"><b>${PN[p]}</b>${act?' <span class="badge b-Valid">Sending now</span>':''}<div class="muted" style="font-size:12px">${!ready?(p==='zepto'?'Not connected: connect it above':'Not connected: connect it in Site settings'):p==='zepto'?'Codes, letters and notices. Never used for bulk mail.':p==='zoho'?'All email, including team email and subscriber updates':'Backup from the Google account that runs the site'}${(p==='zoho'?E.zoho_error:p==='gmail'?E.gmail_error:'')?'<br><span style="color:var(--bad)">Last error: '+esc(p==='zoho'?E.zoho_error:E.gmail_error)+'</span>':''}</div></div>
            <button class="btn sm light" data-mv="${i}" data-d="-1" ${i?'':'disabled'} aria-label="Move up">↑</button><button class="btn sm light" data-mv="${i}" data-d="1" ${i<arr.length-1?'':'disabled'} aria-label="Move down">↓</button>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;margin:0"><input type="checkbox" data-use="${p}" ${on?'checked':''} style="width:20px;height:20px;accent-color:#13804b"> ${on?'On':'Off'}</label></div>`;}).join('')}
        <label style="margin-top:8px">Team email and subscriber updates go through<select id="hBulk"><option value="auto" ${E.bulk_via==='auto'?'selected':''}>The order above (skipping ZeptoMail)</option><option value="zoho" ${E.bulk_via==='zoho'?'selected':''}>Zoho Mail first</option><option value="gmail" ${E.bulk_via==='gmail'?'selected':''}>Gmail first</option></select></label>
        <p class="gx-note" style="margin-top:6px">Now: everyday email → <b>${(E.chain||[]).map(p=>PN[p]).join(' → ')||'nothing (all off)'}</b> · bulk → <b>${(E.bulk_chain||[]).map(p=>PN[p]).join(' → ')||'nothing: bulk emails wait in the queue'}</b></p></div>
      <div class="grid2" style="grid-template-columns:1fr 1fr 1fr"><label>ZeptoMail per day<input id="hLzp" type="number" value="${E.limit_zepto||5000}"></label><label>Zoho Mail per day<input id="hLz" type="number" value="${E.limit_zoho}"></label><label>Gmail per day<input id="hLg" type="number" value="${E.limit_gmail}"></label></div>
      <p class="gx-note">Sent today: ZeptoMail ${E.sent_today.zepto||0} · Zoho ${E.sent_today.zoho} · Gmail ${E.sent_today.gmail}. ZeptoMail is paid by credits, so set a daily cap you’re comfortable with.</p>
      <button class="btn sm red" id="hLS" style="margin-top:8px">Save limits</button></div></div>
    <div class="panel" style="padding:18px;margin-top:14px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><h3>Site traffic</h3><span class="muted" style="font-size:12px"><i style="display:inline-block;width:10px;height:10px;background:#101B3D"></i> page data · <i style="display:inline-block;width:10px;height:10px;background:#EB0028"></i> actions (forms, portal)</span></div>
      <div class="muted" style="font-size:12px;margin:8px 0 4px">Last 60 minutes · ${j.traffic.minutes.reduce((s,m)=>s+m.get+m.post,0)} requests</div>${bars(j.traffic.minutes,maxM,'t')}
      <div class="muted" style="font-size:12px;margin:14px 0 4px">Last 48 hours</div>${j.traffic.hours.length?bars(j.traffic.hours,maxH,'hour'):'<p class="muted">Hourly history starts after the first hour.</p>'}</div>
    <div class="panel" style="padding:18px;margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h3>Email queue</h3><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm red" data-q="run">Send waiting now</button>${E.failed?'<button class="btn sm light" data-q="retryFailed">Retry failed</button>':''}</div></div>
      ${j.queue.length?`<table class="fx-tb" style="margin-top:10px"><tr><th>To</th><th>Subject</th><th>Why waiting</th><th>Status</th><th></th></tr>${j.queue.map((x,i)=>`<tr><td style="font-size:12.5px">${esc(x.to)}</td><td><b>${esc(x.subject)}</b>${x.attachments?' 📎':''}<div class="muted" style="font-size:11.5px">${fmt(x.created_at)}</div></td><td style="font-size:12px">${esc(x.reason)}${x.last_error?`<div style="color:var(--bad)">${esc(x.last_error)}</div>`:''}</td><td><span class="badge ${ST[x.status]||''}">${esc(x.status)}</span></td><td style="white-space:nowrap"><button class="btn sm light" data-o="${i}">Open</button></td></tr>`).join('')}</table>`:'<p class="muted" style="margin-top:8px">Nothing waiting. Every email has gone out.</p>'}</div>
    <div class="two" style="margin-top:14px"><div class="panel" style="padding:18px"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Errors</h3>${j.errors.length?'<button class="btn sm light" id="hEC">Clear</button>':''}</div>
      ${j.errors.length?j.errors.slice(0,20).map(e=>`<details style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13px"><summary><b>${esc(e.kind)}</b> · ${fmt(e.time)} · ${esc(String(e.message).slice(0,90))}</summary><pre style="white-space:pre-wrap;font-size:11px;background:#faf8f4;padding:8px;border-radius:8px">${esc(e.message)}\n${esc(e.detail)}</pre></details>`).join(''):'<p class="muted" style="margin-top:8px">No system errors. 🎉</p>'}</div>
    <div class="panel" style="padding:18px"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Data & backups</h3><button class="btn sm red" id="hBk">Back up now</button></div>
      ${j.backup.url?`<p style="font-size:13px;margin:6px 0"><a href="${esc(j.backup.url)}" target="_blank" rel="noopener">Open last backup ↗</a> · ${fmt(j.backup.at)}</p>`:''}
      <div style="font-size:12px;margin:10px 0 4px">Sheet size: ${(j.sheet.cells/1e6).toFixed(2)}M of 10M cells</div><div class="gx-prog"><i style="width:${Math.min(100,j.sheet.cells/j.sheet.cell_limit*100)}%;background:${j.sheet.cells>7e6?'var(--red)':'#13804b'}"></i></div>
      <div style="max-height:200px;overflow:auto;margin-top:10px;font-size:12.5px">${j.sheet.tabs.slice(0,40).map(t=>`<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--line)"><span>${esc(t.name)}</span><b>${t.rows}</b></div>`).join('')}</div></div></div>`+`<div class="panel" style="padding:18px;margin-top:14px" id="hClean"><h3>Clean up</h3><p class="muted" style="margin-top:6px">Checking what can be deleted…</p></div>`;
  const save=async b=>{await api('opsSet',b);toast('Saved');VIEWS.health();};
  api('cleanupPreview').then(c=>{const B=$('#hClean');if(!B)return;const any=c.items.some(i=>i.count);
    B.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h3>Clean up</h3><span class="muted" style="font-size:12.5px">Items marked <b>auto</b> are also cleaned every Sunday. A backup is made first.</span></div>
      ${c.items.map(i=>`<label style="display:flex;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);${i.count?'':'opacity:.5'}"><input type="checkbox" class="cl" value="${i.key}" ${i.count&&i.safe?'checked':''} ${i.count?'':'disabled'} style="width:18px;height:18px;accent-color:#EB0028"><span style="flex:1">${esc(i.label)} ${i.safe?'<span class="badge b-Valid">auto</span>':'<span class="badge b-Open">only when you choose</span>'}</span><b>${i.count}</b></label>`).join('')}
      <div style="margin-top:12px"><button class="btn red" id="clGo" ${any?'':'disabled'}>${any?'Delete selected':'Nothing to clean up'}</button></div>`;
    if($('#clGo'))$('#clGo').onclick=async function(){const keys=[...B.querySelectorAll('.cl:checked')].map(x=>x.value);if(!keys.length)return toast('Tick what to delete',1);
      const n=c.items.filter(i=>keys.includes(i.key)).reduce((s,i)=>s+i.count,0);if(!confirm('Permanently delete '+n+' item(s)? A backup copy is made first.'))return;
      this.disabled=true;this.textContent='Backing up, then deleting…';try{await api('opsBackup');const r=await api('cleanupRun',{keys});toast('Deleted '+r.total+' item(s)');}catch(e){toast(e.message,1);}VIEWS.health();};}).catch(()=>{});
  $('#view').querySelectorAll('[data-sw]').forEach(x=>x.onchange=async()=>{const k=x.dataset.sw;if(x.checked&&!confirm({forms:'Pause all public forms?',email:'Pause outgoing email? Emails will wait in the queue.',portal:'Pause the Team Portal for everyone except you?'}[k])){x.checked=false;return;}
    await save({[k]:x.checked,message:val('#hMsg')});});
  $('#hTrS').onclick=()=>save({traffic_limit:val('#hTr'),message:val('#hMsg')});
  if($('#hBusy'))$('#hBusy').onclick=()=>save({busy:false});
  $('#hLS').onclick=()=>save({limit_gmail:val('#hLg'),limit_zoho:val('#hLz'),limit_zepto:val('#hLzp')});
  $('#view').querySelectorAll('[data-use]').forEach(x=>x.onchange=async()=>{if(!x.checked&&!confirm('Switch off '+PN[x.dataset.use]+'? Emails will go through the next service that is on.')){x.checked=true;return;}
    try{await save({use:{[x.dataset.use]:x.checked}});}catch(e){x.checked=!x.checked;}});
  $('#view').querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const o=(E.order||['zepto','zoho','gmail']).slice(),i=+b.dataset.mv,k=i+(+b.dataset.d);[o[i],o[k]]=[o[k],o[i]];save({order:o});});
  $('#hBulk').onchange=e=>save({bulk_via:e.target.value});
  if($('#zpOff'))$('#zpOff').onclick=async()=>{if(!confirm('Disconnect ZeptoMail? Emails will go through Zoho Mail or Gmail.'))return;await api('zeptoSave',{disconnect:true});toast('Disconnected');VIEWS.health();};
  $('#zpSet').onclick=()=>modal('Connect ZeptoMail',`<p class="gx-note">In ZeptoMail: <b>Mail Agents</b> → your agent → <b>Setup Info</b> → <b>API</b>. Copy the host and the Send Mail token. The sender must be on a domain you verified in ZeptoMail.</p>
    <div class="grid2"><label>Host<input id="zH" value="${esc(Z.host||'api.zeptomail.in')}" placeholder="api.zeptomail.in"></label><label>Mail agent alias (optional)<input id="zA" value="${esc(Z.alias||'')}"></label>
    <label style="grid-column:1/-1">Send Mail token ${Z.key_set?'<small>(leave blank to keep '+esc(Z.key_hint)+')</small>':''}<input id="zK" type="password" autocomplete="off" placeholder="Zoho-enczapikey …"></label>
    <label>Send from<input id="zF" value="${esc(Z.from||'')}" placeholder="noreply@tedxthaltejyouth.in"></label><label>Sender name<input id="zN" value="${esc(Z.name||'TEDxThaltej Youth')}"></label></div>
    <p class="gx-note">The token is stored only in the backend’s private settings and never shown again. A test email is sent to you.</p>`,[
    ['Save & send test',async()=>{await api('zeptoSave',{host:val('#zH'),alias:val('#zA'),key:val('#zK'),from:val('#zF'),name:val('#zN'),test:true});toast('Connected ✓ Check your inbox');closeM();VIEWS.health();}]]);
  $('#view').querySelectorAll('[data-q]').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await api('opsQueue',{op:b.dataset.q});toast(b.dataset.q==='run'?`Sent ${r.sent} · ${r.left} still waiting${r.paused?' (email is paused)':''}`:'Done');VIEWS.health();});
  if($('#hEC'))$('#hEC').onclick=async()=>{await api('opsErrorsClear');toast('Cleared');VIEWS.health();};
  $('#hBk').onclick=async function(){this.disabled=true;this.textContent='Backing up…';try{await api('opsBackup');toast('Backup saved to Drive');}catch(e){toast(e.message,1);}VIEWS.health();};
  $('#view').querySelectorAll('[data-o]').forEach(b=>b.onclick=async()=>{const x=j.queue[b.dataset.o];const g=(await api('opsQueueGet',{id:x.id})).item;
    modal('Queued email',`<label>To<input id="qT" value="${esc(g.to)}"></label><label>Subject<input id="qS" value="${esc(g.subject)}"></label>
      <div class="tabsx" id="qV"><button data-t="p" class="on">Preview</button><button data-t="h">Edit HTML</button></div>
      <iframe id="qP" sandbox style="width:100%;height:340px;border:1px solid var(--line);border-radius:12px;background:#fff"></iframe><textarea id="qH" class="hide" style="min-height:340px;font-family:monospace;font-size:12px">${esc(g.html)}</textarea>
      ${g.attachments?`<p class="gx-note">📎 ${g.attachments} attachment(s) will be sent with it.</p>`:''}`,[
      ['Delete',async()=>{if(!confirm('Delete this email? It will never be sent.'))return;await api('opsQueue',{op:'delete',id:x.id});toast('Deleted');closeM();VIEWS.health();},'bad left'],
      [g.status==='Held'?'Release':'Hold',async()=>{await api('opsQueue',{op:g.status==='Held'?'release':'hold',id:x.id});toast('Done');closeM();VIEWS.health();},'light'],
      ['Save changes',async()=>{await api('opsQueue',{op:'edit',id:x.id,to:val('#qT'),subject:val('#qS'),html:$('#qH').value});toast('Saved');closeM();VIEWS.health();},'light'],
      ['Save & send now',async()=>{await api('opsQueue',{op:'edit',id:x.id,to:val('#qT'),subject:val('#qS'),html:$('#qH').value});await api('opsQueue',{op:'sendNow',id:x.id});toast('Sent');closeM();VIEWS.health();}]]);
    $('#mBox').classList.add('wide');$('#qP').srcdoc=g.html;
    $('#qV').querySelectorAll('button').forEach(t=>t.onclick=()=>{$('#qV').querySelectorAll('button').forEach(y=>y.classList.toggle('on',y===t));const ed=t.dataset.t==='h';$('#qH').classList.toggle('hide',!ed);$('#qP').classList.toggle('hide',ed);if(!ed)$('#qP').srcdoc=$('#qH').value;});});
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
      reqs:[{id:'MR/2026-27/0004',fy:'FY2026-27',email:'demo@tedxthaltejyouth.in',name:'Fenil Pritesh Shah',department_id:'DP1',kind:'Spending approval',title:'Printing volunteer posters',amount:'1200',code:'OPX-101',status:'Approved',created_at:'2026-11-12',history:'2026-11-12 · Requested'},{id:'MR/2026-27/0003',fy:'FY2026-27',email:'riya@example.com',name:'Riya Patel',department_id:'DP3',kind:'Advance',title:'Speaker welcome kits',amount:'6500',code:'EME-104',status:'Head approved',created_at:'2026-11-10T11:00',history:'2026-11-10 11:00 · Riya Patel · Requested ₹6,500\n2026-11-10 15:20 · Hirva · Head approved',payee:'Riya Patel',payee_details:'riya@okhdfc'},
        {id:'MR/2026-27/0002',fy:'FY2026-27',email:'kalash@example.com',name:'Kalash',department_id:'DP4',kind:'Vendor payment',title:'Instagram ad boost',amount:'3000',code:'OPX-102',status:'Approved',created_at:'2026-11-09T10:00',history:'',payee:'Meta',payee_details:'Card'},
        {id:'MR/2026-27/0001',fy:'FY2026-27',email:me.email,name:me.name,department_id:'',kind:'Reimbursement',title:'Snacks for rehearsal',amount:'1800',code:'EME-105',status:'Paid',paid_amount:'1800',voucher_id:'TXTY/REG/2026/0011',created_at:'2026-11-07T18:00',history:'2026-11-07 · Requested\n2026-11-08 · Paid ₹1,800'}],
      pledges:[{id:'SPN-1',fy:'FY2026-27',sponsor:'Acme Ltd',tier:'Gold',committed:'100000',due_date:'2026-12-15',status:'Part received'},{id:'SPN-2',fy:'FY2026-27',sponsor:'Bright Foods',tier:'Partner',committed:'25000',due_date:'2027-01-10',status:'Agreement signed'}],
      devices:[{id:'DEV1',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/131',created_at:'2026-11-11T22:10',expires:'2026-12-11T22:10'}]};}
  const F=D._f,rcv=id=>F.entries.filter(e=>e.ref_id===id).reduce((s,e)=>s+(+e.amount),0);
  if(a==='finBoot') return {ok:true,fy:'FY2026-27',years:F.years,accounts:F.accounts,opening:{},entries:F.entries,requests:F.reqs,pledges:F.pledges.map(p=>Object.assign({},p,{committed:+p.committed,received:rcv(p.id)})),
    types:['Asset','Liability','Capital','Income','Expense'],kinds:['Spending approval','Reimbursement','Advance','Vendor payment'],statuses:[],modes:['Bank transfer','UPI','Cash','Cheque','Card','Adjustment'],isSuper:true,limit:2000,hasSignature:true,departments:D.departments,sponsors:[{name:'Acme Ltd'}]};
  if(a==='finMine') return {ok:true,rows:F.reqs.filter(r=>r.email===me.email),toApprove:F.reqs.filter(r=>r.status==='Head approved'),kinds:['Spending approval','Reimbursement','Advance','Vendor payment'],accounts:F.accounts.filter(x=>x.type==='Expense'),isStaff:true,isSuper:true,limit:2000,claimable:F.reqs.filter(r=>r.kind==='Spending approval'&&r.status==='Approved').map(r=>({id:r.id,title:r.title,amount:r.amount}))};
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
  if(a==='teamLinks'){D._tl=D._tl||{links:[{id:'OBL-1',note:'Core team 2026-27',expires:'2026-11-13T09:30:00',max_uses:'20',uses:'3',status:'Active',live:true}],pending:[{id:'AP-9',name:'Meera Joshi',email:'meera@example.com',phone:'98250 00000',department_id:'DP2',title:'Speaker Support',joined_on:'2025-06-01',signed_at:'2026-11-12T09:40',evidence:'Thaltej, Ahmedabad'},{id:'AP-10',name:'Dev Rao',email:'dev@example.com',department_id:'DP4',title:'Design Associate',joined_on:'2026-01-15',signed_at:'2026-11-12T09:52',evidence:'Bodakdev, Ahmedabad'}]};return Object.assign({ok:true,departments:D.departments},D._tl);}
  if(a==='teamLinkCreate') return {ok:true,id:'OBL-2',url:'https://tedxthaltejyouth.in/join/#team='+'c3'.repeat(24),expires:'2026-11-13T09:30:00',max:+b.max};
  if(a==='teamActivate'){D._tl.pending=D._tl.pending.filter(p=>p.id!==b.id);return {ok:true};}
  if(a==='teamLinkClose'){D._tl.links[0].status='Closed';D._tl.links[0].live=false;return {ok:true};}
  if(a==='spkInterview'||a==='spkInterviewOutcome') return {ok:true,link:'https://meet.google.com/xyz-abcd-efg'};
  if(a==='aiCurate') return {ok:true,report:{model:'groq:openai/gpt-oss-120b',made_at:now(),version:'2',title:'Maps of the unseen',speaker:'Asha Rao',words:1850,minutes:14.2,verdict:'minor',
    summary:'A strong, original idea told through a clear personal story. One passage drifts into promoting the speaker’s NGO, and the groundwater statistic needs a primary source. The ending repeats the opening rather than landing a call to think.',
    idea:'Mapping what we cannot see, like groundwater, gives communities the power to plan their own future.',idea_strength:4,theme_fit:'Fits “The Zenith” well: the unseen made visible.',
    guidelines:[{key:'commercial',title:'No commercial agendas',status:'caution',note:'The NGO is named three times and paragraph 9 invites the audience to volunteer.',findings:[{paragraph:9,quote:'Join us at MapForward this summer',issue:'A call to get involved with the speaker’s organisation reads as promotion.',fix:'Replace with an invitation to notice the unseen systems around them.'}]},
      {key:'political',title:'No political agendas or inflammatory rhetoric',status:'pass',note:'Discusses policy gaps without attacking any party or leader.',findings:[]},
      {key:'religious',title:'No religious agendas',status:'pass',note:'',findings:[]},
      {key:'science',title:'No bad science (and health claims)',status:'caution',note:'Groundwater figures are plausible but uncited.',findings:[{paragraph:4,quote:'70 percent of wells in Kutch are dry by May',issue:'A specific statistic with no source.',fix:'Cite the CGWB report or soften to “many”.'}]}],
    craft:{opening:{score:5,note:'The dry-well story hooks immediately.'},structure:{score:4,note:'Clear arc; the middle section on data tools runs long.'},evidence:{score:3,note:'One key number lacks a source.'},storytelling:{score:4,note:'Vivid village scenes.'},ending:{score:3,note:'Restates the opening; give the audience something to do or see differently.'},accessibility:{score:4,note:'Explain “aquifer” once for a global audience.'}},
    risks:['Groundwater statistic (¶4)','Naming the village headman: check consent'],strengths:['Memorable opening story','One clear idea','Warm, humble tone'],
    next_steps:['Remove the volunteering call in ¶9','Add a source for the 70% figure or soften it','Cut ¶6–7 by about a third','Rewrite the last minute to land the idea','Explain “aquifer” the first time it appears']}};
  if(a==='opsHealth'){const mins=[];for(let i=59;i>=0;i--){const d=new Date(Date.now()-i*6e4+19800000);mins.push({t:d.toISOString().slice(11,16),get:Math.round(8+6*Math.sin(i/5)+Math.random()*6),post:Math.round(Math.random()*4)});}
    const hours=[];for(let i=47;i>=0;i--){const d=new Date(Date.now()-i*36e5+19800000);hours.push({hour:d.toISOString().slice(0,13).replace('T',' ')+':00',get:Math.round(200+180*Math.sin((d.getUTCHours()-6)/24*6.28)+Math.random()*60),post:Math.round(10+Math.random()*25)});}
    D._ops=D._ops||{forms:false,email:false,portal:false,traffic:120,lg:90,lz:400,msg:'',queue:[{id:'EQ-1',created_at:'2026-11-12T09:58',to:'riya@example.com',subject:'Your signed TEDxThaltej Charter',status:'Queued',tries:'0',last_error:'',reason:'Daily limit reached',attachments:1},{id:'EQ-2',created_at:'2026-11-12T10:02',to:'asha@example.com,rohan@example.com',subject:'Idea Search is open',status:'Held',tries:'0',last_error:'',reason:'Email paused',attachments:0},{id:'EQ-3',created_at:'2026-11-11T21:10',to:'old@example',subject:'Meeting moved',status:'Failed',tries:'5',last_error:'Invalid email: old@example',reason:'Daily limit reached',attachments:0}]};
    const O=D._ops;const __r={ok:true,switches:{forms:O.forms,email:O.email,portal:O.portal,traffic_limit:O.traffic,busy:false,message:O.msg},email:{provider:O.zp?'zepto':'zoho',zoho:true,zoho_error:'',sent_today:{zepto:O.zp?38:0,zoho:212,gmail:4},limit_gmail:O.lg,limit_zoho:O.lz,limit_zepto:5000,zepto:O.zp?{on:true,host:'cpaas.zoho.in',from:'noreply@tedxthaltejyouth.in',name:'TEDxThaltej Youth',alias:'64f4345ad9071341',key_set:true,key_hint:'••••a8Qe',error:''}:{on:false,host:'api.zeptomail.in'},room:O.lz-212,gmail_quota_left:96,queued:O.queue.filter(x=>x.status==='Queued').length,held:O.queue.filter(x=>x.status==='Held').length,failed:O.queue.filter(x=>x.status==='Failed').length},
      queue:O.queue,traffic:{minutes:mins,hours},errors:[{time:'2026-11-12T08:14:22',kind:'error',message:'Exception: Service invoked too many times for one day: email.',detail:'POST rec_team_sign'}],ai:true,backup:{at:'2026-11-12T03:00:41',url:'https://docs.google.com/spreadsheets/d/x'},triggers:{daily:true,hourly:true},
      sheet:{cells:2840000,cell_limit:1e7,tabs:[{name:'Audit',rows:1840},{name:'EmailQueue',rows:212},{name:'Registrations',rows:640},{name:'Applicants',rows:96},{name:'FinEntries',rows:58}]}};Object.assign(__r.email,(()=>{const U=O.use||{zepto:true,zoho:true,gmail:true},OR=O.order||['zepto','zoho','gmail'],rd=p=>p==='zepto'?!!O.zp:true,ch=OR.filter(p=>U[p]&&rd(p)),bc=ch.filter(p=>p!=='zepto');return {use:U,order:OR,bulk_via:O.bulk||'auto',chain:ch,bulk_chain:O.bulk&&O.bulk!=='auto'?[O.bulk].concat(bc.filter(p=>p!==O.bulk)):bc};})());return __r;}
  if(a==='zeptoSave'){D._ops.zp=!b.disconnect;return {ok:true};}
  if(a==='opsSet'){const O=D._ops;if(b.use)O.use=Object.assign({zepto:true,zoho:true,gmail:true},O.use,b.use);if(b.order)O.order=b.order;if(b.bulk_via!=null)O.bulk=b.bulk_via;['forms','email','portal'].forEach(k=>{if(b[k]!=null)O[k]=b[k];});if(b.message!=null)O.msg=b.message;if(b.traffic_limit!=null)O.traffic=+b.traffic_limit;if(b.limit_gmail!=null)O.lg=+b.limit_gmail;if(b.limit_zoho!=null)O.lz=+b.limit_zoho;return {ok:true};}
  if(a==='opsQueueGet'){const x=D._ops.queue.find(q=>q.id===b.id);return {ok:true,item:Object.assign({},x,{html:'<div style="font-family:Inter,sans-serif;padding:24px"><h2>Thank you, Riya.</h2><p>You have accepted the TEDxThaltej Charter. Your signed copy is attached.</p></div>'})};}
  if(a==='opsQueue'){const O=D._ops;if(b.op==='run'){const n=O.queue.filter(x=>x.status==='Queued').length;O.queue=O.queue.filter(x=>x.status!=='Queued');return {ok:true,sent:n,left:0};}
    const x=O.queue.find(q=>q.id===b.id);if(b.op==='delete'||b.op==='sendNow')O.queue=O.queue.filter(q=>q.id!==b.id);else if(b.op==='hold')x.status='Held';else if(b.op==='release')x.status='Queued';else if(b.op==='edit')Object.assign(x,{to:b.to,subject:b.subject});else if(b.op==='retryFailed')O.queue.forEach(q=>{if(q.status==='Failed')q.status='Queued';});return {ok:true};}
  if(a==='cleanupPreview') return {ok:true,items:[{key:'sentEmails',label:'Sent emails in the queue (older than 7 days)',safe:true,count:184},{key:'errors',label:'Error log entries older than 30 days',safe:true,count:6},{key:'devices',label:'Expired trusted devices',safe:true,count:3},{key:'links',label:'Onboarding links that ended over 30 days ago',safe:true,count:0},{key:'pendingSubs',label:'Subscribers who never confirmed (30+ days)',safe:true,count:12},{key:'unsubscribed',label:'People who unsubscribed (delete their email address)',safe:true,count:4},{key:'oldApplicants',label:'Team applicants from past cycles who were not selected or withdrew (with their interview marks)',safe:false,count:37},{key:'audit',label:'Audit log entries older than 2 years',safe:false,count:0},{key:'sentUpdates',label:'Copies of subscriber updates older than 1 year (counts are kept in the log)',safe:false,count:0}]};
  if(a==='cleanupRun') return {ok:true,total:209,deleted:{}};
  if(a==='opsBackup'||a==='opsErrorsClear') return {ok:true,id:'B1'};
  if(a==='recInviteExisting') return {ok:true,hours:+b.hours,results:b.people.map((p,i)=>/@/.test(p.email)&&p.name?{name:p.name,email:p.email,ok:true,link:'https://tedxthaltejyouth.in/join/#onboard='+'ab'.repeat(32)}:{name:p.name,email:p.email,ok:false,error:'invalid email'})};
  if(a==='devices') return {ok:true,rows:F.devices};
  if(a==='deviceRemove'){F.devices=F.devices.filter(d=>d.id!==b.id);return {ok:true};}
  if(a==='logoutAll') return {ok:true};
  return prev?prev(b,me,D):null;
};
})();
