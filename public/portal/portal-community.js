/* Team Portal: Speaker community — members (past and present speakers), approvals, feedback, join links, and emails to speakers. */
(function(){
const at=id=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('speakers')>=0?at('speakers')+1:SECTIONS.length,0,{id:'community',name:'Speaker community',ico:'✺',grp:(SECTIONS[at('speakers')]||{}).grp||'Event',show:()=>ME&&(ME.role==='super'||(ME.scopes||[]).includes('speakers'))});
const hero=(t,p)=>`<div class="gx-hero"><div style="flex:1;min-width:240px"><h2>${t}</h2>${p?`<p>${p}</p>`:''}</div></div>`;
const run=async(fn,msg,after)=>{try{const r=await fn();if(msg)toast(typeof msg==='function'?msg(r):msg);closeM();(after||(()=>go('community')))();}catch(e){toast(e.message,1);}};
let TAB='people',J=null;
VIEWS.community=async function(){
  const j=J=await api('cmAdmin');
  if(j.super){addBtn('Email speakers',()=>compose(j));addBtn('Joining link',()=>newLink(j));}
  const tabs=[['people','Speakers'],['salon','Salon speakers'],['help','Offers & RSVPs'],['posts','Announcements'],['fb','Feedback'],['mail','Emails sent']].concat(j.super?[['links','Links'],['set','Settings']]:[]);
  const newFb=j.feedback.filter(f=>f.status==='New').length;
  $('#view').innerHTML=hero('Speaker community',`Every speaker, past and present. Past speakers join with a shared link: they tap their name, confirm their email and set a password. Members get invitations to events, can share feedback any time, and can sign in with Google.`)+
    `<div class="so-kpis"><div class="so-kpi"><b>${j.counts.members}</b><small>Members</small></div><div class="so-kpi"><b>${j.counts.pending}</b><small>Waiting for approval</small></div><div class="so-kpi"><b>${newFb}</b><small>New feedback</small></div><div class="so-kpi"><b>${j.counts.reachable}</b><small>Reachable by email</small></div></div>`+
    `<div class="so-chips">${tabs.map(t=>`<button data-t="${t[0]}" class="${TAB===t[0]?'on':''}">${t[1]}${t[0]==='fb'&&newFb?`<small>${newFb}</small>`:''}</button>`).join('')}</div><div id="cmB"></div>`;
  $('#view').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{TAB=b.dataset.t;VIEWS.community();});
  ({people,salon,help,posts,fb,mail,links,set})[TAB](j);
};
function people(j){
  const pend=j.people.filter(p=>p.claim_email);
  $('#cmB').innerHTML=(pend.length?`<div class="panel" style="padding:16px;margin-bottom:12px;border-color:var(--warn)"><b>Waiting for your approval</b><p class="gx-note" style="margin:4px 0 8px">They used a different email from the one we hold. Check it is really them.</p>${pend.map(p=>`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;border-top:1px solid #eee"><b style="flex:1">${esc(p.name)} <span class="muted" style="font-weight:400">· ${esc(p.edition)}</span><br><span style="font-weight:400;font-size:13px">New: ${esc(p.claim_email)} · On file: ${esc(p.email)}</span></b>${j.super?`<button class="btn sm" data-ap="${esc(p.id)}">Approve</button><button class="btn sm light" data-rj="${esc(p.id)}">Reject</button>`:''}</div>`).join('')}</div>`:'')+
    `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><input id="cmQ" placeholder="Search name, edition, email…" style="max-width:320px"><button class="btn sm light" id="cmCsv">Download members (CSV)</button></div><div id="cmT"></div>`;
  const draw=()=>{const q=($('#cmQ').value||'').toLowerCase(),rows=j.people.filter(p=>!q||[p.name,p.edition,p.email,p.status].join(' ').toLowerCase().includes(q));
    $('#cmT').innerHTML=`<div class="panel">${tableHTML(rows,[['name','Speaker',(v,_,p)=>`<b>${esc(v)}</b><div class="muted" style="font-size:12px">${esc(p.edition)}${p.current?' · current':''}</div>`],['email','Contact',(v,_,p)=>`${esc(v||'—')}${p.phone?`<div class="muted" style="font-size:12px">${esc(p.phone)}</div>`:''}`],
      ['status','Status',v=>`<span class="badge" style="${v==='Member'?'background:#e6f6ec;color:var(--ok)':v.startsWith('Waiting')?'background:#fff4e0;color:var(--warn)':''}">${esc(v)}</span>`],
      ['joined_at','Joined',v=>v?fmt(v):'—'],['last_login','Last seen',v=>v?fmt(v):'—'],['mail','Emails',v=>v?'✓':'off'],['google','Google',v=>v?'✓':'']].concat(j.super?[['id','',(v,_,p)=>p.status==='Member'&&!p.current?`<button class="btn sm light" data-rm="${esc(v)}">Remove</button>`:'']]:[]))}</div>`;
    document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(confirm('Remove from the Speaker Community? They will no longer be able to sign in.'))run(()=>api('cmRemove',{id:b.dataset.rm}),'Removed');});};
  draw();$('#cmQ').oninput=draw;
  $('#cmCsv').onclick=()=>{const rows=[['Name','Edition','Email','WhatsApp','Status','Joined','What they do','Offers']].concat(j.people.filter(p=>p.status==='Member').map(p=>[p.name,p.edition,p.email,p.phone,p.status,p.joined_at,p.designation,(p.offers||[]).join('; ')]));
    const csv=rows.map(r=>r.map(x=>'"'+String(x||'').replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='speaker-community.csv';a.click();};
  document.querySelectorAll('[data-ap]').forEach(b=>b.onclick=()=>run(()=>api('cmApprove',{id:b.dataset.ap}),'Approved · welcome email sent'));
  document.querySelectorAll('[data-rj]').forEach(b=>b.onclick=()=>{if(confirm('Reject this claim?'))run(()=>api('cmApprove',{id:b.dataset.rj,decision:'reject'}),'Rejected');});
}
function salon(j){
  const rows=j.people.filter(p=>p.salon);
  $('#cmB').innerHTML=`<div class="panel" style="padding:14px 16px;margin-bottom:12px;font-size:13.5px">Salon speakers join the Speaker Community and appear on the public <a href="/speakers/" target="_blank">Speaker Community page</a> as <b>Salon speakers</b>. They are <b>not</b> listed as our main-stage speakers on the edition pages. To invite them, create a Joining link for “Salon speakers only”.</div>`+
    (j.canEdit?`<div style="margin-bottom:10px"><button class="btn sm red" id="slN">+ Add a Salon speaker</button></div>`:'')+
    (rows.length?`<div class="panel">${tableHTML(rows,[['name','Speaker',(v,_,p)=>`<b>${esc(v)}</b><div class="muted" style="font-size:12px">${esc(p.talk||'')}</div>`],['edition','Salon'],['status','Status'],['public_on','Public page',v=>v?'✓':'—']].concat(j.canEdit?[['id','',(v)=>`<button class="btn sm light" data-se="${esc(v)}">Edit</button>`]]:[]))}</div>`
      :'<div class="panel"><div class="empty" style="padding:30px;text-align:center">No Salon speakers yet.</div></div>');
  const edit=p=>modal(p.id?'Edit Salon speaker':'Add a Salon speaker',`<div class="grid2"><label>Name<input id="slName" value="${esc(p.name||'')}"></label><label>Email (if you have it)<input id="slEmail" type="email" value="${esc(p.email||'')}"></label>
    <label style="grid-column:1/-1">Salon / side event<select id="slEv"><option value="">Choose…</option>${j.sides.map(e=>`<option value="${esc(e.id)}" ${p.side_event_id===e.id?'selected':''}>${esc(e.title)} · ${esc(fmt(e.date))}</option>`).join('')}</select></label>
    <label>Talk title<input id="slTalk" value="${esc(p.talk||'')}"></label><label>What they do<input id="slDes" value="${esc(p.designation||'')}"></label></div>`,
    [['Save',()=>run(()=>api('cmSalonSave',{id:p.id||'',name:$('#slName').value,email:$('#slEmail').value,side_event_id:$('#slEv').value,talk_title:$('#slTalk').value,designation:$('#slDes').value}),'Saved')]]);
  if($('#slN'))$('#slN').onclick=()=>edit({});
  document.querySelectorAll('[data-se]').forEach(b=>b.onclick=()=>edit(rows.find(r=>r.id===b.dataset.se)));
}
function help(j){
  const off=j.people.filter(p=>(p.offers||[]).length);
  $('#cmB').innerHTML=`<div class="panel" style="padding:16px;margin-bottom:12px"><b>Speakers who offered to help</b>${off.length?j.offers.map(o=>{const ps=off.filter(p=>p.offers.includes(o));return ps.length?`<div style="padding:10px 0;border-top:1px solid #eee"><div style="font-weight:700;font-size:13.5px">${esc(o)} <span class="badge">${ps.length}</span></div><div style="font-size:13.5px;margin-top:4px">${ps.map(p=>`${esc(p.name)}${p.phone?` <span class="muted">(${esc(p.phone)})</span>`:''}`).join(' · ')}</div></div>`:'';}).join('')+off.filter(p=>p.offer_note).map(p=>`<div class="bd-msg"><small>${esc(p.name)}</small>${esc(p.offer_note)}</div>`).join(''):'<p class="gx-note" style="margin-top:6px">No offers yet.</p>'}</div>
    <div class="panel" style="padding:16px"><b>Who is coming (side events)</b>${j.events.length?j.events.map(e=>`<div style="padding:10px 0;border-top:1px solid #eee"><div style="font-weight:700;font-size:13.5px">${esc(e.title)} · ${esc(fmt(String(e.starts_at).slice(0,10)))} <span class="badge">${(e.going||[]).length} going</span></div><div style="font-size:13.5px;margin-top:4px">${(e.going||[]).map(esc).join(' · ')||'<span class="muted">No one yet</span>'}</div></div>`).join(''):'<p class="gx-note" style="margin-top:6px">No upcoming side events.</p>'}</div>`;
}
function posts(j){
  $('#cmB').innerHTML=(j.canEdit?`<div style="margin-bottom:10px"><button class="btn sm red" id="poN">+ New announcement</button></div>`:'')+
    (j.posts.length?j.posts.map((p,i)=>`<div class="panel" style="padding:14px;margin-bottom:10px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="flex:1">${p.pinned?'📌 ':''}${esc(p.title)}</b><small class="muted">${esc(fmt(p.at))}</small>${j.canEdit?`<button class="btn sm light" data-pe="${i}">Edit</button><button class="btn sm light" data-pd="${i}">Delete</button>`:''}</div><div class="log" style="white-space:pre-wrap;margin-top:6px">${esc(p.body)}</div>${p.link?`<a href="${esc(p.link)}" target="_blank" rel="noopener" style="font-size:13px">${esc(p.link_label||p.link)} ↗</a>`:''}</div>`).join('')
      :'<div class="panel"><div class="empty" style="padding:30px;text-align:center">No announcements yet. They appear on every speaker’s community home.</div></div>');
  const edit=p=>modal(p.id?'Edit announcement':'New announcement',`<label>Title<input id="paT" maxlength="140" value="${esc(p.title||'')}"></label><label>Message<textarea id="paB" rows="6">${esc(p.body||'')}</textarea></label>
    <div class="grid2"><label>Link (optional)<input id="paL" value="${esc(p.link||'')}" placeholder="https://…"></label><label>Button text<input id="paLL" value="${esc(p.link_label||'')}" placeholder="e.g. See photos"></label></div>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="paP" style="width:auto" ${p.pinned?'checked':''}> Pin to the top</label>${!p.id&&j.super?'<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="paE" style="width:auto"> Also email it to community members</label>':''}`,
    [['Publish',()=>run(()=>api('cmPost',{id:p.id||'',title:$('#paT').value,body:$('#paB').value,link:$('#paL').value,link_label:$('#paLL').value,pinned:$('#paP').checked,email:$('#paE')&&$('#paE').checked}),r=>'Published'+(r.sent?` · emailed ${r.sent}`:''))]]);
  if($('#poN'))$('#poN').onclick=()=>edit({});
  document.querySelectorAll('[data-pe]').forEach(b=>b.onclick=()=>edit(j.posts[b.dataset.pe]));
  document.querySelectorAll('[data-pd]').forEach(b=>b.onclick=()=>{if(confirm('Delete this announcement?'))run(()=>api('cmPost',{id:j.posts[b.dataset.pd].id,delete:true}),'Deleted');});
}
function set(j){
  const c=j.conf;
  $('#cmB').innerHTML=`<div class="panel" style="padding:18px;max-width:700px"><div class="stack" style="display:grid;gap:12px">
    <label>Speakers’ WhatsApp group link<input id="stW" value="${esc(c.whatsapp)}" placeholder="https://chat.whatsapp.com/…"></label>
    <label>Line shown under it<input id="stWN" value="${esc(c.whatsapp_note)}" maxlength="200" placeholder="e.g. All past and present speakers. Event news and photos."></label>
    <p class="gx-note">Only signed-in community members see the link. Change it any time (for example after resetting the invite link in WhatsApp) and everyone sees the new one.</p>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="stA" style="width:auto" ${c.approve_all?'checked':''}> I approve every new member myself (recommended when we don’t have their email or number on file)</label>
    <button class="btn red" id="stS" style="justify-self:start">Save</button></div></div>`;
  $('#stS').onclick=()=>run(()=>api('cmSettings',{whatsapp:$('#stW').value,whatsapp_note:$('#stWN').value,approve_all:$('#stA').checked}),'Saved');
}
function fb(j){
  $('#cmB').innerHTML=j.feedback.length?j.feedback.map((f,i)=>`<div class="panel" style="padding:14px;margin-bottom:10px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="flex:1">${esc(f.name)}</b><span class="badge">${esc(f.kind)}</span>${f.rating?`<span class="badge">${'★'.repeat(+f.rating)}</span>`:''}${f.publish_ok?'<span class="badge" style="background:#e6f6ec;color:var(--ok)">OK to share</span>':''}${badge(f.status)}<small class="muted">${esc(fmt(f.at))}</small></div>
    ${f.about?`<div class="muted" style="font-size:13px;margin-top:4px">About: ${esc(f.about)}</div>`:''}<div class="log" style="white-space:pre-wrap;margin-top:6px">${esc(f.message)}</div>
    ${f.reply?`<div class="bd-msg"><small>Our reply</small>${esc(f.reply)}</div>`:J.canEdit?`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><textarea data-rt="${i}" rows="2" style="flex:1;min-width:220px" placeholder="Reply by email (optional)"></textarea><button class="btn sm red" data-rs="${i}">Reply</button>${f.status==='New'?`<button class="btn sm light" data-dn="${i}">Mark seen</button>`:''}</div>`:''}</div>`).join('')
    :'<div class="panel"><div class="empty" style="padding:30px;text-align:center">No feedback yet.</div></div>';
  document.querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>run(()=>api('cmFbMark',{id:j.feedback[b.dataset.rs].id,reply:$(`[data-rt="${b.dataset.rs}"]`).value}),'Reply sent'));
  document.querySelectorAll('[data-dn]').forEach(b=>b.onclick=()=>run(()=>api('cmFbMark',{id:j.feedback[b.dataset.dn].id,status:'Seen'}),'Marked seen'));
}
function mail(j){
  $('#cmB').innerHTML=j.history.length?`<div class="panel">${tableHTML(j.history,[['subject','Subject',v=>`<b>${esc(v)}</b>`],['audience','To',v=>v==='members'?'Community members':v==='all'?'Members + past speakers':'All speakers'],['count','Sent'],['sent_at','When',fmt]])}</div>`
    :'<div class="panel"><div class="empty" style="padding:30px;text-align:center">No emails yet. Use “Email speakers”.</div></div>';
}
function links(j){
  $('#cmB').innerHTML=`<div class="panel">${j.links.length?tableHTML(j.links,[['created_at','Created',fmt],['note','Note'],['edition_id','Edition',v=>v?esc((j.editions.find(e=>e.id===v)||{}).label||v):'All past editions'],['uses','Used',(v,_,l)=>`${v} / ${l.max_uses}`],['expires','Expires',fmt],['live','',(v,_,l)=>v?`<button class="btn sm light" data-cl="${esc(l.id)}">Close</button>`:'<span class="muted">closed</span>']]):'<div class="empty" style="padding:30px;text-align:center">No links yet.</div>'}</div>`;
  document.querySelectorAll('[data-cl]').forEach(b=>b.onclick=()=>run(()=>api('cmLinkClose',{id:b.dataset.cl}),'Closed'));
}
function newLink(j){
  modal('Speaker Community joining link',`<p class="gx-note" style="margin:0 0 10px">Share it with past speakers (WhatsApp, email). They tap their name, confirm their email with a code, and set a password. A link is shown only once, so copy it.</p>
    <div class="grid2"><label>Valid for<select id="lkH"><option value="72">3 days</option><option value="168" selected>7 days</option><option value="336">14 days</option><option value="720">30 days</option></select></label>
    <label>Up to<input id="lkM" type="number" value="60" min="1" max="500"> people</label>
    <label>Speakers from<select id="lkE"><option value="">All past editions</option>${j.editions.map(e=>`<option value="${esc(e.id)}">${esc(e.label)}</option>`).join('')}</select></label><label>Note (for you)<input id="lkN" placeholder="e.g. WhatsApp group, Nov"></label></div>`,
    [['Create link',async()=>{try{const r=await api('cmLinkCreate',{hours:$('#lkH').value,max:$('#lkM').value,edition_id:$('#lkE').value,note:$('#lkN').value});
      modal('Your link',`<p class="gx-note">Valid until ${esc(fmt(r.expires))}, for up to ${r.max} people.</p><textarea rows="3" readonly onclick="this.select()">${esc(r.url)}</textarea>`,[['Copy',()=>{navigator.clipboard.writeText(r.url).then(()=>toast('Copied'));}],['Done',()=>{closeM();TAB='links';go('community');},'light']]);}catch(e){toast(e.message,1);}}]]);
}
function compose(j){
  modal('Email the speaker community',`<div class="grid2"><label style="grid-column:1/-1">Send to<select id="cmA"><option value="members">Community members (${j.counts.members})</option><option value="all" selected>Members + past speakers we have an email for</option><option value="everyone">Every speaker with an email (incl. current edition)</option></select></label>
    <label style="grid-column:1/-1">Invite to a side event (optional)<select id="cmE"><option value="">—</option>${j.events.map(e=>`<option value="${esc(e.id)}">${esc(e.title)} · ${esc(fmt(String(e.starts_at).slice(0,10)))}</option>`).join('')}</select></label>
    <label style="grid-column:1/-1">Subject<input id="cmS" maxlength="180"></label>
    <label style="grid-column:1/-1">Message<textarea id="cmM" rows="9" placeholder="Hi {name},&#10;&#10;…"></textarea></label></div>
    <p class="gx-note">{name} becomes their first name. Blank line = new paragraph · **bold** · [text](https://link) · lines starting with “- ” become a list. Every email has a “Stop these emails” link, and people who switched emails off are skipped.</p><div id="cmPv"></div>`,
    [['Preview',async()=>{try{const r=await api('cmSend',{preview:true,audience:$('#cmA').value,event_id:$('#cmE').value,subject:$('#cmS').value,body:$('#cmM').value});
        $('#cmPv').innerHTML=`<p class="gx-note"><b>${r.count}</b> people will get this.</p><iframe style="width:100%;height:420px;border:1px solid #eee;border-radius:12px" sandbox></iframe>`;$('#cmPv iframe').srcdoc=r.html;}catch(e){toast(e.message,1);}},'light left'],
     ['Send',()=>{if(confirm('Send this email now?'))run(()=>api('cmSend',{audience:$('#cmA').value,event_id:$('#cmE').value,subject:$('#cmS').value,body:$('#cmM').value}),r=>`Sent to ${r.sent}`);}]]);
  $('#mBox').classList.add('wide');
  $('#cmE').onchange=()=>{const e=j.events.find(x=>x.id===$('#cmE').value);if(e&&!$('#cmS').value)$('#cmS').value='You’re invited: '+e.title;if(e&&!$('#cmM').value)$('#cmM').value=`Hi {name},\n\nAs one of our speakers, we would love to see you at **${e.title}**. Details and RSVP are below.\n\nWarm regards,\n\nTeam TEDxThaltej Youth`;};
}
/* preview data */
const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  if(!/^cm[A-Z]/.test(b.action))return prev?prev(b,me,D):undefined;
  if(b.action==='cmAdmin')return {ok:true,super:true,canEdit:true,counts:{members:14,pending:1,reachable:31},
    people:[{id:'S1',name:'Asha Rao',edition:'Edition 1 · 2025 · Kaleidoscope',email:'asha@example.com',status:'Member',joined_at:'2026-11-14',last_login:'2026-11-14',mail:true,google:true,phone:'+919876543210',offers:['Mentor this year’s speakers','Speak at a side event'],offer_note:'Free most weekends.'},
      {id:'S2',name:'Dev Shah',edition:'Edition 2 · 2026 · Echoes',email:'dev@old.example',claim_email:'dev@new.example',status:'Waiting for approval'},
      {id:'S4',name:'Kabir Mehta',edition:'Edition 2 · 2026 · Echoes',email:'kabir@example.com',status:'Not joined (email on file)',mail:true},
      {id:'S5',name:'Hemanshi Agrawal',edition:'Edition 1 · 2025 · Kaleidoscope',email:'',status:'Not joined'},
      {id:'SAL-1',name:'Mira Joshi',edition:'Salon speaker · TEDxThaltej Youth Salon: Slow · 2026',salon:true,side_event_id:'SE1',talk:'Clay and patience',email:'mira@example.com',status:'Member',public_on:true,mail:true},
      {id:'S9',name:'Riya Patel',edition:'Edition 3 · 2027 · The Zenith',email:'riya@example.com',status:'Speaker portal',current:true,mail:true}],
    feedback:[{id:'F1',name:'Asha Rao',kind:'A testimonial we can share',message:'Speaking at TEDxThaltej Youth changed how I talk about my work. The rehearsals were the best part.',publish_ok:true,status:'New',at:'2026-11-14'},
      {id:'F2',name:'Kabir Mehta',kind:'An idea or suggestion',about:'Side events',message:'Could past speakers mentor this year’s speakers? Happy to help.',status:'Seen',at:'2026-11-10'}],
    sides:[{id:'SE1',title:'TEDxThaltej Youth Salon: Slow',date:'2026-12-12'}],
    events:[{id:'SE1',title:'Speaker Mixer & Open Mic',starts_at:'2026-12-12T18:30',going:['Asha Rao','Kabir Mehta']}],offers:['Mentor this year’s speakers','Speak at a side event','Host or co-host a side event','Help curate talks or judge Ahmedabad Idea Search','Introduce sponsors or partners','Volunteer on event day','Run a workshop for students'],
    posts:[{id:'P1',title:'Speaker Mixer & Open Mic: save the date',body:'Our first evening for past speakers is on 12 December.',link:'https://tedxthaltejyouth.in/events/',link_label:'See the event',pinned:true,at:'2026-11-14'}],conf:{whatsapp:'https://chat.whatsapp.com/preview',whatsapp_note:'All past and present speakers.',approve_all:true},editions:[{id:'E1',label:'Edition 1 · 2025 · Kaleidoscope'},{id:'E2',label:'Edition 2 · 2026 · Echoes'}],
    links:[{id:'CML1',note:'WhatsApp group',created_at:'2026-11-14',uses:'9',max_uses:'60',expires:'2026-11-21',live:true}],history:[{subject:'You’re invited: Speaker Mixer',audience:'all',count:'29',sent_at:'2026-11-14'}]};
  if(b.action==='cmLinkCreate')return {ok:true,url:'https://tedxthaltejyouth.in/community/#join=1a2b3c…',expires:'2026-11-21T16:00',max:60};
  if(b.action==='cmSend'&&b.preview)return {ok:true,count:29,html:'<p style="font-family:sans-serif;padding:20px">Preview of the email…</p>'};
  return {ok:true,sent:29};
};
})();
