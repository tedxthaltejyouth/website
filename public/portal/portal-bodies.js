/* Team Portal: Governance bodies (who is who, for everyone), the IDC workspace and the Senior Advisors workspace.
   Loaded after portal-fin.js. */
(function(){
const css=`
.bd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-bottom:16px}
.bd-card{background:#fff;border:1.5px solid var(--n,#101B3D);border-radius:18px;padding:16px 18px;box-shadow:4px 4px 0 var(--n,#101B3D)}
.bd-card.red{box-shadow:4px 4px 0 var(--red,#E62B1E)}.bd-card.y{box-shadow:4px 4px 0 var(--y,#FFC83D)}
.bd-card h3{font-family:Anton,Impact,sans-serif;font-weight:400;text-transform:uppercase;font-size:22px;letter-spacing:.01em;line-height:1.1}
.bd-card .art{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);margin:2px 0 8px}
.bd-card p.d{font-size:13px;color:#444;margin-bottom:10px}
.bd-p{display:flex;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line)}
.bd-av{width:34px;height:34px;border-radius:50%;background:var(--n,#101B3D);color:#fff;display:grid;place-items:center;font-weight:800;font-size:13px;flex:none}
.bd-av.c{background:var(--red,#E62B1E)}.bd-av.y{background:var(--y,#FFC83D);color:#101B3D}
.bd-p b{display:block;font-size:14px}.bd-p small{color:var(--mute);font-size:12px}
.bd-p a{margin-left:auto;font-size:12px;font-weight:700}
.bd-empty{font-size:13px;color:var(--mute);font-style:italic;padding:6px 0}
.bd-msg{border-radius:14px;padding:10px 12px;margin:8px 0;background:#f4f2ee;font-size:14px;white-space:pre-wrap}
.bd-msg.me{background:#e8f0fe}.bd-msg.sys{background:none;border:1px dashed var(--line);font-size:12px;color:var(--mute)}
.bd-msg small{display:block;font-size:11px;font-weight:700;color:var(--mute);margin-bottom:3px;white-space:normal}
.bd-ch{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:#101B3D;color:#fff;margin-left:6px}
.bd-ch.concerned{background:var(--red,#E62B1E)}.bd-ch.reporter{background:var(--y,#FFC83D);color:#101B3D}
.b-Received{background:#e8f0fe;color:#1a56db}.b-Under.inquiry{background:#fff4e0;color:var(--warn)}.b-Hearing.scheduled{background:#fff4e0;color:var(--warn)}
.b-Findings.submitted{background:#101B3D;color:#fff}.b-Decided{background:#e6f6ec;color:var(--ok)}.b-Dismissed{background:#f1f1f1;color:#666}.b-Closed{background:#f1f1f1;color:#666}.b-Open{background:#e6f6ec;color:var(--ok)}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

const B=()=>String((ME&&ME.bodies)||'');
const isIdc=()=>ME&&(ME.role==='super'||/idc_/.test(B()));
const isAdv=()=>ME&&(ME.role==='super'||/senior_advisor/.test(B()));
const at=id=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('charter')+1,0,{id:'bodies',name:'Governance bodies',ico:'❖',grp:'Charter',always:true});
SECTIONS.splice(at('registrar'),0,
  {id:'idc',name:'IDC case files',ico:'⚑',grp:'Charter offices',show:isIdc},
  {id:'advisory',name:'Senior Advisors',ico:'✦',grp:'Charter offices',show:isAdv});
const h=location.hash.slice(1);if(h&&SECTIONS.some(s=>s.id===h))CUR=h;

const hero=(t,p,r)=>`<div class="gx-hero"><div style="flex:1;min-width:240px"><h2>${t}</h2>${p?`<p>${p}</p>`:''}</div>${r||''}</div>`;
const ini=n=>String(n||'?').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
const person=(p,cls,role)=>`<div class="bd-p"><span class="bd-av ${cls||''}">${esc(ini(p.name))}</span><div><b>${esc(p.name)}</b><small>${esc(role||p.team||'')}</small></div><a href="mailto:${esc(p.email)}">Email</a></div>`;
const list=(arr,cls,role,empty)=>arr&&arr.length?arr.map(p=>person(p,cls,role)).join(''):`<div class="bd-empty">${empty||'Not appointed yet.'}</div>`;
const fdt=s=>s?String(s).replace('T',' ').slice(0,16):'';

/* ═════════════ GOVERNANCE BODIES (everyone) ═════════════ */
VIEWS.bodies=async function(){
  const j=await api('govBodies');
  if(j.me.idc||j.me.super)addBtn('Open IDC case files',()=>go('idc'));
  addBtn('Report a concern to the IDC',()=>report(j));
  const idcN=(j.idc.chair?1:0)+j.idc.members.length;
  $('#view').innerHTML=hero('Governance bodies','Who holds each office under the TEDxThaltej Charter, and how to reach them. Every member can see this page.')+
    `<div class="bd-grid">
      <div class="bd-card"><h3>The Organizer</h3><div class="art">Licensee · final authority</div>${person(j.organizer,'','Organizer & Licensee')}</div>
      <div class="bd-card"><h3>Registrar</h3><div class="art">Office of the Registrar</div><p class="d">Issues letters, certificates and IDs, and verifies Council counts.</p>${list(j.registrars,'','Registrar')}</div>
    </div>
    <div class="bd-grid">
      <div class="bd-card y"><h3>Senior Advisors</h3><div class="art">Article 24 · ${j.advisors.length} appointed</div>
        <p class="d">Appointed by the Organizer to advise on strategy and governance. Senior Advisors are members of the Council.</p>${list(j.advisors,'y','Senior Advisor')}</div>
      <div class="bd-card red"><h3>Internal Disciplinary Committee</h3><div class="art">Article 13B · ${idcN} of 6 seats filled</div>
        <p class="d">An advisory committee that looks into misconduct and Charter violations fairly and in confidence, then recommends action to the Organizer.</p>
        ${j.idc.chair?person(j.idc.chair,'c','Chairperson'):`<div class="bd-empty">Chairperson not appointed yet.</div>`}
        ${list(j.idc.members,'','Member','No members appointed yet.')}
        ${Array.from({length:Math.max(0,5-j.idc.members.length)}).map(()=>`<div class="bd-p"><span class="bd-av" style="background:#eee;color:#999">–</span><small>Vacant seat</small></div>`).join('')}</div>
    </div>
    <div class="bd-grid">
      <div class="bd-card"><h3>Core Team</h3><div class="art">Article 13A · heads of departments</div>${list(j.core,'','','No heads listed yet.')}</div>
      <div class="bd-card"><h3>Council</h3><div class="art">Articles 24 & 27</div><p class="d">The Council has <b>${j.council}</b> member${j.council===1?'':'s'} today. Council motions (Institutional Hearings and Constitutional Reviews) are on the Charter & Council page.</p><button class="btn light sm" onclick="go('charter')">Open Charter & Council</button></div>
    </div>
    <div class="panel" style="padding:18px"><h3 style="margin-bottom:6px">My IDC matters</h3>
      <p class="gx-note" style="margin-bottom:8px">Matters you reported, and matters concerning you after the Committee has informed you. Everything here is confidential.</p>
      ${j.myCases.length?tableHTML(j.myCases,[['id','Ref',v=>`<span class="mono">${esc(v)}</span>`],['title','Matter',v=>`<b>${esc(v)}</b>`],['role','You',v=>v==='reported'?'Reported it':'Concerned'],['status','Status',badge],['created_at','Opened',fmt]]):'<div class="bd-empty">Nothing here.</div>'}</div>`;
  $('#view').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>openCase(j.myCases[tr.dataset.i].id));
};

function report(j){
  modal('Report a concern to the IDC',`<div class="banner">Your report goes only to the Internal Disciplinary Committee and the Organizer. The person concerned is told about the allegations so they can respond (Article 13B.7.2), but not who reported them.</div>
    <div class="grid2"><label style="grid-column:1/-1">Short title<input id="rpT" maxlength="160" placeholder="e.g. Shared confidential speaker details"></label>
    <label>Kind<select id="rpK">${j.kinds.map(k=>`<option>${esc(k)}</option>`).join('')}</select></label>
    <label>Person concerned (email, optional)<input id="rpE" type="email" placeholder="name@example.com"></label>
    <label style="grid-column:1/-1">What happened<textarea id="rpA" rows="6" placeholder="Dates, places, what was said or done, who saw it."></textarea></label>
    <label style="grid-column:1/-1">Evidence links (optional)<input id="rpL" placeholder="Drive links, screenshots"></label></div>`,
    [['Send to the IDC',async()=>{const r=await api('idcReport',{title:$('#rpT').value,kind:$('#rpK').value,subject_email:$('#rpE').value,allegations:$('#rpA').value,links:$('#rpL').value});toast('Sent to the IDC · '+r.id);closeM();VIEWS.bodies();}]]);
}

/* ═════════════ ONE CASE (IDC, Organizer, concerned person, reporter) ═════════════ */
async function openCase(id){
  const j=await api('idcCase',{id}),c=j.case;
  if(j.recused)return modal(c.id+' · '+c.title,`<div class="banner">You have recused yourself from this matter, so the case file is hidden from you.</div>`,[['Withdraw recusal',async()=>{await api('idcAct',{id,op:'recuse'});closeM();openCase(id);},'light']]);
  const full=j.role==='organizer'||j.role==='idc',chair=j.chair||j.role==='organizer';
  const msgs=j.messages.map(m=>m.from==='system'?`<div class="bd-msg sys">${esc(fdt(m.at))} · ${esc(m.body)}</div>`:
    `<div class="bd-msg ${m.mine?'me':''}"><small>${esc(m.from)} · ${esc(fdt(m.at))}${full?`<span class="bd-ch ${m.channel}">${{idc:'Committee only',concerned:'With concerned',reporter:'With reporter'}[m.channel]}</span>`:''}</small>${esc(m.body)}</div>`).join('')||'<div class="bd-empty">No messages yet.</div>';
  const kv=`<dl class="kv"><dt>Status</dt><dd>${badge(c.status)}</dd><dt>Kind</dt><dd>${esc(c.kind)} · ${esc(c.source)}</dd>
    ${c.subject?`<dt>Concerned</dt><dd>${esc(c.subject)}${full?(c.notified?' · <span class="fx-pos">informed</span>':' · <span class="fx-neg">not yet informed</span>'):''}</dd>`:''}
    ${full&&c.reported_by?`<dt>Reported by</dt><dd>${esc(c.reported_by)}</dd>`:''}
    ${c.hearing_at?`<dt>Hearing</dt><dd>${esc(fdt(c.hearing_at))} IST${c.hearing_link?` · <a href="${esc(c.hearing_link)}" target="_blank" rel="noopener">Join ↗</a>`:''}</dd>`:''}
    ${c.recused&&c.recused.length?`<dt>Recused</dt><dd>${c.recused.map(esc).join(', ')}</dd>`:''}</dl>`;
  const body=kv+(c.allegations?`<b style="font-size:12px">Allegations</b><div class="log" style="white-space:pre-wrap">${esc(c.allegations)}</div>`:'')+
    (c.links?`<p style="font-size:13px">Evidence: ${esc(c.links)}</p>`:'')+
    (c.findings?`<b style="font-size:12px">Findings</b><div class="log" style="white-space:pre-wrap">${esc(c.findings)}</div><b style="font-size:12px">Recommendation</b><div class="log">${esc(c.recommendation)}</div>`:'')+
    (c.decision?`<b style="font-size:12px">Organizer’s decision</b><div class="log" style="white-space:pre-wrap;border-color:var(--ok)">${esc(c.decision)}</div>`:'')+
    `<b style="font-size:12px;display:block;margin-top:10px">Messages</b>${msgs}
    ${['Decided','Dismissed','Closed'].includes(c.status)&&!full?'':`<div style="display:grid;gap:6px;margin-top:8px">${full?`<select id="cmCh"><option value="idc">Committee only (internal note)</option>${c.notified?'<option value="concerned">To the concerned person</option>':''}${c.reported_by?'<option value="reporter">To the person who reported</option>':''}</select>`:''}
      <textarea id="cmB" rows="3" placeholder="${full?'Write a note or message':'Write your response to the Committee'}"></textarea></div>`}`;
  const acts=[];
  if(!(['Decided','Dismissed','Closed'].includes(c.status)&&!full))acts.push(['Send',async()=>{await api('idcPost',{id,channel:full?$('#cmCh').value:'',body:$('#cmB').value});toast('Sent');openCase(id);}]);
  if(j.role==='idc'&&!j.chair)acts.unshift(['Recuse myself',async()=>{if(!confirm('Recuse yourself from this matter (for a conflict of interest)?'))return;await api('idcAct',{id,op:'recuse'});toast('Recused');closeM();go('idc');},'light left']);
  if(chair&&!['Decided','Dismissed','Closed'].includes(c.status)){
    acts.unshift(['Manage…',()=>manage(c),'light']);
  }
  if(j.role==='organizer'&&!['Decided','Dismissed'].includes(c.status))acts.unshift(['Decide…',()=>decide(c),'light']);
  modal(c.id+' · '+c.title,body,acts);$('#mBox').classList.add('wide');
}
function manage(c){
  const id=c.id;
  modal('Manage '+id,`<div style="display:grid;gap:14px">
    <div class="panel" style="padding:12px"><b>1 · Person concerned</b><div style="display:flex;gap:6px;margin-top:6px"><input id="mgE" type="email" value="${esc(c.subject_email||'')}" placeholder="email" style="flex:1"><button class="btn sm light" id="mgSE">Save</button></div>
      <button class="btn sm ${c.notified?'light':'red'}" id="mgN" style="margin-top:6px" ${c.subject_email?'':'disabled'}>${c.notified?'Inform again':'Inform them of the allegations'}</button>
      <p class="gx-note" style="margin-top:4px">They receive a private notice and can read the allegations and respond (13B.7.2). The reporter is not named.</p></div>
    <div class="panel" style="padding:12px"><b>2 · Hearing</b><div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><input id="mgH" type="datetime-local" value="${esc(c.hearing_at||'')}"><select id="mgM"><option>30</option><option selected>45</option><option>60</option><option>90</option></select><button class="btn sm light" id="mgHB">Schedule with Meet</button></div>
      <p class="gx-note" style="margin-top:4px">Invites the Committee (except recused members) and the concerned person, if informed.</p></div>
    <div class="panel" style="padding:12px"><b>3 · Findings for the Organizer</b><textarea id="mgF" rows="4" placeholder="What the Committee found, and why">${esc(c.findings||'')}</textarea>
      <input id="mgR" placeholder="Recommended action (e.g. no action, caution, removal from role)" value="${esc(c.recommendation||'')}" style="margin-top:6px"><button class="btn sm red" id="mgFB" style="margin-top:6px">Submit findings</button></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="muted" style="font-size:12px;align-self:center">Status:</span>${['Received','Under inquiry','Closed'].map(s=>`<button class="btn sm light" data-s="${s}">${s}</button>`).join('')}</div></div>`,
    [['Back',()=>openCase(id),'light']]);
  const run=async(b,msg)=>{try{await api('idcAct',Object.assign({id},b));toast(msg);openCase(id);}catch(e){toast(e.message,1);}};
  $('#mgSE').onclick=()=>run({op:'subject',email:$('#mgE').value},'Saved');
  $('#mgN').onclick=()=>run({op:'notify'},'Notice sent');
  $('#mgHB').onclick=()=>run({op:'hearing',at:$('#mgH').value,minutes:$('#mgM').value},'Hearing scheduled');
  $('#mgFB').onclick=()=>run({op:'findings',findings:$('#mgF').value,recommendation:$('#mgR').value},'Findings sent to the Organizer');
  $('#mBox').querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>run({op:'status',status:b.dataset.s},'Status updated'));
}
function decide(c){
  modal('Decision on '+c.id,`${c.findings?`<b style="font-size:12px">IDC recommends</b><div class="log">${esc(c.recommendation)}</div>`:'<div class="banner">The IDC has not submitted findings yet. You can still decide or dismiss.</div>'}
    <label>Your decision (shared with the concerned person and the reporter)<textarea id="dcD" rows="5"></textarea></label>`,
    [['Dismiss',async()=>{await api('idcAct',{id:c.id,op:'decide',decision:$('#dcD').value,dismiss:true});toast('Dismissed');closeM();go('idc');},'light'],
     ['Record decision',async()=>{await api('idcAct',{id:c.id,op:'decide',decision:$('#dcD').value});toast('Decision recorded');closeM();go('idc');}]]);
}

/* ═════════════ IDC WORKSPACE ═════════════ */
VIEWS.idc=async function(){
  const j=await api('idcList');
  addBtn('+ New matter',async()=>report(await api('govBodies')));
  const open=j.rows.filter(r=>!['Decided','Dismissed','Closed'].includes(r.status));
  $('#view').innerHTML=hero('Internal Disciplinary Committee','Confidential case files. Inform the person concerned, hear them, then send findings and a recommendation to the Organizer, who decides. Recuse yourself if you have a conflict of interest.')+
    `<div class="fx-tiles"><div class="fx-tile dark"><small>Open matters</small><b>${open.length}</b></div><div class="fx-tile"><small>Awaiting Organizer</small><b>${j.rows.filter(r=>r.status==='Findings submitted').length}</b></div><div class="fx-tile"><small>Hearings scheduled</small><b>${j.rows.filter(r=>r.status==='Hearing scheduled').length}</b></div><div class="fx-tile"><small>Closed</small><b>${j.rows.length-open.length}</b></div></div>
    <div class="panel">${j.rows.length?tableHTML(j.rows,[['id','Ref',v=>`<span class="mono">${esc(v)}</span>`],['title','Matter',(v,_,r)=>`<b>${esc(v)}</b>${r.recused?' <span class="badge">Recused</span>':''}<div class="muted">${esc(r.kind)} · ${esc(r.source)}</div>`],['subject','Concerned',v=>esc(v||'—')],['status','Status',badge],['updated_at','Updated',fmt]]):'<div class="empty" style="padding:30px;text-align:center">No matters. That’s good news.</div>'}</div>
    <p class="gx-note" style="margin-top:10px">Article 13B: the IDC is advisory; final decisions rest with the Organizer. Proceedings are confidential.</p>`;
  $('#view').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>openCase(j.rows[tr.dataset.i].id));
};

/* ═════════════ SENIOR ADVISORS ═════════════ */
VIEWS.advisory=async function(){
  const j=await api('advList');
  if(j.super)addBtn('+ Ask the Senior Advisors',()=>modal('Ask the Senior Advisors',`<div class="grid2"><label style="grid-column:1/-1">Topic<input id="aqT" maxlength="160" placeholder="e.g. Choosing the 2027 venue"></label>
    <label style="grid-column:1/-1">Your question and context<textarea id="aqQ" rows="6"></textarea></label><label>Advice needed by<input id="aqD" type="date"></label></div>`,
    [['Send to advisors',async()=>{await api('advAsk',{title:$('#aqT').value,question:$('#aqQ').value,due:$('#aqD').value});toast('Sent to the Senior Advisors');closeM();VIEWS.advisory();}]]));
  $('#view').innerHTML=hero('Senior Advisors','The Organizer asks for advice; each Senior Advisor replies; the Organizer records what was decided. Advice is shared among the advisors and the Organizer only.<br><b>Advisors:</b> '+(j.advisors.length?j.advisors.map(esc).join(' · '):'none appointed yet'))+
    (j.rows.length?j.rows.map((q,i)=>`<div class="panel" style="padding:16px;margin-bottom:12px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="mono">${esc(q.id)}</span><b style="font-size:16px;flex:1">${esc(q.title)}</b>${badge(q.status)}${q.due?`<span class="badge">by ${esc(fmt(q.due))}</span>`:''}</div>
      <div class="log" style="white-space:pre-wrap;margin-top:8px">${esc(q.question)}</div>
      ${q.replies.map(r=>`<div class="bd-msg ${r.mine?'me':''}"><small>${esc(r.by)} · ${esc(fdt(r.at))}</small>${esc(r.body)}</div>`).join('')||'<div class="bd-empty">No advice yet.</div>'}
      ${q.summary?`<div class="bd-msg" style="background:#e6f6ec"><small>Organizer’s summary</small>${esc(q.summary)}</div>`:''}
      ${q.status==='Open'?`<div style="display:flex;gap:6px;margin-top:8px">${!j.super?`<textarea data-r="${i}" rows="2" style="flex:1" placeholder="Your advice"></textarea><button class="btn sm red" data-rb="${i}">Send</button>`:`<button class="btn sm light" data-c="${i}">Close with a summary</button>`}</div>`:''}</div>`).join(''):
      `<div class="panel"><div class="empty" style="padding:30px;text-align:center">${j.super?'No consultations yet. Ask your Senior Advisors for advice on any decision.':'No consultations yet. You’ll get an email when the Organizer asks for your advice.'}</div></div>`);
  $('#view').querySelectorAll('[data-rb]').forEach(b=>b.onclick=async()=>{const q=j.rows[b.dataset.rb];try{await api('advReply',{id:q.id,body:$(`[data-r="${b.dataset.rb}"]`).value});toast('Advice sent');VIEWS.advisory();}catch(e){toast(e.message,1);}});
  $('#view').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const q=j.rows[b.dataset.c];modal('Close '+q.id,`<label>What did you decide?<textarea id="acS" rows="4"></textarea></label>`,[['Close consultation',async()=>{await api('advClose',{id:q.id,summary:$('#acS').value});toast('Closed');closeM();VIEWS.advisory();}]]);});
};

/* ═════════════ PREVIEW DATA ═════════════ */
const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  const a=b.action;
  if(!D._bd){D._bd=1;
    D.admins.push({email:'meera@example.com',name:'Meera Joshi',role:'member',active:'TRUE',scopes:'',bodies:'senior_advisor,idc_chair'},{email:'raj@example.com',name:'Raj Mehta',role:'member',active:'TRUE',scopes:'',bodies:'senior_advisor'},
      {email:'hirva@example.com',name:'Hirva',role:'lead',department_id:'DP2',active:'TRUE',scopes:'',bodies:'idc_member'},{email:'aryan@example.com',name:'Aryan',role:'lead',department_id:'DP6',active:'TRUE',scopes:'',bodies:'idc_member'},{email:'jagruti@example.com',name:'Jagruti',role:'lead',department_id:'DP3',active:'TRUE',scopes:'',bodies:'idc_member'});
    D.idcCases=[{id:'IDC-2026-0002',title:'Speaker details shared outside the team',kind:'Breach of confidentiality',source:'Member report',status:'Under inquiry',subject:'Sample Member',subject_email:'member1@example.com',notified:true,reported_by:'Kalash',
        allegations:'On 2 Nov a speaker’s phone number and draft were posted in a public school group.',links:'Screenshot in Drive',hearing_at:'',created_at:'2026-11-03T10:00:00',updated_at:'2026-11-05T18:20:00',recused:[]},
      {id:'IDC-2026-0001',title:'Constitutional Review: Curation selection',kind:'Constitutional review',source:'Council motion MO-2026-0004',status:'Findings submitted',subject:'',created_at:'2026-10-21T10:00:00',updated_at:'2026-10-30T10:00:00',
        allegations:'Council asked whether the Director of Curation selection followed Article 19.',findings:'The procedure was followed; the reasons were not recorded.',recommendation:'No action; record reasons in future.',recused:['Hirva']}];
    D.idcMsgs={'IDC-2026-0002':[{channel:'system',from:'system',body:'Meera Joshi: informed the concerned person of the allegations',at:'2026-11-04T09:00'},{channel:'concerned',from:'Sample Member',body:'I posted it by mistake and deleted it within ten minutes.',at:'2026-11-04T20:10'},{channel:'idc',from:'Hirva',mine:false,body:'The screenshot shows it was up for about 2 hours.',at:'2026-11-05T18:20'}]};
    D.adv=[{id:'ADV-2026-0001',title:'Choosing the 2027 venue',question:'Two venues shortlisted: a 120-seat auditorium near Thaltej and a 300-seat hall in Navrangpura. Which suits our licence and budget?',due:'2026-11-25',status:'Open',summary:'',created_at:'2026-11-08',replies:[{by:'Raj Mehta',body:'The smaller hall fits the 100-seat licence and keeps costs down.',at:'2026-11-09T11:00'}]}];}
  const pub=x=>({name:x.name,email:x.email,team:(D.departments.find(d=>d[0]===x.department_id||d.id===x.department_id)||{})[1]||''});
  const act=D.admins.filter(x=>x.role!=='super');
  if(a==='govBodies')return {ok:true,organizer:{name:me.name,email:me.email},registrars:[{name:'Sanskriti Patidar',email:'reg@example.com'}],advisors:act.filter(x=>/senior_advisor/.test(x.bodies||'')).map(pub),
    idc:{chair:pub(act.find(x=>/idc_chair/.test(x.bodies||''))),members:act.filter(x=>/idc_member/.test(x.bodies||'')).map(pub)},core:act.filter(x=>x.role==='lead').map(pub),council:act.length,
    kinds:['Misconduct','Charter violation','Breach of confidentiality','Ethical or professional misconduct','Constitutional review','Other'],myCases:[{id:'IDC-2026-0002',title:'Speaker details shared outside the team',status:'Under inquiry',role:'reported',created_at:'2026-11-03'}],me:{super:true,idc:true,advisor:true}};
  if(a==='bodiesSet'){const x=D.admins.find(u=>u.email===b.email);x.bodies=b.bodies.join(',');return {ok:true};}
  if(a==='idcList')return {ok:true,super:true,chair:false,rows:D.idcCases.map(c=>({id:c.id,title:c.title,kind:c.kind,source:c.source,status:c.status,subject:c.subject,updated_at:c.updated_at}))};
  if(a==='idcCase'){const c=D.idcCases.find(x=>x.id===b.id);return {ok:true,role:'organizer',chair:false,case:c,messages:(D.idcMsgs[c.id]||[]).map(m=>Object.assign({},m,{from:m.channel==='system'?'system':m.from}))};}
  if(a==='idcReport'){D.idcCases.unshift({id:'IDC-2026-000'+(D.idcCases.length+1),title:b.title,kind:b.kind,source:'Organizer referral',status:'Received',allegations:b.allegations,subject:b.subject_email,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),recused:[]});return {ok:true,id:D.idcCases[0].id};}
  if(a==='idcPost'){(D.idcMsgs[b.id]=D.idcMsgs[b.id]||[]).push({channel:b.channel||'idc',from:me.name,mine:true,body:b.body,at:new Date().toISOString()});return {ok:true};}
  if(a==='idcAct'){const c=D.idcCases.find(x=>x.id===b.id);if(b.op==='decide'){c.status=b.dismiss?'Dismissed':'Decided';c.decision=b.decision;}if(b.op==='status')c.status=b.status;if(b.op==='findings'){c.status='Findings submitted';c.findings=b.findings;c.recommendation=b.recommendation;}if(b.op==='hearing'){c.status='Hearing scheduled';c.hearing_at=b.at;c.hearing_link='https://meet.google.com/abc-defg-hij';}if(b.op==='notify')c.notified=true;return {ok:true};}
  if(a==='advList')return {ok:true,super:true,rows:D.adv,advisors:act.filter(x=>/senior_advisor/.test(x.bodies||'')).map(x=>x.name)};
  if(a==='advAsk'){D.adv.unshift({id:'ADV-2026-000'+(D.adv.length+1),title:b.title,question:b.question,due:b.due,status:'Open',replies:[],created_at:new Date().toISOString()});return {ok:true};}
  if(a==='advClose'){const q=D.adv.find(x=>x.id===b.id);q.status='Closed';q.summary=b.summary;return {ok:true};}
  return prev?prev(b,me,D):null;
};
})();
