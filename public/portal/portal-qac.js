/* Team Portal: Quality Assurance Committee (QAC). Members (mostly outside experts) review work, raise queries and
   recommendations, hold meetings and produce the Annual Quality Report. Auto QAC opens delay queries on late tasks.
   Team members see their own QAC questions and recommendations here. Loaded after portal-bodies.js. */
(function(){
const css=`
.qc-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}.qc-tabs button{border:1.5px solid var(--n,#101B3D);background:#fff;border-radius:99px;padding:7px 14px;font-weight:700;font-size:13px;cursor:pointer}
.qc-tabs button.on{background:var(--n,#101B3D);color:#fff}
.qc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px}
.qc-kpi{background:#fff;border:1.5px solid var(--n,#101B3D);border-radius:16px;padding:12px 14px;box-shadow:3px 3px 0 var(--y,#FFC83D)}
.qc-kpi b{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:28px;display:block;line-height:1}.qc-kpi small{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.qc-q{margin:6px 0 10px 18px;font-size:14px}.qc-q li{margin:4px 0}
.qc-ai{background:#f3efff;border:1px solid #d9ccff;border-radius:14px;padding:10px 12px;font-size:13px;white-space:pre-wrap;margin:8px 0}
.qc-ai small{display:block;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#6b4fd8;margin-bottom:3px}
.qc-decl{background:#fff;border:2px solid var(--n,#101B3D);border-radius:20px;padding:22px;max-width:640px;box-shadow:5px 5px 0 var(--red,#E62B1E)}
.b-Awaiting.reply{background:#fff4e0;color:var(--warn)}.b-Replied{background:#e8f0fe;color:#1a56db}.b-Escalated{background:#fde8e7;color:var(--red,#E62B1E)}.b-Responded{background:#e8f0fe;color:#1a56db}
.b-Draft{background:#fff4e0;color:var(--warn)}.b-Issued{background:#e6f6ec;color:var(--ok)}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

const at=id=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('registrar')>=0?at('registrar'):SECTIONS.length,0,{id:'qac',name:'Quality (QAC)',ico:'◆',grp:'Charter offices',always:true,ext:true});
const sec=SECTIONS.find(s=>s.id==='security');if(sec)sec.ext=true;
const h=location.hash.slice(1);if(h==='qac')CUR='qac';

const hero=(t,p,r)=>`<div class="gx-hero"><div style="flex:1;min-width:240px"><h2>${t}</h2>${p?`<p>${p}</p>`:''}</div>${r||''}</div>`;
const fdt=s=>s?String(s).replace('T',' ').slice(0,16):'';
let TAB='items',J=null;
const run=async(fn,msg,after)=>{try{await fn();if(msg)toast(msg);closeM();(after||VIEWS.qac)();}catch(e){toast(e.message,1);}};

VIEWS.qac=async function(){
  $('#tools').innerHTML='';const j=J=await api('qacBoot');
  if(!j.member) return mineView(j);
  if(!j.declared) return declView(j);
  const tabs=[['items','Items'],['recs','Recommendations'],['meet','Meetings'],['people','Members'],['report','Annual report']].concat(j.lead?[['set','Settings']]:[]);
  if(!tabs.some(t=>t[0]===TAB))TAB='items';
  addBtn('+ Ask a team member',()=>newQuery(j));
  if(j.canRequest)addBtn('Request a review',()=>newReview(j));
  const open=j.items.filter(i=>i.status!=='Closed');
  $('#view').innerHTML=hero('Quality Assurance Committee',`The QAC checks the quality of our work and helps the team improve. It is advisory, not disciplinary. <b>Auto QAC</b> asks members about late tasks for you and follows up.<br><span style="opacity:.8">${j.people.find(p=>p.secretary)?'Member Secretary: <b>'+esc(j.people.find(p=>p.secretary).name)+'</b> · ':''}${j.people.length} member${j.people.length===1?'':'s'}</span>`)+
    `<div class="qc-kpis"><div class="qc-kpi"><b>${open.length}</b><small>Open items</small></div><div class="qc-kpi"><b>${open.filter(i=>i.mine).length}</b><small>Assigned to me</small></div>
      <div class="qc-kpi"><b>${j.items.filter(i=>i.status==='Escalated').length}</b><small>Escalated</small></div><div class="qc-kpi"><b>${j.recs.filter(r=>r.overdue).length}</b><small>Overdue recommendations</small></div></div>`+
    `<div class="qc-tabs">${tabs.map(t=>`<button data-t="${t[0]}" class="${TAB===t[0]?'on':''}">${t[1]}</button>`).join('')}</div><div id="qcBody"></div>`;
  $('#view').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{TAB=b.dataset.t;VIEWS.qac();});
  ({items,recs,meet,people,report,set})[TAB](j);
};

/* ─── team member view (no QAC office) ─── */
function mineView(j){
  if(j.canRequest)addBtn('Request a QAC review',()=>newReview(j));
  $('#view').innerHTML=hero('Quality (QAC)','The Quality Assurance Committee helps the team keep our work at TEDx standard. It is not disciplinary. If it asks you something, please reply here.')+
    `<div class="panel" style="padding:18px;margin-bottom:14px"><h3 style="margin-bottom:6px">Questions for me</h3>${j.mine.length?tableHTML(j.mine,[['id','Ref',v=>`<span class="mono">${esc(v)}</span>`],['title','About',v=>`<b>${esc(v)}</b>`],['status','Status',badge],['due','Reply by',fmt]],null,true):'<div class="bd-empty">Nothing from the QAC.</div>'}</div>
    <div class="panel" style="padding:18px"><h3 style="margin-bottom:6px">Recommendations for me</h3>${j.myRecs.length?j.myRecs.map((r,i)=>recCard(r,i,true)).join(''):'<div class="bd-empty">None.</div>'}</div>`;
  $('#view').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>openItem(j.mine[tr.dataset.i].id));
  bindRecs(j.myRecs);
}

/* ─── declaration (first sign-in) ─── */
function declView(j){
  $('#view').innerHTML=`<div class="qc-decl"><h2 style="font-family:Anton,Impact,sans-serif;font-weight:400;text-transform:uppercase;font-size:30px">Welcome to the QAC</h2>
    <p style="margin:8px 0 14px;color:#444">Before you start, please accept the Committee’s declaration.</p>
    <div class="log" style="font-size:14px">${esc(j.declaration)}</div>
    <label style="margin-top:12px">Any conflicts of interest to declare (optional)<textarea id="qdC" rows="2" placeholder="e.g. My niece is on the Hosting team"></textarea></label>
    <label style="display:flex;gap:8px;align-items:center;margin:10px 0"><input type="checkbox" id="qdA" style="width:auto"> I agree to this declaration</label>
    <button class="btn red" id="qdB">Continue</button></div>`;
  $('#qdB').onclick=()=>run(()=>api('qacDeclare',{agree:$('#qdA').checked,conflicts:$('#qdC').value}),'Thank you');
}

/* ─── items ─── */
function items(j){
  const el=$('#qcBody');let f=items.f||'open';
  const rows=j.items.filter(i=>f==='all'||(f==='mine'?i.mine&&i.status!=='Closed':i.status!=='Closed'));
  el.innerHTML=`<div style="display:flex;gap:6px;margin-bottom:8px">${[['open','Open'],['mine','Mine'],['all','All']].map(x=>`<button class="btn sm ${f===x[0]?'':'light'}" data-f="${x[0]}">${x[1]}</button>`).join('')}</div>`+
    (rows.length?`<div class="panel">${tableHTML(rows,[['id','Ref',(v,_,r)=>`<span class="mono">${esc(v)}</span>${r.auto?' <span class="badge">auto</span>':''}`],['title','Item',v=>`<b>${esc(v)}</b>`],['kind','Kind'],['department','Team'],['concerned','Asked'],['assigned','QAC member'],['status','Status',badge],['reply_by','Reply by',fmt]],null,true)}</div>`
      :'<div class="panel"><div class="empty" style="padding:30px;text-align:center">Nothing here. Auto QAC opens a query when a task runs late.</div></div>');
  el.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{items.f=b.dataset.f;items(j);});
  el.querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>openItem(rows[tr.dataset.i].id));
}
async function openItem(id){
  const j=await api('qacItem',{id}),i=j.item,q=j.role==='qac',closed=i.status==='Closed';
  const msgs=j.messages.map(m=>m.from==='system'?`<div class="bd-msg sys">${esc(fdt(m.at))} · ${esc(m.body)}</div>`:
    `<div class="bd-msg ${m.mine?'me':''}"><small>${esc(m.from)} · ${esc(fdt(m.at))}${m.internal?'<span class="bd-ch">QAC only</span>':''}</small>${esc(m.body)}</div>`).join('')||'<div class="bd-empty">No messages yet.</div>';
  const body=`<dl class="kv"><dt>Status</dt><dd>${badge(i.status)}${i.auto?' <span class="badge">Auto QAC</span>':''}</dd><dt>Kind</dt><dd>${esc(i.kind)}${i.department?' · '+esc(i.department):''}</dd>
      ${i.concerned?`<dt>Asked</dt><dd>${esc(i.concerned)}</dd>`:''}${q?`<dt>QAC member</dt><dd>${esc(i.assigned||'—')}</dd>`:''}${i.reply_by&&!closed?`<dt>Reply by</dt><dd>${esc(fmt(i.reply_by))}</dd>`:''}
      ${i.task?`<dt>Task</dt><dd>${esc(i.task.title)} · due ${esc(fmt(i.task.due))} · ${esc(i.task.status)}</dd>`:''}${i.rating?`<dt>Rating</dt><dd>${'★'.repeat(+i.rating)}${'☆'.repeat(5-i.rating)}</dd>`:''}</dl>
    ${i.detail?`<div class="log" style="white-space:pre-wrap">${esc(i.detail)}</div>`:''}${i.links?`<p style="font-size:13px">Links: ${esc(i.links)}</p>`:''}
    ${i.questions.length?`<b style="font-size:12px">Questions</b><ol class="qc-q">${i.questions.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}
    ${i.ai_note?`<div class="qc-ai"><small>AI assessment · advisory, for the QAC only</small>${esc(i.ai_note)}</div>`:''}
    ${i.outcome?`<b style="font-size:12px">Outcome</b><div class="log" style="white-space:pre-wrap;border-color:var(--ok)">${esc(i.outcome)}</div>`:''}
    <b style="font-size:12px;display:block;margin-top:10px">Messages</b>${msgs}
    ${closed?'':`<textarea id="qmB" rows="3" style="margin-top:8px" placeholder="${q?'Write to '+(i.kind==='Review'?'the requester':'the member'):'Write your reply to the QAC'}"></textarea>${q?'<label style="display:flex;gap:6px;align-items:center;font-size:13px;margin-top:4px"><input type="checkbox" id="qmI" style="width:auto"> QAC only (internal note)</label>':''}`}`;
  const acts=[];
  if(!closed)acts.push(['Send',()=>run(()=>api('qacPost',{id,body:$('#qmB').value,internal:q&&$('#qmI').checked}),'Sent',()=>openItem(id))]);
  if(q&&!closed){
    acts.unshift(['Close…',()=>closeItem(i),'light']);
    acts.unshift(['More…',()=>more(i,j),'light left']);
  }
  if(q&&closed)acts.unshift(['Reopen',()=>run(()=>api('qacAct',{id,op:'reopen'}),'Reopened',()=>openItem(id)),'light left']);
  modal(i.id+' · '+i.title,body,acts);$('#mBox').classList.add('wide');
}
function more(i,j){
  modal('More on '+i.id,`<div style="display:grid;gap:12px">
    <div class="panel" style="padding:12px"><b>AI assessment</b><p class="gx-note" style="margin:4px 0 8px">Reads the questions and replies and suggests an outcome. Only the QAC sees it.</p><button class="btn sm light" id="mA">Ask the AI</button></div>
    ${i.kind!=='Review'?`<div class="panel" style="padding:12px"><b>Follow up</b><div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn sm light" id="mR">Send a reminder</button><button class="btn sm red" id="mE">Escalate to department head</button></div></div>`:''}
    <div class="panel" style="padding:12px"><b>Recommendation</b><p class="gx-note" style="margin:4px 0 8px">Ask the department head to change something, and track it.</p><button class="btn sm light" id="mRec">Raise a recommendation</button></div>
    ${J&&J.lead||i.mine?`<div class="panel" style="padding:12px"><b>Reassign</b><div style="display:flex;gap:6px;margin-top:6px"><select id="mS" style="flex:1">${j.people.map(p=>`<option value="${esc(p.email)}" ${p.email===i.assigned_email?'selected':''}>${esc(p.name)}</option>`).join('')}</select><button class="btn sm light" id="mSB">Assign</button></div></div>`:''}</div>`,
    [['Back',()=>openItem(i.id),'light']]);
  const back=()=>openItem(i.id);
  $('#mA').onclick=()=>{$('#mA').textContent='Thinking…';run(()=>api('qacAct',{id:i.id,op:'ai'}),'AI assessment added',back);};
  if($('#mR'))$('#mR').onclick=()=>run(()=>api('qacAct',{id:i.id,op:'remind'}),'Reminder sent',back);
  if($('#mE'))$('#mE').onclick=()=>{if(confirm('Email the department head and Member Secretary about this?'))run(()=>api('qacAct',{id:i.id,op:'escalate'}),'Escalated',back);};
  $('#mRec').onclick=()=>newRec({item_id:i.id,department_id:i.department_id,title:''});
  if($('#mSB'))$('#mSB').onclick=()=>run(()=>api('qacAct',{id:i.id,op:'assign',email:$('#mS').value}),'Assigned',back);
}
function closeItem(i){
  modal('Close '+i.id,`${i.ai_note?`<div class="qc-ai"><small>AI suggestion</small>${esc((i.ai_note.match(/Suggested outcome: (.*)/)||[])[1]||i.ai_note)}</div>`:''}
    <label>Outcome (shared with ${i.kind==='Review'?'the requester':'the member'})<textarea id="qcO" rows="4" placeholder="What the QAC found and what happens next"></textarea></label>
    ${i.kind==='Review'?`<label>Quality rating<select id="qcR"><option value="">Choose…</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${n} · ${['','Needs major work','Below standard','Acceptable','Good','Excellent'][n]}</option>`).join('')}</select></label>`:''}`,
    [['Back',()=>openItem(i.id),'light'],['Close item',()=>run(()=>api('qacAct',{id:i.id,op:'close',outcome:$('#qcO').value,rating:$('#qcR')?$('#qcR').value:''}),'Closed')]]);
}
async function newQuery(j){
  let ppl=[];try{ppl=(await api('qacMembers')).people;}catch(e){}
  modal('Ask a team member',`<div class="grid2"><label style="grid-column:1/-1">Team member<select id="nqE"><option value="">Choose…</option>${ppl.map(p=>`<option value="${esc(p.email)}">${esc(p.name||p.email)}</option>`).join('')}</select></label>
    <label style="grid-column:1/-1">About<input id="nqT" maxlength="160" placeholder="e.g. Speaker briefing pack"></label>
    <label style="grid-column:1/-1">Context (optional)<textarea id="nqD" rows="3"></textarea></label>
    <label style="grid-column:1/-1">Questions (one per line)<textarea id="nqQ" rows="5"></textarea></label></div>
    <button class="btn sm light" id="nqAI">✦ Suggest questions with AI</button>`,
    [['Send',()=>run(()=>api('qacItemNew',{kind:'Query',concerned_email:$('#nqE').value,title:$('#nqT').value,detail:$('#nqD').value,questions:$('#nqQ').value.split('\n')}),'Sent to the member')]]);
  $('#nqAI').onclick=async()=>{$('#nqAI').textContent='Thinking…';try{const r=await api('qacAiQuestions',{title:$('#nqT').value,detail:$('#nqD').value});$('#nqQ').value=r.questions.join('\n');}catch(e){toast(e.message,1);}$('#nqAI').textContent='✦ Suggest questions with AI';};
}
function newReview(j){
  modal('Request a QAC review',`<div class="grid2"><label style="grid-column:1/-1">What should be reviewed<input id="rvT" maxlength="160" placeholder="e.g. Run of show v2"></label>
    <label>Team<select id="rvD">${j.departments.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select></label>
    <label>Links (Drive, Canva, Docs)<input id="rvL"></label>
    <label style="grid-column:1/-1">What do you want the QAC to check?<textarea id="rvX" rows="4"></textarea></label></div>`,
    [['Send to the QAC',()=>run(()=>api('qacItemNew',{kind:'Review',title:$('#rvT').value,department_id:$('#rvD').value,links:$('#rvL').value,detail:$('#rvX').value}),'Sent to the QAC')]]);
}

/* ─── recommendations ─── */
const recCard=(r,i,mine)=>`<div class="panel" style="padding:14px;margin-bottom:10px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="mono">${esc(r.id)}</span><b style="flex:1">${esc(r.title)}</b>${badge(r.status)}${r.overdue?'<span class="badge" style="background:#fde8e7;color:var(--red)">overdue</span>':''}${r.due?`<span class="badge">by ${esc(fmt(r.due))}</span>`:''}</div>
  ${r.department||r.owner?`<small class="muted">${esc([r.department,r.owner].filter(Boolean).join(' · '))}</small>`:''}<div class="log" style="white-space:pre-wrap;margin-top:6px">${esc(r.detail)}</div>
  ${r.response?`<div class="bd-msg"><small>Response</small>${esc(r.response)}</div>`:''}
  ${mine&&r.status!=='Closed'?`<div style="display:flex;gap:6px;margin-top:6px"><textarea data-rr="${i}" rows="2" style="flex:1" placeholder="What have you done or will you do?"></textarea><button class="btn sm red" data-rs="${i}">Respond</button></div>`:''}
  ${!mine&&r.status==='Responded'?`<div style="display:flex;gap:6px;margin-top:6px"><button class="btn sm" data-rc="${i}">Accept & close</button><button class="btn sm light" data-rbk="${i}">Ask for more</button></div>`:''}</div>`;
function bindRecs(list){
  document.querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>run(()=>api('qacRecRespond',{id:list[b.dataset.rs].id,response:$(`[data-rr="${b.dataset.rs}"]`).value}),'Response sent'));
  document.querySelectorAll('[data-rc]').forEach(b=>b.onclick=()=>run(()=>api('qacRecClose',{id:list[b.dataset.rc].id}),'Closed'));
  document.querySelectorAll('[data-rbk]').forEach(b=>b.onclick=()=>{const n=prompt('What more do you need?');if(n)run(()=>api('qacRecClose',{id:list[b.dataset.rbk].id,back:true,note:n}),'Sent back');});
}
function recs(j){
  $('#qcBody').innerHTML=`<div style="margin-bottom:10px"><button class="btn sm red" id="rcN">+ New recommendation</button></div>`+(j.recs.length?j.recs.map((r,i)=>recCard(r,i,false)).join(''):'<div class="panel"><div class="empty" style="padding:30px;text-align:center">No recommendations yet.</div></div>');
  $('#rcN').onclick=()=>newRec({});bindRecs(j.recs);
}
function newRec(p){
  const deps=(J&&J.departments)||[];
  modal('New recommendation',`<div class="grid2"><label style="grid-column:1/-1">Recommendation<input id="nrT" maxlength="160" placeholder="e.g. Add 10-minute buffers between sessions"></label>
    <label>Team<select id="nrD">${deps.map(d=>`<option value="${esc(d.id)}" ${d.id===p.department_id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></label>
    <label>Respond by<input id="nrDue" type="date"></label>
    <label style="grid-column:1/-1">Details<textarea id="nrX" rows="4"></textarea></label></div><p class="gx-note">It goes to the head of that team.</p>`,
    [['Send',()=>run(()=>api('qacRecNew',{title:$('#nrT').value,detail:$('#nrX').value,department_id:$('#nrD').value,due:$('#nrDue').value,item_id:p.item_id||''}),'Recommendation sent')]]);
}

/* ─── meetings ─── */
function meet(j){
  $('#qcBody').innerHTML=(j.lead?`<div style="margin-bottom:10px"><button class="btn sm red" id="mtN">+ Schedule a meeting</button></div>`:'')+
    (j.meetings.length?j.meetings.map((m,i)=>`<div class="panel" style="padding:14px;margin-bottom:10px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="flex:1">${esc(m.title)}</b><span class="badge">${esc(fdt(m.at))} IST</span>${m.link?`<a class="btn sm light" href="${esc(m.link)}" target="_blank" rel="noopener">Join ↗</a>`:''}</div>
      ${m.agenda?`<b style="font-size:12px">Agenda</b><div class="log" style="white-space:pre-wrap">${esc(m.agenda)}</div>`:''}${m.minutes?`<b style="font-size:12px">Minutes</b><div class="log" style="white-space:pre-wrap">${esc(m.minutes)}</div>`:''}
      ${m.decisions?`<b style="font-size:12px">Decisions</b><div class="log" style="white-space:pre-wrap">${esc(m.decisions)}</div>`:''}${m.attendees?`<small class="muted">Present: ${esc(m.attendees)}</small>`:''}
      ${j.lead?`<div style="margin-top:6px"><button class="btn sm light" data-mm="${i}">${m.minutes?'Edit':'Add'} minutes</button></div>`:''}</div>`).join(''):'<div class="panel"><div class="empty" style="padding:30px;text-align:center">No meetings yet.</div></div>');
  if($('#mtN'))$('#mtN').onclick=()=>modal('Schedule a QAC meeting',`<div class="grid2"><label style="grid-column:1/-1">Title<input id="mtT" placeholder="e.g. Pre-event quality review"></label><label>Date & time (IST)<input id="mtA" type="datetime-local"></label>
      <label>Length<select id="mtL"><option>30</option><option selected>60</option><option>90</option></select></label><label style="grid-column:1/-1">Agenda<textarea id="mtG" rows="4"></textarea></label></div><p class="gx-note">All QAC members and the Organizer get a calendar invite with a Meet link.</p>`,
    [['Schedule',()=>run(()=>api('qacMeetSave',{title:$('#mtT').value,at:$('#mtA').value,minutesLong:$('#mtL').value,agenda:$('#mtG').value}),'Meeting scheduled')]]);
  document.querySelectorAll('[data-mm]').forEach(b=>b.onclick=()=>{const m=j.meetings[b.dataset.mm];
    modal('Minutes · '+m.title,`<label>Present<input id="mmP" value="${esc(m.attendees||'')}" placeholder="Names"></label><label>Minutes<textarea id="mmM" rows="6">${esc(m.minutes||'')}</textarea></label><label>Decisions<textarea id="mmD" rows="3">${esc(m.decisions||'')}</textarea></label>`,
      [['Save',()=>run(()=>api('qacMeetSave',{id:m.id,attendees:$('#mmP').value,minutes:$('#mmM').value,decisions:$('#mmD').value}),'Saved')]]);});
}

/* ─── members ─── */
function people(j){
  $('#qcBody').innerHTML=(j.super?`<div style="margin-bottom:10px"><button class="btn sm red" id="ppN">+ Appoint a member</button></div>`:'')+
    `<div class="panel">${j.people.length?tableHTML(j.people,[['name','Name',(v,_,p)=>`<b>${esc(v)}</b>${p.secretary?' <span class="badge" style="background:#101B3D;color:#fff">Member Secretary</span>':''}`],['expertise','Expertise'],['external','From',v=>v?'Outside':'Team'],['term_until','Term until',fmt],['declared','Declaration',v=>v?'✓ signed':'pending']].concat(j.super?[['email','',v=>`<button class="btn sm light" data-rm="${esc(v)}">Remove</button>`]]:[])):'<div class="empty" style="padding:30px;text-align:center">No members yet.</div>'}</div>
    <p class="gx-note" style="margin-top:8px">Outside members get an account that opens only this page. They can connect Google sign-in, and access ends on their term date.</p>`;
  if($('#ppN'))$('#ppN').onclick=()=>modal('Appoint a QAC member',`<div class="grid2"><label>Name<input id="apN"></label><label>Email<input id="apE" type="email"></label>
      <label>Expertise<input id="apX" placeholder="e.g. Education, events, child safety"></label><label>Term until<input id="apT" type="date"></label>
      <label style="grid-column:1/-1;display:flex;gap:8px;align-items:center"><input type="checkbox" id="apS" style="width:auto"> Member Secretary (only one)</label></div>
      <p class="gx-note">If the email is not a team member, an outside account is created and they get an invitation with a temporary password.</p>`,
    [['Appoint',()=>run(()=>api('qacMemberSave',{name:$('#apN').value,email:$('#apE').value,expertise:$('#apX').value,term_until:$('#apT').value,secretary:$('#apS').checked}),'Appointed')]]);
  document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(confirm('Remove from the QAC? Outside members lose access.'))run(()=>api('qacMemberRemove',{email:b.dataset.rm}),'Removed');});
}

/* ─── annual report ─── */
function report(j){
  $('#qcBody').innerHTML=(j.lead?`<div class="panel" style="padding:14px;margin-bottom:10px"><b>Annual Quality Report</b><p class="gx-note" style="margin:4px 0 8px">Drafted automatically on <b>${esc(j.conf.report_on.split('-').reverse().join('/'))}</b> each year from totals only (no names), with an AI-written summary. The Member Secretary edits it; the Organizer issues it on the letterhead.</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:end"><label style="margin:0">From<input id="arF" type="date"></label><label style="margin:0">To<input id="arT" type="date"></label><button class="btn sm red" id="arD">Draft now</button></div></div>`:'')+
    (j.reports.length?`<div class="panel">${tableHTML(j.reports,[['id','Ref',v=>`<span class="mono">${esc(v)}</span>`],['cycle','Cycle',v=>`<b>${esc(v)}</b>`],['from','From',fmt],['to','To',fmt],['status','Status',badge],['reg_id','Register no.']],null,true)}</div>`:'<div class="panel"><div class="empty" style="padding:30px;text-align:center">No report yet.</div></div>');
  if($('#arD'))$('#arD').onclick=()=>{$('#arD').textContent='Drafting…';run(()=>api('qacReportDraft',{from:$('#arF').value,to:$('#arT').value}),'Draft ready');};
  document.querySelectorAll('#qcBody tr[data-i]').forEach(tr=>tr.onclick=()=>openReport(j.reports[tr.dataset.i].id));
}
async function openReport(id){
  const j=await api('qacReport',{id}),r=j.report,draft=r.status==='Draft';
  const body=`<div class="qc-kpis">${r.table.slice(0,8).map(x=>`<div class="qc-kpi" style="box-shadow:none"><small>${esc(x[0])}</small><div style="font-weight:700;font-size:14px;margin-top:4px">${esc(x[1])}</div></div>`).join('')}</div>
    ${draft&&j.lead?`<label>Report text (blank line between paragraphs; lines starting with "- " become bullets)<textarea id="rpB" rows="16">${esc(r.body)}</textarea></label>`:`<div class="log" style="white-space:pre-wrap">${esc(r.body)}</div>`}`;
  const acts=[];
  if(draft&&j.lead)acts.push(['Save draft',()=>run(()=>api('qacReportSave',{id,body:$('#rpB').value}),'Saved',()=>openReport(id)),'light']);
  if(draft&&j.super)acts.push(['Sign & issue',async()=>{if(!confirm('Issue this report on the letterhead with your signature? It goes into the Register and to all QAC members.'))return;
    if($('#rpB'))await api('qacReportSave',{id,body:$('#rpB').value});run(()=>api('qacReportIssue',{id}),'Issued');}]);
  if(!draft)acts.push(['Download PDF',async()=>{try{const p=await api('qacReportPdf',{id});const a=document.createElement('a');a.href='data:application/pdf;base64,'+p.base64;a.download=p.name;a.click();}catch(e){toast(e.message,1);}}]);
  modal('Annual Quality Report · '+r.cycle,body,acts);$('#mBox').classList.add('wide');
}

/* ─── settings ─── */
function set(j){
  const c=j.conf;
  $('#qcBody').innerHTML=`<div class="panel" style="padding:18px;max-width:620px"><div style="display:grid;gap:12px">
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="stA" style="width:auto" ${c.auto?'checked':''}> <span><b>Auto QAC</b>: open a query when a task is late</span></label>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="stI" style="width:auto" ${c.ai?'checked':''}> <span><b>Use AI</b> to write questions, assessments and the report summary (never for Finance tasks)</span></label>
    <div class="grid2"><label>Open a query after a task is late by (days)<input id="stD" type="number" min="0" max="30" value="${c.delay}"></label>
    <label>Days to reply before a reminder, then escalation<input id="stR" type="number" min="1" max="30" value="${c.reply}"></label>
    <label>Annual report date (MM-DD)<input id="stO" value="${esc(c.report_on)}" placeholder="07-15"></label><label>Current cycle<input id="stC" value="${esc(c.cycle)}"></label></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn red" id="stS">Save</button><button class="btn light" id="stRun">Run Auto QAC now</button></div></div></div>`;
  $('#stS').onclick=()=>run(()=>api('qacSettings',{auto:$('#stA').checked,ai:$('#stI').checked,delay:$('#stD').value,reply:$('#stR').value,report_on:$('#stO').value,cycle:$('#stC').value}),'Saved');
  $('#stRun').onclick=async()=>{try{const r=await api('qacRunNow');toast(`Done: ${r.queries||0} new queries, ${r.reminders||0} reminders, ${r.escalated||0} escalated`);VIEWS.qac();}catch(e){toast(e.message,1);}};
}

/* ─── QAC card on Governance bodies ─── */
const prevBodies=VIEWS.bodies;
VIEWS.bodies=async function(){await prevBodies();const j=window.__lastGov;if(!j||!j.qac)return;
  const grid=document.querySelectorAll('#view .bd-grid');const g=grid[grid.length-1];if(!g)return;
  const pp=(p,role)=>`<div class="bd-p"><span class="bd-av y">${esc(String(p.name||'?').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span><div><b>${esc(p.name)}</b><small>${esc(role||p.team||'')}</small></div>${p.email?`<a href="mailto:${esc(p.email)}">Email</a>`:''}</div>`;
  g.insertAdjacentHTML('beforeend',`<div class="bd-card y"><h3>Quality Assurance Committee</h3><div class="art">QAC · ${(j.qac.secretary?1:0)+j.qac.members.length} members</div>
    <p class="d">Checks the quality of our work and helps us improve. Advisory, not disciplinary. Most members are from outside the team.</p>
    ${j.qac.secretary?pp(j.qac.secretary,'Member Secretary'+(j.qac.secretary.team?' · '+j.qac.secretary.team:'')):'<div class="bd-empty">Member Secretary not appointed yet.</div>'}
    ${j.qac.members.map(p=>pp(p)).join('')}<button class="btn light sm" style="margin-top:8px" onclick="go('qac')">Open Quality (QAC)</button></div>`);};

/* ─── preview data ─── */
const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  const a=b.action;
  if(a==='govBodies'){const r=prev?prev(b,me,D):null;if(r&&r.ok){r.qac={secretary:{name:'Dr. Neha Trivedi',email:'',team:'Education quality'},members:[{name:'Prof. Anil Desai',email:'',team:'Events & production'},{name:'Kavita Shah',email:'',team:'Child safety'},{name:'Raj Mehta',email:'raj@example.com',team:''}]};}return r;}
  if(!/^qac/.test(a))return prev?prev(b,me,D):undefined;
  if(!D._qc){D._qc=1;D.qc={items:[
      {id:'QAC-0004',kind:'Delay query',title:'Delayed task: Book the sound vendor',department:'Production',concerned:'Aryan Patel',assigned:'Prof. Anil Desai',mine:true,status:'Replied',reply_by:'2026-11-16',auto:true,created_at:'2026-11-12',
        detail:'Task TS-0031 was due on 2026-11-08 and is still "In progress" (6 days late).',questions:['What has held up booking the sound vendor?','How many quotes do you have so far?','By what date can you confirm the booking?','Is there anything that would help you finish it?'],
        ai_note:'Summary: The vendor was slow to quote; two quotes are in and a third is due Friday.\nAnswered: yes\nRisks: Only one vendor can do the full rig\nSuggested outcome: Accept the new date of 18 Nov and ask Production to keep a back-up vendor.',
        msgs:[{from:'system',body:'Auto QAC: opened because the task is 6 days late; questions written by AI',at:'2026-11-12T09:00'},{from:'Aryan Patel',body:'The vendor took a week to reply. I have two quotes and the third comes on Friday, so I can confirm by 18 Nov.',at:'2026-11-13T21:10'}]},
      {id:'QAC-0003',kind:'Review',title:'Run of show v2',department:'Hosting',concerned:'',assigned:'Kavita Shah',mine:false,status:'Open',reply_by:'',created_at:'2026-11-10',detail:'Please check timings and transitions between talks and performances.',links:'Drive: Run of show v2',questions:[],msgs:[]},
      {id:'QAC-0002',kind:'Delay query',title:'Delayed task: Speaker bios to design',department:'Curation',concerned:'Hirva Shah',assigned:'Dr. Neha Trivedi',mine:false,status:'Escalated',reply_by:'2026-11-09',auto:true,created_at:'2026-11-03',questions:['What has held this up?'],msgs:[]},
      {id:'QAC-0001',kind:'Review',title:'Volunteer briefing deck',department:'Hosting',assigned:'Kavita Shah',status:'Closed',rating:'4',outcome:'Clear and complete. Add the emergency contacts slide.',created_at:'2026-10-20',questions:[],msgs:[]}],
    recs:[{id:'QR-0002',title:'Keep a back-up sound vendor',detail:'Production should confirm a second vendor who can supply at least the speaker mics.',department:'Production',owner:'Aryan Patel',due:'2026-11-25',status:'Open'},
      {id:'QR-0001',title:'Add buffer time between sessions',detail:'Add 10 minutes between blocks to absorb overruns.',department:'Hosting',owner:'Jagruti',due:'2026-11-10',status:'Responded',overdue:true,response:'Added two 10-minute buffers in v3 of the run of show.'}],
    meetings:[{id:'QM-0001',title:'Pre-event quality review',at:'2026-11-20T18:00',link:'https://meet.google.com/abc-defg-hij',agenda:'1. Open items\n2. Run of show\n3. Safety checklist'}],
    reports:[{id:'AQR-0001',cycle:'2025-26',from:'2025-07-16',to:'2026-07-15',status:'Issued',reg_id:'TXTY/REG/2026/0042'}],
    people:[{name:'Dr. Neha Trivedi',email:'neha@example.org',secretary:true,external:true,expertise:'Education quality',term_until:'2027-08-31',declared:true},{name:'Prof. Anil Desai',email:'anil@example.org',external:true,expertise:'Events & production',term_until:'2027-08-31',declared:true},
      {name:'Kavita Shah',email:'kavita@example.org',external:true,expertise:'Child safety',term_until:'2027-08-31',declared:false},{name:'Raj Mehta',email:'raj@example.com',external:false,expertise:'',term_until:'',declared:true}],
    conf:{auto:true,ai:true,delay:2,reply:3,report_on:'07-15',cycle:'2026-27'}};}
  const Q=D.qc;
  if(a==='qacBoot')return {ok:true,member:true,lead:true,super:true,declared:true,mine:[],myRecs:[],canRequest:true,departments:[{id:'DP1',name:'Production'},{id:'DP2',name:'Hosting'},{id:'DP3',name:'Curation'}],
    items:Q.items,recs:Q.recs,meetings:Q.meetings,reports:Q.reports,people:Q.people,conf:Q.conf,declaration:'I will keep everything confidential…'};
  if(a==='qacItem'){const i=Q.items.find(x=>x.id===b.id);return {ok:true,role:'qac',lead:true,item:Object.assign({},i,{task:i.kind==='Delay query'?{title:i.title.replace('Delayed task: ',''),due:'2026-11-08',status:'In progress'}:null}),messages:i.msgs||[],people:Q.people};}
  if(a==='qacReport')return {ok:true,lead:true,super:true,report:{id:b.id,cycle:'2025-26',status:'Issued',body:'This report of the Quality Assurance Committee covers the 2025-26 cycle…',table:[['Tasks due','142'],['Completed on time','109 (77%)'],['QAC queries','18 (14 automatic) · 17 answered · avg 1.6 days'],['Quality reviews','9 of 10 · avg rating 4.1/5'],['Recommendations','12 raised · 10 closed · 1 overdue'],['QAC meetings','5 held · 5 with minutes']]}};
  if(a==='qacMembers')return {ok:true,people:[{email:'aryan@example.com',name:'Aryan Patel'},{email:'hirva@example.com',name:'Hirva Shah'}]};
  if(a==='qacAiQuestions')return {ok:true,questions:['Where does the briefing pack stand today?','What is left to finish?','When can it be shared with speakers?']};
  if(a==='qacRunNow')return {ok:true,queries:1,reminders:0,escalated:0};
  return {ok:true};
};
})();
