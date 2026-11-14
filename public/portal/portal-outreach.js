/* Team Portal: Sponsor outreach (companies, first email, automatic follow-ups) and the TTRIS Inbox (shared mailbox, threads, replies). */
(function(){
const css=`
.so-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}.so-chips button{border:1.5px solid var(--n,#101B3D);background:#fff;border-radius:99px;padding:6px 12px;font-weight:700;font-size:12.5px;cursor:pointer}
.so-chips button.on{background:var(--n,#101B3D);color:#fff}.so-chips small{opacity:.6;margin-left:4px}
.so-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px}
.so-kpi{background:#fff;border:1.5px solid var(--n,#101B3D);border-radius:16px;padding:12px 14px;box-shadow:3px 3px 0 var(--y,#FFC83D)}
.so-kpi b{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:28px;display:block;line-height:1}.so-kpi small{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.so-msg{border:1px solid #E7DECF;border-radius:14px;padding:12px 14px;margin:8px 0;background:#fff}.so-msg.out{background:#F7F9FF;border-color:#D8E0F5;margin-left:28px}.so-msg.in{margin-right:28px}
.so-msg .h{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--mute);margin-bottom:6px;flex-wrap:wrap}.so-msg .h b{color:var(--n,#101B3D);font-size:13px}
.so-msg .t{white-space:pre-wrap;font-size:14px;line-height:1.55;max-height:340px;overflow:auto}
.so-pre{border:1.5px dashed #D9CDB6;border-radius:14px;padding:14px;background:#FFFCF6;white-space:pre-wrap;font-size:14px;line-height:1.55}
.ti-row{display:grid;grid-template-columns:200px 1fr auto;gap:12px;padding:12px 16px;border-bottom:1px solid #EEE6D8;cursor:pointer;align-items:start}.ti-row:hover{background:#FFFAF0}
.ti-row.new b,.ti-row.new .s{font-weight:800}.ti-row .s{font-size:14px}.ti-row .p{font-size:12.5px;color:var(--mute);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:560px}
.ti-row .w{font-size:12px;color:var(--mute);white-space:nowrap;text-align:right}
@media(max-width:700px){.ti-row{grid-template-columns:1fr}.ti-row .w{text-align:left}.so-msg.out{margin-left:10px}.so-msg.in{margin-right:10px}}
.b-Contacted{background:#e8f0fe;color:#1a56db}.b-Replied{background:#e6f6ec;color:var(--ok)}.b-Meeting,.b-Proposal.sent,.b-Negotiating{background:#f3efff;color:#6b4fd8}.b-Confirmed{background:#101B3D;color:#FFC83D}
.b-Declined,.b-Bounced{background:#fde8e7;color:var(--red,#E62B1E)}.b-No.response,.b-On.hold,.b-Prospect{background:#f1ede6;color:#6b6455}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const at=id=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('sponsors')>=0?at('sponsors'):SECTIONS.length,0,{id:'outreach',name:'Sponsor outreach',ico:'✉',grp:'Partnerships',show:()=>ME&&ME.can_outreach});
SECTIONS.splice(at('outreach')+1,0,{id:'ttris',name:'TTRIS Inbox',ico:'⌂',grp:'Partnerships',show:()=>ME&&ME.can_inbox});
const hero=(t,p)=>`<div class="gx-hero"><div style="flex:1;min-width:240px"><h2>${t}</h2>${p?`<p>${p}</p>`:''}</div></div>`;
const when=s=>{if(!s)return '';const d=new Date(s);if(isNaN(d))return esc(s);const t=Date.now()-d;return t<864e5&&t>0?d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}):d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});};
const run=async(fn,msg,after)=>{try{const r=await fn();if(msg)toast(typeof msg==='function'?msg(r):msg);closeM();(after||(()=>go(CUR)))();}catch(e){toast(e.message,1);}};
const msgHTML=m=>`<div class="so-msg ${m.dir}"><div class="h"><b>${esc(m.dir==='out'?'Us':m.from)}</b>${m.dir==='out'?`→ ${esc(m.to||'')}`:esc(m.from_email&&m.from_email!==m.from?m.from_email:'')}<span>· ${esc(when(m.at))}</span>${m.auto==='auto'?'<span class="badge">auto-reply</span>':m.auto==='bounce'?'<span class="badge" style="background:#fde8e7;color:var(--red)">bounced</span>':''}</div>
  <div style="font-size:12.5px;font-weight:700;margin-bottom:4px">${esc(m.subject||'')}</div><div class="t">${esc(String(m.body||'').replace(/\n*Ref: TTRIS-[A-Z0-9]{6}[^\n]*\n?/g,'\n').trim())}</div></div>`;

/* ═════════ Sponsor outreach ═════════ */
let SP=null,SPF='all',SPQ='';
VIEWS.outreach=async function(){
  const j=SP=await api('spBoot');
  if(j.canEdit){addBtn('+ Add company',()=>editCo({}));addBtn('Import list',importCo);}
  if(j.super)addBtn('Settings',spSettings);
  const c=j.counts,n=k=>c[k]||0;
  $('#view').innerHTML=hero('Sponsor outreach',`Add companies, send the first email, and let the system follow up up to <b>${j.conf.followups}</b> time${j.conf.followups===1?'':'s'} (every ${j.conf.gap} days, weekdays). Follow-ups stop the moment they reply. Every email is copied to <b>${esc(j.ttris.email)}</b>.`)+
    (j.ttris.connected?'':`<div class="panel" style="padding:12px 16px;margin-bottom:12px;border-color:var(--warn);background:#fff8ec;font-size:13.5px"><b>Replies aren’t being read yet.</b> Connect the TTRIS mailbox in TTRIS Inbox → Setup so replies stop follow-ups automatically. Until then, mark replies by hand.</div>`)+
    `<div class="so-kpis"><div class="so-kpi"><b>${j.rows.length}</b><small>Companies</small></div><div class="so-kpi"><b>${n('Contacted')}</b><small>Awaiting reply</small></div><div class="so-kpi"><b>${n('Replied')+n('Meeting')+n('Proposal sent')+n('Negotiating')}</b><small>In conversation</small></div><div class="so-kpi"><b>${n('Confirmed')}</b><small>Confirmed</small></div><div class="so-kpi"><b>${j.sentToday}<span style="font-size:16px;opacity:.5">/${j.conf.cap}</span></b><small>Emails today</small></div></div>`+
    `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><input id="soQ" placeholder="Search company, person, email…" value="${esc(SPQ)}" style="max-width:320px"></div>
    <div class="so-chips">${[['all','All',j.rows.length]].concat(j.statuses.filter(s=>n(s)).map(s=>[s,s,n(s)])).map(x=>`<button data-f="${esc(x[0])}" class="${SPF===x[0]?'on':''}">${esc(x[1])}<small>${x[2]}</small></button>`).join('')}</div><div id="soT"></div>`;
  const draw=()=>{const q=SPQ.toLowerCase(),rows=j.rows.filter(r=>(SPF==='all'||r.status===SPF)&&(!q||[r.company,r.contact_name,r.email,r.industry,r.owner].join(' ').toLowerCase().includes(q)));
    $('#soT').innerHTML=rows.length?`<div class="panel">${tableHTML(rows,[['company','Company',(v,_,r)=>`<b>${esc(v)}</b>${r.industry?`<div class="muted" style="font-size:12px">${esc(r.industry)}${r.tier?' · '+esc(r.tier):''}</div>`:''}`],['contact_name','Contact',(v,_,r)=>`${esc(v||'—')}<div class="muted" style="font-size:12px">${esc(r.email||'no email')}</div>`],
      ['status','Status',badge],['followups_sent','Follow-ups',(v,_,r)=>r.first_sent_at?`${v}/${j.conf.followups}${r.next_followup_at?`<div class="muted" style="font-size:12px">next ${esc(when(r.next_followup_at))}</div>`:''}`:'—'],['owner','Owner'],['last_contact_at','Last contact',v=>when(v)||'—']],null,true)}</div>`
      :'<div class="panel"><div class="empty" style="padding:34px;text-align:center">No companies here yet. Add one, or import a list.</div></div>';
    $('#soT').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>openCo(rows[tr.dataset.i].id));};
  draw();
  $('#soQ').oninput=e=>{SPQ=e.target.value;draw();};
  $('#view').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{SPF=b.dataset.f;VIEWS.outreach();});
};
const coFields=(r,j)=>`<div class="grid2">
  <label style="grid-column:1/-1">Company<input id="coCompany" value="${esc(r.company||'')}" maxlength="120"></label>
  <label>Contact person<input id="coName" value="${esc(r.contact_name||'')}"></label><label>Their role<input id="coRole" value="${esc(r.contact_role||'')}" placeholder="e.g. Marketing Head"></label>
  <label>Email<input id="coEmail" type="email" value="${esc(r.email||'')}"></label><label>Phone<input id="coPhone" value="${esc(r.phone||'')}"></label>
  <label>Industry<input id="coInd" value="${esc(r.industry||'')}"></label><label>City<input id="coCity" value="${esc(r.city||'Ahmedabad')}"></label>
  <label>Website<input id="coWeb" value="${esc(r.website||'')}"></label><label>LinkedIn<input id="coLi" value="${esc(r.linkedin||'')}"></label>
  <label>Target tier<select id="coTier"><option value="">—</option>${j.tiers.map(t=>`<option ${r.tier===t?'selected':''}>${t}</option>`).join('')}</select></label>
  <label>Owner<select id="coOwner">${j.team.map(p=>`<option value="${esc(p.email)}" ${(r.owner_email||ME.email)===p.email?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
  ${r.id?`<label>Status<select id="coStatus">${j.statuses.map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}</select></label><label>Next step date<input id="coND" type="date" value="${esc(r.next_date||'')}"></label>
  <label style="grid-column:1/-1">Next step<input id="coNS" value="${esc(r.next_step||'')}" placeholder="e.g. Send deck after call"></label>`:''}
  <label style="grid-column:1/-1">Notes (team only)<textarea id="coNotes" rows="3">${esc(r.notes||'')}</textarea></label></div>`;
const coRead=()=>({company:$('#coCompany').value,contact_name:$('#coName').value,contact_role:$('#coRole').value,email:$('#coEmail').value,phone:$('#coPhone').value,industry:$('#coInd').value,city:$('#coCity').value,
  website:$('#coWeb').value,linkedin:$('#coLi').value,tier:$('#coTier').value,owner_email:$('#coOwner').value,notes:$('#coNotes').value,
  status:$('#coStatus')?$('#coStatus').value:undefined,next_date:$('#coND')?$('#coND').value:undefined,next_step:$('#coNS')?$('#coNS').value:undefined});
function editCo(r){modal(r.id?'Edit '+r.company:'Add a company',coFields(r,SP),[['Save',()=>run(()=>api('spSave',Object.assign({id:r.id||''},coRead())),'Saved',()=>r.id?openCo(r.id):go('outreach'))]]);}
async function openCo(id){
  const r=SP.rows.find(x=>x.id===id),t=r.ref?await api('spThread',{id}):{messages:[]};
  const body=`<dl class="kv"><dt>Status</dt><dd>${badge(r.status)}${r.next_followup_at?` <span class="muted" style="font-size:12px">next follow-up ${esc(when(r.next_followup_at))}</span>`:''}</dd>
    <dt>Contact</dt><dd>${esc(r.contact_name||'—')}${r.contact_role?' · '+esc(r.contact_role):''}<br>${r.email?`<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`:'<i>no email</i>'}${r.phone?' · '+esc(r.phone):''}</dd>
    ${r.website||r.linkedin?`<dt>Links</dt><dd>${r.website?`<a href="${esc(r.website)}" target="_blank" rel="noopener">Website ↗</a> `:''}${r.linkedin?`<a href="${esc(r.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>`:''}</dd>`:''}
    <dt>Owner</dt><dd>${esc(r.owner)}</dd>${r.next_step?`<dt>Next step</dt><dd>${esc(r.next_step)}${r.next_date?' · '+fmt(r.next_date):''}</dd>`:''}${r.ref?`<dt>Reference</dt><dd class="mono">${esc(r.ref)}</dd>`:''}</dl>
    ${r.notes?`<div class="log" style="white-space:pre-wrap">${esc(r.notes)}</div>`:''}
    <b style="font-size:12px;display:block;margin-top:12px">Conversation</b>${t.messages.length?t.messages.map(msgHTML).join(''):'<div class="bd-empty">No emails yet.</div>'}
    ${r.ref&&SP.canEdit?`<textarea id="coR" rows="3" style="margin-top:8px" placeholder="Reply to ${esc(r.contact_name||r.company)} (blank line = new paragraph · **bold**)"></textarea>`:''}`;
  const acts=[];
  if(SP.canEdit){acts.push(['Edit',()=>editCo(r),'light left']);
    if(!r.first_sent_at)acts.push(['Write first email',()=>compose(r)]);
    else acts.push(['Send reply',()=>run(()=>api('spReply',{id,body:$('#coR').value}),'Reply sent',()=>openCo(id).catch(()=>go('outreach')))]);
    if(r.status==='Contacted')acts.unshift(['Mark replied',()=>run(()=>api('spSave',{id,company:r.company,status:'Replied'}),'Marked replied · follow-ups stopped'),'light']);}
  modal(r.company,body,acts);$('#mBox').classList.add('wide');
}
async function compose(r){
  const d=await api('spDraft',{id:r.id});
  modal('First email to '+r.company,`<p class="gx-note" style="margin:0 0 10px">To <b>${esc(d.to||'— add an email first')}</b>. A copy goes to TTRIS. Formatting: blank line = new paragraph · **bold** · [text](https://link) · lines starting with “- ” become a list.</p>
    <label>Subject<input id="ceS" value="${esc(d.subject)}" maxlength="180"></label><label>Message<textarea id="ceB" rows="14">${esc(d.body)}</textarea></label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px">${SP.aiOn?'<button class="btn sm light" id="ceAI">✦ Personalise with AI</button>':''}<button class="btn sm light" id="ceP">Preview</button>
    <label style="display:flex;gap:6px;align-items:center;margin:0;font-size:13px"><input type="checkbox" id="ceF" style="width:auto" ${d.followups?'checked':''} ${d.followups?'':'disabled'}> Automatic follow-ups (${d.followups} × every ${d.gap} days)</label>
    <label style="display:flex;gap:6px;align-items:center;margin:0;font-size:13px"><input type="checkbox" id="ceM" style="width:auto"> CC me</label></div><div id="cePv" style="margin-top:10px"></div>`,
    [['Back',()=>openCo(r.id),'light left'],['Send now',()=>{if(!d.to)return toast('Add the contact’s email first.',1);if(confirm('Send this email to '+d.to+'?'))run(()=>api('spSend',{id:r.id,subject:$('#ceS').value,body:$('#ceB').value,auto:$('#ceF').checked,cc_me:$('#ceM').checked}),x=>'Sent'+(x.next_followup_at?' · first follow-up '+when(x.next_followup_at):''));}]]);
  $('#mBox').classList.add('wide');
  if($('#ceAI'))$('#ceAI').onclick=async()=>{$('#ceAI').textContent='Writing…';try{const a=await api('spAiDraft',{id:r.id});$('#ceS').value=a.subject;$('#ceB').value=a.body;toast('Draft ready. Read it before sending.');}catch(e){toast(e.message,1);}$('#ceAI').textContent='✦ Personalise with AI';};
  $('#ceP').onclick=()=>{const md=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\[([^\]]+)\]\((https:[^)\s]+)\)/g,'<a href="$2">$1</a>');
    $('#cePv').innerHTML=`<div class="so-pre"><b>${esc($('#ceS').value)}</b><hr style="border:none;border-top:1px solid #eee;margin:8px 0">${$('#ceB').value.split(/\n{2,}/).map(p=>/^- /.test(p.trim())?'<ul>'+p.trim().split('\n').map(l=>'<li>'+md(l.replace(/^- /,''))+'</li>').join('')+'</ul>':'<p style="margin:0 0 10px">'+md(p).replace(/\n/g,'<br>')+'</p>').join('')}</div>`;};
}
function importCo(){
  modal('Import companies',`<p class="gx-note" style="margin:0 0 8px">Upload a CSV or Excel file, or paste rows. Columns we understand: <b>company</b>, contact name, role, email, phone, website, industry, city, tier, linkedin. The first row must be the headings.</p>
    <input type="file" id="imF" accept=".csv,.xlsx"><label>…or paste<textarea id="imT" rows="6" placeholder="company,contact name,email&#10;Acme Foods,Ravi Kumar,ravi@acme.in"></textarea></label><div id="imP" class="gx-note"></div>`,
    [['Import',async()=>{try{const rows=await imRows();if(!rows.length)return toast('Nothing to import.',1);const r=await api('spImport',{rows});closeM();toast(`Added ${r.added}${r.skipped.length?' · skipped '+r.skipped.length:''}`);if(r.skipped.length)console.log(r.skipped);go('outreach');}catch(e){toast(e.message,1);}}]]);
  const show=async()=>{try{const r=await imRows();$('#imP').textContent=r.length?`${r.length} compan${r.length===1?'y':'ies'} found · first: ${r[0].company||'(no company column)'}`:'';}catch(e){$('#imP').textContent=e.message;}};
  $('#imF').onchange=show;$('#imT').oninput=show;
}
async function imRows(){
  const X=window.__txImport;let grid=[];
  const f=$('#imF').files[0];
  if(f){grid=/\.xlsx$/i.test(f.name)?await X.parseXLSX(await f.arrayBuffer()):X.parseCSV(await f.text());}
  else if($('#imT').value.trim())grid=X.parseCSV($('#imT').value.trim());
  if(grid.length<2)return [];
  const H=grid[0].map(h=>String(h).toLowerCase().trim()),pick=(...k)=>H.findIndex(h=>k.some(x=>h===x||h.includes(x)));
  const m={company:pick('company','organisation','organization','brand'),contact_name:pick('contact name','contact person','name'),contact_role:pick('role','designation','title'),email:pick('email','e-mail'),
    phone:pick('phone','mobile','contact no'),website:pick('website','url','site'),industry:pick('industry','sector'),city:pick('city','location'),tier:pick('tier'),linkedin:pick('linkedin')};
  if(m.contact_name===m.company)m.contact_name=-1;
  return grid.slice(1).filter(r=>r.some(x=>String(x).trim())).map(r=>{const o={};Object.keys(m).forEach(k=>{if(m[k]>=0)o[k]=String(r[m[k]]??'').trim();});return o;});
}
function spSettings(){
  const c=SP.conf;
  modal('Outreach settings & templates',`<div class="grid2"><label>Automatic follow-ups (0–3)<select id="ssF">${[0,1,2,3].map(n=>`<option ${c.followups===n?'selected':''}>${n}</option>`).join('')}</select></label>
    <label>Days between emails<input id="ssG" type="number" min="1" max="30" value="${c.gap}"></label><label>Daily limit (all outreach emails)<input id="ssC" type="number" min="1" max="200" value="${c.cap}"></label>
    <label>Sender address<div style="display:flex;align-items:center;gap:4px"><input id="ssL" value="${esc(c.from_local)}" style="max-width:150px">@your domain</div></label></div>
    <p class="gx-note">Placeholders: {first} {name} {company} {role} {sender} {team}. Formatting: blank line = new paragraph · **bold** · [text](https://link) · “- ” list.</p>
    <label>Subject<input id="ssS" value="${esc(c.subject)}"></label><label>First email<textarea id="ss0" rows="9">${esc(c.first)}</textarea></label>
    <label>Follow-up 1<textarea id="ss1" rows="4">${esc(c.f1)}</textarea></label><label>Follow-up 2<textarea id="ss2" rows="4">${esc(c.f2)}</textarea></label><label>Follow-up 3 (last)<textarea id="ss3" rows="4">${esc(c.f3)}</textarea></label>
    <button class="btn sm light" id="ssRun">Send due follow-ups now</button>`,
    [['Save',()=>run(()=>api('spSettings',{followups:$('#ssF').value,gap:$('#ssG').value,cap:$('#ssC').value,from_local:$('#ssL').value,subject:$('#ssS').value,first:$('#ss0').value,f1:$('#ss1').value,f2:$('#ss2').value,f3:$('#ss3').value}),'Saved')]]);
  $('#mBox').classList.add('wide');
  $('#ssRun').onclick=()=>run(()=>api('spRunNow'),r=>`Sent ${r.sent||0} follow-up${r.sent===1?'':'s'}`);
}

/* ═════════ TTRIS Inbox ═════════ */
let TI=null,TIF='all';
VIEWS.ttris=async function(){
  const j=TI=await api('ttrisBoot'),c=j.conf;
  addBtn('↻ Check mail now',async()=>{try{const r=await api('ttrisPollNow');toast(r.ok===false?'Mailbox not connected yet':`${r.fetched||0} new`);go('ttris');}catch(e){toast(e.message,1);}});
  const tabs=[['all','Inbox'],['unsorted','Unsorted'],['sponsor','Sponsors'],['submission','Website replies'],['official','Official email'],['web','Website messages']].concat(j.super?[['setup','Setup']]:[]);
  const cnt=k=>k==='all'?j.inbox.filter(m=>m.status==='New').length:k==='web'?j.web.filter(w=>w.status==='New').length:j.inbox.filter(m=>m.kind===k&&m.status==='New').length;
  $('#view').innerHTML=hero('TTRIS Inbox',`The shared mailbox <b>${esc(c.email)}</b>. Replies to outreach, website messages and official emails are filed here automatically by the reference at the end of each email. ${c.connected?`Last checked ${esc(when(c.lastPoll)||'—')}.`:'<b>Not connected yet.</b>'}`)+
    (c.lastError?`<div class="panel" style="padding:10px 14px;margin-bottom:10px;border-color:var(--red);font-size:13px">Last error: ${esc(c.lastError)}</div>`:'')+
    `<div class="so-chips">${tabs.map(t=>`<button data-t="${t[0]}" class="${TIF===t[0]?'on':''}">${t[1]}${t[0]!=='setup'&&cnt(t[0])?`<small>${cnt(t[0])}</small>`:''}</button>`).join('')}</div><div id="tiB"></div>`;
  $('#view').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{TIF=b.dataset.t;VIEWS.ttris();});
  if(TIF==='setup')return tiSetup(j);
  if(TIF==='web'){$('#tiB').innerHTML=`<div class="panel">${j.web.length?j.web.map((w,i)=>`<div class="ti-row ${w.status==='New'?'new':''}" data-w="${i}"><div><b>${esc(w.name)}</b><div class="p">${esc(w.email)}</div></div><div><div class="s">${esc(w.subject||w.type)} <span class="badge">${esc(w.type)}</span></div><div class="p">${esc(w.snippet)}</div></div><div class="w">${esc(when(w.at))}<br>${badge(w.status)}</div></div>`).join(''):'<div class="empty" style="padding:30px;text-align:center">No website messages.</div>'}</div>`;
    $('#tiB').querySelectorAll('[data-w]').forEach(el=>el.onclick=()=>openThread({submission:j.web[el.dataset.w].id}));return;}
  const rows=j.inbox.filter(m=>TIF==='all'||m.kind===TIF);
  $('#tiB').innerHTML=`<div class="panel">${rows.length?rows.map((m,i)=>`<div class="ti-row ${m.status==='New'?'new':''}" data-i="${i}"><div><b>${esc(m.from)}</b><div class="p">${esc(m.from_email)}</div></div>
    <div><div class="s">${esc(m.subject)}${m.auto==='auto'?' <span class="badge">auto-reply</span>':m.auto==='bounce'?' <span class="badge" style="background:#fde8e7;color:var(--red)">bounce</span>':''}</div><div class="p">${m.thread?`<b style="color:var(--n)">${esc(m.thread)}</b> · `:'<b style="color:var(--warn)">Unsorted</b> · '}${esc(m.snippet)}</div></div>
    <div class="w">${esc(when(m.at))}<br>${m.status==='Done'?'✓ done':m.status==='New'?'<b style="color:var(--red)">● new</b>':''}</div></div>`).join(''):`<div class="empty" style="padding:34px;text-align:center">${c.connected?'Nothing here.':'Connect the mailbox in Setup to start reading mail.'}</div>`}</div>`;
  $('#tiB').querySelectorAll('[data-i]').forEach(el=>el.onclick=()=>openThread({msg:rows[el.dataset.i].id}));
};
async function openThread(q){
  const t=await api('ttrisThread',q),h=t.head||{};
  let sp=[];if(q.msg&&!t.ref&&ME.can_outreach){try{sp=(SP||await api('spBoot')).rows;}catch(e){}}
  modal(h.subject||'Conversation',`${t.ref?`<p class="gx-note" style="margin:0 0 6px">Thread <span class="mono">${esc(t.ref)}</span></p>`:''}${t.messages.map(msgHTML).join('')}
    <textarea id="tiR" rows="4" style="margin-top:8px" placeholder="Reply to ${esc(h.from||'')} (blank line = new paragraph · **bold**)"></textarea>
    ${sp.length?`<div style="display:flex;gap:6px;align-items:center;margin-top:8px"><select id="tiSp" style="flex:1"><option value="">File under a sponsor company…</option>${sp.map(s=>`<option value="${esc(s.id)}">${esc(s.company)}</option>`).join('')}</select><button class="btn sm light" id="tiSpB">File</button></div>`:''}`,
    [].concat(q.msg?[['Mark done',()=>run(()=>api('ttrisMark',{id:q.msg,status:'Done'}),'Marked done'),'light left']]:[])
      .concat([['Send reply',()=>run(()=>api('ttrisReply',Object.assign({body:$('#tiR').value,ref:t.ref},q)),'Reply sent')]]));
  $('#mBox').classList.add('wide');
  if($('#tiSpB'))$('#tiSpB').onclick=()=>{if(!$('#tiSp').value)return;run(()=>api('ttrisMark',{id:q.msg,sponsor:$('#tiSp').value}),'Filed under the company · follow-ups stopped');};
}
function tiSetup(j){
  const c=j.conf;
  $('#tiB').innerHTML=`<div class="panel" style="padding:18px;max-width:760px"><h3 style="margin-bottom:8px">Mailbox & copies</h3>
    <div class="grid2"><label>TTRIS address<input id="tsE" value="${esc(c.email)}"></label><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" id="tsC" style="width:auto" ${c.cc?'checked':''}> CC every outgoing email to this address</label></div>
    <p class="gx-note">Never copied: sign-in codes, passwords and other private emails, and bulk team emails. Outreach, website replies and official emails always copy TTRIS and ask for replies there.</p><button class="btn sm red" id="tsS">Save</button></div>
  <div class="panel" style="padding:18px;max-width:760px;margin-top:12px"><h3 style="margin-bottom:6px">Read the mailbox ${c.connected?'<span class="badge" style="background:#e6f6ec;color:var(--ok)">connected</span>':'<span class="badge">not connected</span>'}</h3>
    <ol style="font-size:13.5px;line-height:1.6;padding-left:18px;margin:6px 0 12px"><li>Create the user <b>${esc(c.email)}</b> in Zoho Mail admin.</li><li>Sign in to the Zoho API console <b>as ${esc(c.email)}</b> → Add client → <b>Self Client</b>. Copy the Client ID and Secret.</li>
      <li>Self Client → Generate Code. Scope: <span class="mono" style="font-size:12px">${esc(c.scope)}</span>, duration 10 minutes. Copy the code.</li><li>Paste all three below and connect, quickly, before the code expires. Mail is then checked every 10 minutes.</li></ol>
    <div class="grid2"><label>Data centre<select id="tsD">${c.dcs.map(d=>`<option value="${d.id}">${esc(d.label)}</option>`).join('')}</select></label><label>Client ID<input id="tsI" placeholder="1000.XXXX"></label>
    <label>Client Secret<input id="tsX" type="password"></label><label>Code<input id="tsK" placeholder="1000.xxxx.xxxx"></label></div>
    <div style="display:flex;gap:8px;margin-top:8px"><button class="btn sm red" id="tsG">Connect</button>${c.connected?'<button class="btn sm light" id="tsU">Disconnect</button>':''}</div></div>`;
  $('#tsS').onclick=()=>run(()=>api('ttrisSettings',{email:$('#tsE').value,cc:$('#tsC').checked}),'Saved');
  $('#tsG').onclick=()=>run(()=>api('ttrisConnect',{dc:$('#tsD').value,clientId:$('#tsI').value,clientSecret:$('#tsX').value,code:$('#tsK').value}),'Mailbox connected');
  if($('#tsU'))$('#tsU').onclick=()=>{if(confirm('Stop reading the TTRIS mailbox?'))run(()=>api('ttrisDisconnect'),'Disconnected');};
}

/* ─── preview data ─── */
const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  const a=b.action;
  if(!/^(sp[A-Z]|ttris)/.test(a))return prev?prev(b,me,D):undefined;
  if(!D._so){D._so=1;D.so=[
    {id:'SP-2026-0004',company:'Arvind Fashions',industry:'Apparel',tier:'Gold',contact_name:'Riya Shah',contact_role:'Brand Manager',email:'riya@arvind.example',owner:'Sia Mehta',owner_email:'demo@tedxthaltejyouth.in',status:'Replied',followups_sent:1,first_sent_at:'2026-11-03',last_contact_at:'2026-11-12T11:20',ref:'TTRIS-7KQ2MD',website:'https://example.com'},
    {id:'SP-2026-0003',company:'Zydus Foundation',industry:'Healthcare CSR',tier:'Title',contact_name:'Dr. Mehul Patel',contact_role:'CSR Lead',email:'csr@zydus.example',owner:'Sia Mehta',status:'Contacted',followups_sent:2,next_followup_at:'2026-11-17T05:00:00Z',first_sent_at:'2026-11-05',last_contact_at:'2026-11-13',ref:'TTRIS-P3XV9A'},
    {id:'SP-2026-0002',company:'Havmor Ice Cream',industry:'Food & beverage',tier:'In-kind',contact_name:'Karan Joshi',email:'karan@havmor.example',owner:'Fenil Pritesh Shah',status:'Meeting',followups_sent:0,first_sent_at:'2026-11-01',last_contact_at:'2026-11-10',next_step:'Tasting call',next_date:'2026-11-19',ref:'TTRIS-2LMNB4'},
    {id:'SP-2026-0001',company:'Cadila Pharma',industry:'Pharma',contact_name:'',email:'',owner:'Sia Mehta',status:'Prospect',followups_sent:0}];}
  const counts={};D.so.forEach(r=>counts[r.status]=(counts[r.status]||0)+1);
  if(a==='spBoot')return {ok:true,rows:D.so,statuses:['Prospect','Contacted','Replied','Meeting','Proposal sent','Negotiating','Confirmed','Declined','No response','Bounced','On hold'],tiers:['Title','Platinum','Gold','Silver','Partner','In-kind','Media'],
    team:[{email:'demo@tedxthaltejyouth.in',name:'Fenil Pritesh Shah'},{email:'sia@x',name:'Sia Mehta'}],counts,canEdit:true,super:true,sentToday:6,ttris:{email:'ttris@tedxthaltejyouth.in',connected:true},aiOn:true,
    conf:{followups:3,gap:4,cap:40,from_local:'partnerships',subject:'Partnering with TEDxThaltej Youth 2027 · {company}',first:'Dear {first},\n\nI am {sender} from the {team} team at **TEDxThaltej Youth**…',f1:'Dear {first},\n\nI am following up…',f2:'Dear {first},\n\nJust bringing this back…',f3:'Dear {first},\n\nThis is my last note…'}};
  if(a==='spThread')return {ok:true,messages:[{dir:'out',from:'Sia Mehta',to:'riya@arvind.example',subject:'Partnering with TEDxThaltej Youth 2027 · Arvind Fashions',body:'Dear Riya,\n\nI am Sia from the Sponsorship team at TEDxThaltej Youth…',at:'2026-11-03T10:30'},
    {dir:'out',from:'system',to:'riya@arvind.example',subject:'Re: Partnering with TEDxThaltej Youth 2027 · Arvind Fashions',body:'Dear Riya,\n\nI am following up on my note…',at:'2026-11-07T10:30'},
    {dir:'in',from:'Riya Shah',from_email:'riya@arvind.example',subject:'Re: Partnering with TEDxThaltej Youth 2027 · Arvind Fashions',body:'Hi Sia,\n\nThanks for reaching out. Could you send the deck? We could talk next Tuesday.\n\nRiya',at:'2026-11-12T11:20'}]};
  if(a==='spDraft')return {ok:true,to:'csr@zydus.example',subject:'Partnering with TEDxThaltej Youth 2027 · Cadila Pharma',body:'Dear Sir/Madam,\n\nI am Fenil from the Sponsorship team at **TEDxThaltej Youth**…',followups:3,gap:4};
  if(a==='ttrisBoot')return {ok:true,super:true,conf:{email:'ttris@tedxthaltejyouth.in',cc:true,connected:true,lastPoll:new Date(Date.now()-4*60000).toISOString(),lastError:'',scope:'ZohoMail.messages.READ,ZohoMail.folders.READ,ZohoMail.accounts.READ',dcs:[{id:'in',label:'India (zoho.in)'}]},
    inbox:[{id:'TM1',from:'Riya Shah',from_email:'riya@arvind.example',subject:'Re: Partnering with TEDxThaltej Youth 2027 · Arvind Fashions',snippet:'Thanks for reaching out. Could you send the deck? We could talk next Tuesday.',at:new Date(Date.now()-2*3600000).toISOString(),status:'New',kind:'sponsor',thread:'Sponsor · Arvind Fashions'},
      {id:'TM2',from:'Ahmedabad Mirror',from_email:'desk@mirror.example',subject:'Interview request for your organiser',snippet:'We are doing a feature on youth-led events in the city and would love to speak…',at:new Date(Date.now()-26*3600000).toISOString(),status:'New',kind:'unsorted',thread:''},
      {id:'TM3',from:'Asha Desai',from_email:'asha@gmail.example',subject:'Re: Volunteering',snippet:'Thank you! I have filled the form.',at:'2026-11-11T09:00',status:'Read',kind:'submission',thread:'Website · Asha Desai · Volunteering'},
      {id:'TM4',from:'Mehul Patel',from_email:'csr@zydus.example',subject:'Automatic reply: Partnering with TEDxThaltej Youth 2027',snippet:'I am out of office until 18 November.',at:'2026-11-10T10:31',status:'Read',auto:'auto',kind:'sponsor',thread:'Sponsor · Zydus Foundation'}],
    web:[{id:'SUB-12',type:'Partner',name:'Nirav Shah',email:'nirav@example.com',subject:'In-kind support',status:'New',at:'2026-11-13',snippet:'We run a printing press and would like to support your event…'}]};
  if(a==='ttrisThread')return {ok:true,ref:'TTRIS-7KQ2MD',head:{from:'Riya Shah',subject:'Re: Partnering with TEDxThaltej Youth 2027'},messages:[{dir:'in',from:'Riya Shah',from_email:'riya@arvind.example',subject:'Re: Partnering',body:'Thanks for reaching out. Could you send the deck?',at:'2026-11-12T11:20'}]};
  if(a==='ttrisPollNow')return {ok:true,fetched:0};
  return {ok:true};
};
})();
