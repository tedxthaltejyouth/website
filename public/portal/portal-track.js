/* Team Portal: Email log (every email the system sends, with open tracking) for the Organizer,
   and "Email records" requests for the Quality Assurance Committee. */
(function(){
const at=id=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('audit')>=0?at('audit'):SECTIONS.length,0,{id:'maillog',name:'Email log',ico:'✉',grp:'System',show:()=>ME&&ME.role==='super'});
const fdt=s=>s?new Date(s).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'';
const KIND={system:'System',bulk:'Bulk',thread:'TTRIS thread',official:'Official',sponsor:'Outreach',submission:'Website reply',community:'Community',inbox:'TTRIS reply',private:'Private'};
const opened=r=>r.opened_at?`<b style="color:var(--ok)">✓ ${esc(fdt(r.opened_at))}</b><div class="muted" style="font-size:12px">${r.opens} open${r.opens===1?'':'s'}${r.agent?' · '+esc(r.agent):''}</div>`:(r.status==='Sent'?'<span class="muted">Not yet</span>':'—');
const csv=(rows,name)=>{const head=['To','Cc','Subject','Type','Status','Sent','Opened','Last opened','Opens','Email app','Body'];
  const data=[head].concat(rows.map(r=>[r.to,r.cc,r.subject,KIND[r.kind]||r.kind,r.status,r.sent_at,r.opened_at,r.last_open_at,r.opens,r.agent,r.body||'']));
  const t=data.map(x=>x.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+t],{type:'text/csv'}));a.download=name;a.click();};
const note=`<p class="gx-note" style="margin-top:10px">Opens are counted when the reader’s email app loads images. Apple Mail can load them in advance (an “open” that may not be a real read), and some apps block images (a real read that isn’t counted). For an email sent to several people, opens are counted together. Private emails (sign-in codes, passwords) are logged without their content.</p>`;

let F={email:'',q:'',from:'',to:''};
VIEWS.maillog=async function(){
  const j=await api('mlogList',F);
  addBtn('Download CSV',()=>csv(j.rows,'email-log.csv'));
  $('#view').innerHTML=`<div class="gx-hero"><div style="flex:1;min-width:240px"><h2>Email log</h2><p>Every email the system sends: who it went to, what it said, when it was sent and when it was opened.</p></div></div>
    <div class="so-kpis"><div class="so-kpi"><b>${j.stats.sent}</b><small>Sent</small></div><div class="so-kpi"><b>${j.stats.rate}%</b><small>Opened</small></div><div class="so-kpi"><b>${j.stats.queued}</b><small>Waiting in queue</small></div><div class="so-kpi"><b>${j.stats.failed}</b><small>Failed</small></div></div>
    <div class="panel" style="padding:12px 14px;margin-bottom:12px"><div class="grid2" style="grid-template-columns:2fr 2fr 1fr 1fr auto;align-items:end"><label style="margin:0">Recipient email<input id="mlE" value="${esc(F.email)}" placeholder="name@example.com"></label>
      <label style="margin:0">Search subject<input id="mlQ" value="${esc(F.q)}"></label><label style="margin:0">From<input id="mlF" type="date" value="${esc(F.from)}"></label><label style="margin:0">To<input id="mlT" type="date" value="${esc(F.to)}"></label><button class="btn sm" id="mlGo">Search</button></div></div>
    <div class="panel">${j.rows.length?tableHTML(j.rows,[['to','To',(v,_,r)=>`<b>${esc(String(v).split(',').slice(0,2).join(', '))}</b>${String(v).split(',').length>2?' +'+(String(v).split(',').length-2):''}`],['subject','Subject',v=>esc(v)],['kind','Type',v=>`<span class="badge">${esc(KIND[v]||v)}</span>`],
      ['sent_at','Sent',(v,_,r)=>r.status==='Sent'?esc(fdt(v)):badge(r.status)],['opened_at','Opened',(v,_,r)=>opened(r)]],null,true):'<div class="empty" style="padding:30px;text-align:center">No emails match.</div>'}
      ${j.total>j.rows.length?`<p class="gx-note" style="padding:10px 14px">Showing the latest ${j.rows.length} of ${j.total}. Narrow the search to see older ones.</p>`:''}</div>${note}`;
  $('#mlGo').onclick=()=>{F={email:$('#mlE').value.trim(),q:$('#mlQ').value.trim(),from:$('#mlF').value,to:$('#mlT').value};VIEWS.maillog();};
  $('#view').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=async()=>{const m=(await api('mlogGet',{id:j.rows[tr.dataset.i].id})).mail;
    modal(m.subject,`<dl class="kv"><dt>To</dt><dd>${esc(String(m.to).split(',').join(', '))}</dd>${m.cc?`<dt>Cc</dt><dd>${esc(String(m.cc).split(',').join(', '))}</dd>`:''}${m.bcc?`<dt>Bcc</dt><dd>${esc(String(m.bcc).split(',').join(', '))}</dd>`:''}${m.from?`<dt>From</dt><dd>${esc(m.from)}</dd>`:''}
      <dt>Type</dt><dd>${esc(KIND[m.kind]||m.kind)}${m.ref?` · <span class="mono">${esc(m.ref)}</span>`:''}</dd><dt>Status</dt><dd>${badge(m.status)}${m.provider?' via '+esc(m.provider):''}</dd><dt>Sent</dt><dd>${esc(fdt(m.sent_at))}</dd>
      <dt>Opened</dt><dd>${m.opened_at?`${esc(fdt(m.opened_at))} · ${m.opens} open${m.opens===1?'':'s'} · last ${esc(fdt(m.last_open_at))}${m.agent?' · '+esc(m.agent):''}`:'Not yet'}</dd>${m.error?`<dt>Error</dt><dd style="color:var(--bad)">${esc(m.error)}</dd>`:''}</dl>
      <div class="log" style="white-space:pre-wrap;max-height:50vh;overflow:auto">${esc(m.body)}</div>`,[]);$('#mBox').classList.add('wide');});
};

/* ─── QAC: Email records tab ─── */
const prevQ=VIEWS.qac;
VIEWS.qac=async function(){
  await prevQ();
  const tabs=document.querySelector('#view .qc-tabs');if(!tabs||!window.__qacMember)return;
  const b=document.createElement('button');b.textContent='Email records';b.dataset.mr='1';tabs.appendChild(b);
  b.onclick=()=>{tabs.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');records();};
  if(window.__qacTabRecords){b.click();}
  tabs.querySelectorAll('button:not([data-mr])').forEach(x=>x.addEventListener('click',()=>{window.__qacTabRecords=false;}));
};
async function records(){
  window.__qacTabRecords=true;
  let hist=[];try{hist=(await api('qacMailRequests')).rows;}catch(e){}
  $('#qcBody').innerHTML=`<div class="panel" style="padding:16px;margin-bottom:12px"><b>Request email records</b><p class="gx-note" style="margin:4px 0 10px">Get every email the system sent to an address, with the subject, the text, when it was sent and when it was opened. The request is fulfilled at once, recorded, and the Organizer is informed.</p>
    <div class="grid2" style="grid-template-columns:2fr 1fr 1fr"><label>Email address<input id="qrE" placeholder="name@example.com"></label><label>From (optional)<input id="qrF" type="date"></label><label>To (optional)<input id="qrT" type="date"></label>
    <label style="grid-column:1/-1">Why the Committee needs this<input id="qrP" maxlength="300" placeholder="e.g. Checking that the speaker received the rehearsal schedule"></label></div><button class="btn sm red" id="qrGo">Get records</button></div><div id="qrRes"></div>
    <div class="panel" style="padding:14px 16px;margin-top:12px"><b>Past requests</b>${hist.length?tableHTML(hist,[['at','When',v=>esc(fdt(v))],['by','By'],['email','Address'],['count','Emails'],['purpose','Purpose']]):'<p class="gx-note">None yet.</p>'}</div>`;
  $('#qrGo').onclick=async()=>{try{const r=await api('qacMailRequest',{email:$('#qrE').value,from:$('#qrF').value,to:$('#qrT').value,purpose:$('#qrP').value});
    $('#qrRes').innerHTML=`<div class="panel"><div style="display:flex;gap:8px;align-items:center;padding:12px 14px"><b style="flex:1">${r.rows.length} email${r.rows.length===1?'':'s'} to ${esc(r.email)}</b><button class="btn sm light" id="qrCsv">Download CSV</button></div>
      ${r.rows.length?tableHTML(r.rows,[['subject','Subject',v=>`<b>${esc(v)}</b>`],['kind','Type',v=>esc(KIND[v]||v)],['sent_at','Sent',(v,_,x)=>x.status==='Sent'?esc(fdt(v)):badge(x.status)],['opened_at','Opened',(v,_,x)=>opened(x)]],null,true):'<div class="empty" style="padding:20px;text-align:center">No emails to this address.</div>'}</div>${note}`;
    $('#qrCsv').onclick=()=>csv(r.rows,'email-records-'+r.email+'.csv');
    $('#qrRes').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>{const m=r.rows[tr.dataset.i];modal(m.subject,`<dl class="kv"><dt>To</dt><dd>${esc(m.to)}</dd><dt>Sent</dt><dd>${esc(fdt(m.sent_at))}</dd><dt>Opened</dt><dd>${m.opened_at?esc(fdt(m.opened_at))+' · '+m.opens+' opens':'Not yet'}</dd></dl><div class="log" style="white-space:pre-wrap;max-height:50vh;overflow:auto">${esc(m.body)}</div>`,[]);});
    toast('Records ready');}catch(e){toast(e.message,1);}};
}

/* preview data */
const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  const rows=[{id:'ML1',to:'riya@arvind.example',subject:'Partnering with TEDxThaltej Youth 2027 · Arvind Fashions',kind:'sponsor',status:'Sent',sent_at:'2026-11-14T10:30',opened_at:'2026-11-14T11:02',last_open_at:'2026-11-15T09:10',opens:3,agent:'Gmail',body:'Dear Riya,\n\nI am Sia from the Sponsorship team…'},
    {id:'ML2',to:'aryan@example.com',subject:'Questions from the Quality Assurance Committee (QAC-0004)',kind:'system',status:'Sent',sent_at:'2026-11-14T09:00',opened_at:'',opens:0,body:'Dear Aryan, …'},
    {id:'ML3',to:'fenil@example.com',subject:'482913 is your sign-in code',kind:'private',status:'Sent',sent_at:'2026-11-14T08:12',opened_at:'2026-11-14T08:12',opens:1,agent:'Apple Mail',body:'[Private email: content not stored]'},
    {id:'ML4',to:'team-all (42)',subject:'Rehearsal schedule is out',kind:'bulk',status:'Queued',sent_at:'2026-11-14T07:00',opens:0,body:'Hi {name}, …'}];
  if(b.action==='mlogList')return {ok:true,rows,total:4,stats:{sent:3,opened:2,rate:67,failed:0,queued:1}};
  if(b.action==='mlogGet')return {ok:true,mail:Object.assign({},rows.find(r=>r.id===b.id))};
  if(b.action==='qacMailRequest')return {ok:true,email:b.email||'aryan@example.com',rows:rows.slice(0,2)};
  if(b.action==='qacMailRequests')return {ok:true,rows:[{at:'2026-11-14T12:00',by:'Dr. Neha Trivedi',email:'aryan@example.com',count:'6',purpose:'Check delayed-task follow-ups were received'}]};
  return prev?prev(b,me,D):undefined;
};
})();
