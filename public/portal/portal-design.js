/* Team Portal: Design Studio (requests, Canva, versions, approvals, brand kit, library), the Approvals inbox and Email the team.
   Loaded after portal-bodies.js. */
(function(){
const css=`
.ds-strip{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.ds-who{background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:8px 12px;font-size:13px;display:flex;gap:8px;align-items:center}
.ds-who b{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:20px}
.ds-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.ds-card{background:#fff;border:1.5px solid var(--n,#101B3D);border-radius:16px;padding:14px;box-shadow:3px 3px 0 var(--n,#101B3D);cursor:pointer;display:grid;gap:6px}
.ds-card.me{box-shadow:3px 3px 0 var(--red,#E62B1E)}.ds-card h4{font-size:15px;line-height:1.3}
.ds-card .m{font-size:12px;color:var(--mute);display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.ds-chain{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;font-weight:700}
.ds-chain span{padding:4px 10px;border-radius:99px;background:#eee;color:#666}.ds-chain span.ok{background:#e6f6ec;color:var(--ok)}.ds-chain span.now{background:var(--n,#101B3D);color:#fff}.ds-chain span.no{background:#fdeaea;color:var(--bad)}
.ds-ver{border:1px solid var(--line);border-radius:14px;padding:12px;margin:8px 0;display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:start}
.ds-ver .th{width:120px;height:120px;border-radius:10px;background:#f4f2ee;display:grid;place-items:center;overflow:hidden;font-size:11px;color:var(--mute);text-align:center}
.ds-ver .th img{width:100%;height:100%;object-fit:cover}
.ds-sw{display:inline-block;width:46px;height:46px;border-radius:12px;border:1.5px solid var(--n,#101B3D);vertical-align:middle}
.ds-bk{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.ds-bk .it{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px;display:grid;gap:6px;font-size:13px}
.ds-chk label{display:flex;gap:8px;align-items:flex-start;font-size:13px;padding:4px 0}
.ds-canva{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#F4F0FF;border-radius:12px;padding:10px 12px;font-size:13px}
.ds-canva b{color:#6B3FD8}
.b-Requested{background:#e8f0fe;color:#1a56db}.b-Assigned{background:#fff4e0;color:var(--warn)}.b-In.review{background:#101B3D;color:#fff}.b-Changes.requested{background:#fdeaea;color:var(--bad)}.b-Approved{background:#e6f6ec;color:var(--ok)}.b-Cancelled{background:#f1f1f1;color:#666}.b-Awaiting.approval{background:#101B3D;color:#fff}
.bc-aud{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px}
.bc-aud label{display:flex;gap:8px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 10px;font-size:13px}
.bc-aud label small{margin-left:auto;color:var(--mute)}
.bc-aud input,.ds-chk input{width:auto!important;flex:none;margin:2px 0 0}.bc-aud label span{flex:1;text-align:left}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

const at=id=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('money'),0,{id:'approvals',name:'Approvals',ico:'✔',grp:'Overview',always:true});
SECTIONS.splice(at('tasks'),0,{id:'design',name:'Design Studio',ico:'✎',grp:'Design',always:true});
SECTIONS.splice(at('admins')+1,0,{id:'broadcast',name:'Email the team',ico:'✉',grp:'Team',show:()=>ME&&ME.role==='super'});
const h=location.hash.slice(1);if(h&&SECTIONS.some(s=>s.id===h))CUR=h;

const hero=(t,p,r)=>`<div class="gx-hero"><div style="flex:1;min-width:240px"><h2>${t}</h2>${p?`<p>${p}</p>`:''}</div>${r||''}</div>`;
const fdt=s=>s?String(s).replace('T',' ').slice(0,16):'';
const toData=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
const dl=r=>{if(r.tooLarge){window.open(r.url,'_blank');return;}const a=document.createElement('a');a.href='data:'+r.type+';base64,'+r.base64;a.download=r.name;a.click();};
const chainHTML=(chain,approvals,status)=>{const ok=(approvals||[]).filter(a=>a.decision==='approve').map(a=>a.name);let now=false;
  return `<div class="ds-chain">${chain.map(n=>{const nm=typeof n==='string'?n:n.name;const done=ok.includes(nm);let c=done?'ok':'';if(!done&&!now&&['In review','Awaiting approval'].includes(status)){c='now';now=true;}return `<span class="${c}">${done?'✓ ':''}${esc(nm)}</span>`;}).join('→')}${status==='Changes requested'?'<span class="no">Changes requested</span>':''}</div>`;};
let DS=null;

/* ═════════════ DESIGN STUDIO ═════════════ */
VIEWS.design=async function(tab){
  DS=await api('dsBoot');let T=['board','mine','lib','brand'].includes(tab)?tab:(DS.team?'board':'mine'),q='';
  addBtn('+ Request a design',()=>newReq());
  searchBox('Search designs…',v=>{q=v;paint();});
  const paint=()=>{
    const tabs=(DS.team?[['board','Team board'],['mine','My requests']]:[['mine','My requests']]).concat([['lib','Library'],['brand','Brand kit']]);
    const rows=DS.rows.filter(r=>match(r,q));
    let body='';
    if(T==='board'){
      const open=rows.filter(r=>!['Approved','Cancelled'].includes(r.status));
      body=`${DS.designers.length?`<div class="ds-strip">${DS.designers.map(d=>`<div class="ds-who"><b>${d.open}</b>${esc(d.name)}</div>`).join('')}<div class="ds-who" style="border-style:dashed">open jobs per designer</div></div>`:''}
        ${['Requested','Assigned','In progress','In review','Changes requested'].map(s=>{const c=open.filter(r=>r.status===s);return c.length?`<div class="gx-sec" style="font-size:18px;margin:14px 0 8px">${s} · ${c.length}</div><div class="ds-grid">${c.map(card).join('')}</div>`:'';}).join('')||'<div class="panel"><div class="empty" style="padding:30px;text-align:center">No open requests.</div></div>'}`;
    } else if(T==='mine'){
      const m=rows.filter(r=>r.mine_req||r.mine_work||r.waiting_me);
      body=m.length?`<div class="ds-grid">${m.map(card).join('')}</div>`:`<div class="panel"><div class="empty" style="padding:30px;text-align:center">You haven’t asked for any designs yet. Tap <b>Request a design</b>.</div></div>`;
    } else if(T==='lib'){
      const L=DS.library.filter(r=>match(r,q));
      body=L.length?`<p class="gx-note" style="margin-bottom:10px">Every file here is the approved final. Use only these for posts, print and partners.</p><div class="ds-grid">${L.map(card).join('')}</div>`:'<div class="panel"><div class="empty" style="padding:30px;text-align:center">No approved designs yet.</div></div>';
    } else {
      const groups={};DS.brand.forEach(b=>(groups[b.kind]=groups[b.kind]||[]).push(b));
      body=`${DS.manager?`<div style="margin-bottom:10px"><button class="btn sm red" id="bkAdd">+ Add to brand kit</button></div>`:''}
        ${DS.brandKinds.filter(k=>k!=='Checklist').map(k=>groups[k]?`<div class="gx-sec" style="font-size:18px;margin:14px 0 8px">${k}s</div><div class="ds-bk">${groups[k].map(bkItem).join('')}</div>`:'').join('')}
        <div class="gx-sec" style="font-size:18px;margin:18px 0 8px">Brand checklist</div><div class="panel" style="padding:14px"><p class="gx-note" style="margin-bottom:6px">Designers tick every item before a version goes for approval.</p><ol style="margin-left:18px;font-size:14px;line-height:1.8">${DS.checks.map(c=>`<li>${esc(c)}</li>`).join('')}</ol>
        ${DS.manager?`<p class="gx-note" style="margin-top:8px">${groups.Checklist?'Edit items below.':'This is the default list. Add Checklist items to replace it.'}</p>${(groups.Checklist||[]).map(bkItem).join('')}`:''}</div>
        ${!DS.brand.length?'<p class="gx-note" style="margin-top:10px">The brand kit is empty. The design head can add logos, colours, fonts and Canva templates here.</p>':''}`;
    }
    $('#view').innerHTML=hero('Design Studio','Ask the design team for anything visual. Designers work in Canva, submit each version here, and it goes for approval: requester → design head → Organizer for public work. Only approved files go out.')+
      `<div class="tabsx" style="flex-wrap:wrap;margin-bottom:14px">${tabs.map(t=>`<button data-t="${t[0]}" class="${T===t[0]?'on':''}">${t[1]}</button>`).join('')}</div>`+body;
    $('#view').querySelectorAll('.tabsx [data-t]').forEach(b=>b.onclick=()=>{T=b.dataset.t;paint();});
    $('#view').querySelectorAll('.ds-card').forEach(c=>c.onclick=()=>openReq(c.dataset.id));
    $('#view').querySelectorAll('[data-bk]').forEach(b=>b.onclick=e=>{e.stopPropagation();const it=DS.brand.find(x=>x.id===b.dataset.bk);b.dataset.op==='dl'?api('dsFile',{brand:it.id}).then(dl).catch(e=>toast(e.message,1)):b.dataset.op==='del'?(confirm('Remove from the brand kit?')&&api('dsBrandDelete',{id:it.id}).then(()=>VIEWS.design('brand'))):bkEdit(it);});
    if($('#bkAdd'))$('#bkAdd').onclick=()=>bkEdit({kind:'Logo'});
  };
  paint();
};
function card(r){
  const over=r.deadline&&r.deadline<today()&&!['Approved','Cancelled'].includes(r.status);
  return `<div class="ds-card ${r.waiting_me?'me':''}" data-id="${esc(r.id)}"><div class="m"><span class="mono">${esc(r.id)}</span>${badge(r.status)}${r.public?'<span class="badge" style="background:#FFC83D;color:#101B3D">Public</span>':''}${r.waiting_me?'<span class="badge" style="background:#E62B1E;color:#fff">Your approval</span>':''}</div>
    <h4>${esc(r.title)}</h4><div class="m">${esc(r.kind)} · ${esc(r.size)}</div>
    <div class="m">${over?'⚠ ':''}Due ${fmt(r.deadline)} · ${badge(r.priority)}</div><div class="m">From ${esc(r.requested_by)}${r.assignee?' · 🎨 '+esc(r.assignee):' · <i>unassigned</i>'}</div></div>`;
}
function bkItem(b){
  return `<div class="it">${b.kind==='Colour'?`<div style="display:flex;gap:10px;align-items:center"><span class="ds-sw" style="background:${esc(b.value)}"></span><div><b>${esc(b.name)}</b><div class="mono">${esc(b.value)}</div></div></div>`:`<b>${esc(b.name)}</b>${b.value?`<div class="muted">${esc(b.value)}</div>`:''}`}
    ${b.note?`<div class="muted" style="font-size:12px">${esc(b.note)}</div>`:''}<div style="display:flex;gap:6px;flex-wrap:wrap">${b.link?`<a class="btn sm light" href="${esc(b.link)}" target="_blank" rel="noopener">${/canva/.test(b.link)?'Open in Canva':'Open'} ↗</a>`:''}${b.file_id?`<button class="btn sm light" data-bk="${esc(b.id)}" data-op="dl">⇩ Download</button>`:''}
    ${DS.manager?`<button class="btn sm light" data-bk="${esc(b.id)}" data-op="ed">Edit</button><button class="btn sm light" data-bk="${esc(b.id)}" data-op="del">✕</button>`:''}</div></div>`;
}
function bkEdit(b){
  modal(b.id?'Edit brand kit item':'Add to brand kit',`<div class="grid2"><label>Kind<select id="bkK">${DS.brandKinds.map(k=>`<option ${k===b.kind?'selected':''}>${k}</option>`).join('')}</select></label>
    <label>Name<input id="bkN" value="${esc(b.name||'')}" placeholder="e.g. Primary logo, TEDx Red, Anton"></label>
    <label>Value<input id="bkV" value="${esc(b.value||'')}" placeholder="Colour hex (#E62B1E) or font weight"></label>
    <label>Link<input id="bkL" value="${esc(b.link||'')}" placeholder="Canva template or Drive link"></label>
    <label style="grid-column:1/-1">Note<input id="bkO" value="${esc(b.note||'')}" placeholder="When to use it"></label>
    <label style="grid-column:1/-1">File (PNG, JPG or PDF, optional)<input id="bkF" type="file" accept="image/png,image/jpeg,image/webp,application/pdf"></label></div>`,
    [['Save',async()=>{const f=$('#bkF').files[0];await api('dsBrandSave',{id:b.id||'',kind:$('#bkK').value,name:$('#bkN').value,value:$('#bkV').value,link:$('#bkL').value,note:$('#bkO').value,dataUrl:f?await toData(f):''});toast('Saved');closeM();VIEWS.design('brand');}]]);
}
function newReq(){
  const k=DS?DS.kinds:[['Instagram post','1080 × 1350 px']];
  modal('Request a design',`<div class="grid2"><label style="grid-column:1/-1">What do you need?<input id="nrT" maxlength="140" placeholder="e.g. Speaker reveal post for Asha Rao"></label>
    <label>Kind<select id="nrK">${k.map(x=>`<option value="${esc(x[0])}" data-s="${esc(x[1])}">${esc(x[0])} · ${esc(x[1])}</option>`).join('')}</select></label>
    <label>Size (if different)<input id="nrS" placeholder="Leave empty to use the standard size"></label>
    <label>Needed by<input id="nrD" type="date" min="${today()}"></label>
    <label>Priority<select id="nrP"><option>Low</option><option selected>Medium</option><option>High</option><option>Urgent</option></select></label>
    <label style="grid-column:1/-1">What is it for, and where will it be used?<textarea id="nrU" rows="2" placeholder="Instagram feed on 20 Nov; to announce our third speaker"></textarea></label>
    <label style="grid-column:1/-1">Exact text to put on it<textarea id="nrC" rows="3" placeholder="Headline, names, date, venue… exactly as it should appear"></textarea></label>
    <label style="grid-column:1/-1">References or files (links)<input id="nrR" placeholder="Photos, past posts you liked, logos (Drive links)"></label>
    <label class="chk" style="grid-column:1/-1"><input type="checkbox" id="nrPub"> This will be public (social media, print, partners, or uses the TEDx name). The Organizer approves it too.</label></div>`,
    [['Send to design team',async()=>{const r=await api('dsRequest',{title:$('#nrT').value,kind:$('#nrK').value,size:$('#nrS').value,deadline:$('#nrD').value,priority:$('#nrP').value,purpose:$('#nrU').value,copy_text:$('#nrC').value,refs:$('#nrR').value,public:$('#nrPub').checked});toast('Request sent · '+r.id);closeM();go('design');}]]);
}
async function openReq(id){
  const j=await api('dsGet',{id}),r=j.request;
  const waiting=r.status==='In review'&&(r.next===ME.email||ME.role==='super');
  const canWork=r.mine_work||j.manager;
  const vers=j.versions.map(v=>`<div class="ds-ver"><div class="th" data-th="${esc(v.id)}">${v.has_file?(/pdf/.test(v.file_type)?'PDF':'Loading…'):'Drive link'}</div><div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b>Version ${esc(v.v)}</b>${badge(v.status)}<span class="muted" style="font-size:12px">${esc(v.by)} · ${esc(fdt(v.created_at))}</span></div>
    ${v.note?`<p style="font-size:13px;margin:6px 0">${esc(v.note)}</p>`:''}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${v.has_file?`<button class="btn sm light" data-dv="${esc(v.id)}">⇩ Download</button>`:''}${v.link?`<a class="btn sm light" href="${esc(v.link)}" target="_blank" rel="noopener">Open file ↗</a>`:''}${v.canva_view?`<a class="btn sm light" href="${esc(v.canva_view)}" target="_blank" rel="noopener">View in Canva ↗</a>`:''}</div></div></div>`).join('')||'<div class="bd-empty" style="font-size:13px;color:var(--mute)">No versions yet.</div>';
  const msgs=j.messages.map(m=>m.from==='system'?`<div style="font-size:12px;color:var(--mute);padding:3px 0">${esc(fdt(m.at))} · ${esc(m.body)}</div>`:`<div class="bd-msg ${m.mine?'me':''}" style="border-radius:12px;padding:8px 10px;margin:6px 0;background:${m.mine?'#e8f0fe':'#f4f2ee'};font-size:14px"><small style="display:block;font-size:11px;font-weight:700;color:var(--mute)">${esc(m.from)} · ${esc(fdt(m.at))}</small>${esc(m.body)}</div>`).join('');
  const body=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${badge(r.status)}<span class="badge">${esc(r.kind)} · ${esc(r.size)}</span>${r.public?'<span class="badge" style="background:#FFC83D;color:#101B3D">Public</span>':''}${badge(r.priority)}</div>
    <dl class="kv"><dt>Needed by</dt><dd>${fmt(r.deadline)}</dd><dt>Asked by</dt><dd>${esc(r.requested_by_name)}</dd><dt>Designer</dt><dd>${esc(r.assignee_name||'Not assigned yet')}</dd><dt>For</dt><dd>${esc(r.purpose)}</dd>${r.refs?`<dt>References</dt><dd>${esc(r.refs)}</dd>`:''}</dl>
    ${r.copy_text?`<b style="font-size:12px">Text to use</b><div class="log" style="white-space:pre-wrap">${esc(r.copy_text)}</div>`:''}
    ${j.team||r.canva_view?`<div class="ds-canva"><b>Canva</b>${r.canva_edit?`<a href="${esc(r.canva_edit)}" target="_blank" rel="noopener">Edit design ↗</a>`:''}${r.canva_view?`<a href="${esc(r.canva_view)}" target="_blank" rel="noopener">View ↗</a>`:''}${!r.canva_edit&&!r.canva_view?'<span class="muted">No Canva link yet</span>':''}${canWork?'<button class="btn sm light" id="dsCv" style="margin-left:auto">Set links</button>':''}</div>`:''}
    ${r.chain.length?`<b style="font-size:12px;display:block;margin-top:10px">Approval</b>${chainHTML(r.chain,r.approvals,r.status)}`:''}
    <b style="font-size:12px;display:block;margin-top:10px">Versions</b>${vers}
    <b style="font-size:12px;display:block;margin-top:10px">Comments</b>${msgs||'<div style="font-size:13px;color:var(--mute)">No comments yet.</div>'}
    <div style="display:flex;gap:6px;margin-top:6px"><input id="dsM" placeholder="Write a comment" style="flex:1"><button class="btn sm light" id="dsMB">Post</button></div>`;
  const acts=[];
  const closed=['Approved','Cancelled'].includes(r.status);
  if((r.mine_req||j.manager)&&!closed)acts.push(['Cancel request',async()=>{if(!confirm('Cancel this design request?'))return;await api('dsUpdate',{id,status:'Cancelled'});toast('Cancelled');closeM();VIEWS.design();},'bad left']);
  if(j.team&&!r.assignee&&!closed)acts.push(['🎨 I’ll take it',async()=>{await api('dsAssign',{id});toast('It’s yours');openReq(id);}]);
  if(j.manager&&!closed)acts.push(['Assign…',()=>assign(r),'light']);
  if(canWork&&['Assigned','In progress','Changes requested'].includes(r.status))acts.push(['Submit a version',()=>submit(r,j.checks)]);
  if(waiting){acts.push(['Ask for changes',()=>decide(r,'changes'),'light']);acts.push(['✓ Approve',()=>decide(r,'approve'),'ok']);}
  modal(r.id+' · '+r.title,body,acts);$('#mBox').classList.add('wide');
  $('#dsMB').onclick=async()=>{try{await api('dsMsg',{id,body:$('#dsM').value});openReq(id);}catch(e){toast(e.message,1);}};
  if($('#dsCv'))$('#dsCv').onclick=()=>modal('Canva links',`<p class="gx-note">In Canva: <b>Share → Collaboration link → Anyone with the link can edit</b> (only designers see this one). For reviewers: <b>Share → View-only link</b>.</p>
    <label>Edit link (design team only)<input id="cvE" value="${esc(r.canva_edit||'')}" placeholder="https://www.canva.com/design/…/edit"></label><label>View-only link<input id="cvV" value="${esc(r.canva_view||'')}" placeholder="https://www.canva.com/design/…/view"></label>`,
    [['Back',()=>openReq(id),'light'],['Save',async()=>{await api('dsUpdate',{id,canva_edit:$('#cvE').value,canva_view:$('#cvV').value});toast('Saved');openReq(id);}]]);
  $('#mBox').querySelectorAll('[data-dv]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{dl(await api('dsFile',{version:b.dataset.dv}));}catch(e){toast(e.message,1);}b.disabled=false;});
  for(const v of j.versions.filter(v=>v.has_file&&!/pdf/.test(v.file_type)).slice(0,3)){api('dsFile',{version:v.id}).then(f=>{const el=$(`[data-th="${v.id}"]`);if(el&&f.base64)el.innerHTML=`<img alt="Version ${esc(v.v)}" src="data:${f.type};base64,${f.base64}">`;}).catch(()=>{});}
}
function assign(r){
  modal('Assign '+r.id,`<label>Designer<select id="asE">${DS.designers.map(d=>`<option value="${esc(d.email)}" ${d.email===r.assignee?'selected':''}>${esc(d.name)} · ${d.open} open</option>`).join('')}</select></label>`,
    [['Back',()=>openReq(r.id),'light'],['Assign',async()=>{await api('dsAssign',{id:r.id,email:$('#asE').value});toast('Assigned & emailed');openReq(r.id);}]]);
}
function submit(r,checks){
  modal('Submit a version · '+r.title,`<p class="gx-note">Export from Canva (<b>Share → Download</b>, PNG or PDF) and attach it. The attached file is the locked copy that gets approved.</p>
    <div class="grid2"><label style="grid-column:1/-1">Exported file (PNG, JPG or PDF, up to 8 MB)<input id="svF" type="file" accept="image/png,image/jpeg,image/webp,application/pdf"></label>
    <label style="grid-column:1/-1">…or a Google Drive link to it<input id="svL" placeholder="https://drive.google.com/…"></label>
    <label style="grid-column:1/-1">Canva view-only link<input id="svC" value="${esc(r.canva_view||'')}" placeholder="https://www.canva.com/design/…/view"></label>
    <label style="grid-column:1/-1">Note for reviewers<textarea id="svN" rows="2" placeholder="What changed in this version"></textarea></label></div>
    <b style="font-size:12px">Brand checklist</b><div class="ds-chk">${checks.map((c,i)=>`<label><input type="checkbox" class="svk" value="${i}"> ${esc(c)}</label>`).join('')}</div>`,
    [['Back',()=>openReq(r.id),'light'],['Send for approval',async()=>{const f=$('#svF').files[0];const ck=[...$('#mBox').querySelectorAll('.svk:checked')].map(x=>+x.value);
      const res=await api('dsSubmit',{id:r.id,dataUrl:f?await toData(f):'',name:f?f.name:'',link:$('#svL').value,canva_view:$('#svC').value,note:$('#svN').value,checks:ck});toast('Version '+res.v+' sent for approval');openReq(r.id);}]]);
}
function decide(r,d){
  modal((d==='approve'?'Approve ':'Ask for changes · ')+r.title,`<label>${d==='approve'?'Note (optional)':'What needs to change?'}<textarea id="dcN" rows="4"></textarea></label>`,
    [['Back',()=>openReq(r.id),'light'],[d==='approve'?'✓ Approve':'Send back',async()=>{const x=await api('dsDecide',{id:r.id,decision:d,note:$('#dcN').value});toast(x.status==='Approved'?'Approved. The requester has been told 🎉':d==='approve'?'Approved. Sent to the next approver':'Sent back to the designer');openReq(r.id);}]]);
}

/* ═════════════ APPROVALS INBOX ═════════════ */
VIEWS.approvals=async function(){
  const j=await api('approvals');
  const mine=j.rows.filter(x=>x.mine),other=j.rows.filter(x=>!x.mine);
  const item=x=>`<div class="ds-card ${x.mine?'me':''}" data-ty="${x.type}" data-id="${esc(x.id)}"><div class="m"><span class="badge" style="background:${x.type==='design'?'#F4F0FF;color:#6B3FD8':'#e8f0fe;color:#1a56db'}">${x.type==='design'?'Design':'Task'}</span><span class="mono">${esc(x.id)}</span>${x.public?'<span class="badge" style="background:#FFC83D;color:#101B3D">Public</span>':''}</div>
    <h4>${esc(x.title)}</h4><div class="m">by ${esc(x.who||'—')}${x.due?' · due '+fmt(x.due):''}</div>${chainHTML(x.chain,x.approvals,x.type==='design'?'In review':'Awaiting approval')}</div>`;
  $('#view').innerHTML=hero('Approvals','Everything waiting for your sign-off: designs and tasks. Approve, or ask for changes with a note. The next person in the chain is told automatically.')+
    (mine.length?`<div class="ds-grid">${mine.map(item).join('')}</div>`:'<div class="panel"><div class="empty" style="padding:30px;text-align:center">Nothing is waiting for you. ✓</div></div>')+
    (other.length?`<div class="gx-sec" style="font-size:18px;margin:18px 0 8px">Waiting on others · you can give final approval as Organizer</div><div class="ds-grid">${other.map(item).join('')}</div>`:'');
  $('#view').querySelectorAll('.ds-card').forEach(c=>c.onclick=async()=>{const x=j.rows.find(y=>y.id===c.dataset.id);
    if(x.type==='design'){if(!DS)DS=await api('dsBoot');return openReq(x.id);}
    modal('Approve: '+x.title,`${chainHTML(x.chain,x.approvals,'Awaiting approval')}<dl class="kv"><dt>Done by</dt><dd>${esc(x.who)}</dd>${x.due?`<dt>Due</dt><dd>${fmt(x.due)}</dd>`:''}</dl>${x.description?`<div class="log" style="white-space:pre-wrap">${esc(x.description)}</div>`:''}
      ${x.proof.length?`<b style="font-size:12px">Work submitted</b><ul style="margin:4px 0 8px 18px">${x.proof.map(p=>`<li><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title||p.url)}</a></li>`).join('')}</ul>`:''}
      <label>Note (needed if you ask for changes)<textarea id="tpN" rows="3"></textarea></label>`,
      [['Ask for changes',async()=>{await api('taskApprove',{id:x.id,decision:'changes',note:$('#tpN').value});toast('Sent back');closeM();VIEWS.approvals();},'light'],
       ['✓ Approve',async()=>{const r=await api('taskApprove',{id:x.id,decision:'approve',note:$('#tpN').value});toast(r.status==='Done'?'Approved. Task done 🎉':'Approved. Sent to the next approver');closeM();VIEWS.approvals();},'ok']]);});
};

/* ═════════════ EMAIL THE TEAM (Organizer) ═════════════ */
VIEWS.broadcast=async function(){
  const j=await api('bcBoot');
  const prov={zoho:'Zoho Mail',gmail:'Gmail',zepto:'ZeptoMail'}[j.provider]||j.provider;
  $('#view').innerHTML=hero('Email the team','Send a real email to everyone’s inbox, or to chosen teams and offices. It goes out through '+esc(prov)+'. Replies come back to you.')+
    `<div class="two"><div class="panel" style="padding:18px;display:grid;gap:12px">
      <div><b style="font-size:12px">Send to</b><div class="bc-aud" style="margin-top:6px">${j.audiences.map(a=>`<label><input type="checkbox" class="bcA" value="${esc(a.id)}"><span>${esc(a.name)}</span><small>${a.count}</small></label>`).join('')}</div></div>
      <label>Subject<input id="bcS" maxlength="200" placeholder="e.g. Team meet this Sunday + Zenith update"></label>
      <label>Message<textarea id="bcB" rows="10" placeholder="Hi {name},&#10;&#10;Write your message here."></textarea></label>
      <p class="gx-note">{name} becomes each person’s first name. Blank line = new paragraph, **bold**, [text](https://link), and lines starting with “- ” become a list.</p>
      <label class="chk"><input type="checkbox" id="bcTM" checked> Also post it in Team Mail</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn light" id="bcP">Preview</button><button class="btn red" id="bcGo">Send email</button><span class="gx-note" id="bcN" style="align-self:center"></span></div>
    </div><div class="panel" style="padding:18px"><h3 style="margin-bottom:8px">Sending today</h3><p style="font-size:14px">Through <b>${esc(prov)}</b>, about <b>${Math.max(0,j.room)}</b> more emails can go today. The rest wait in the email queue and go out automatically in the next hours (see Admin Health).</p>
      <h3 style="margin:16px 0 8px">Sent before</h3>${j.history.length?tableHTML(j.history,[['created_at','When',fdt],['subject','Subject',v=>`<b>${esc(v)}</b>`],['recipients','To',v=>esc(v)+' people'],['queued','Queued',v=>+v?esc(v):'—']]):'<div class="muted" style="font-size:13px">Nothing yet.</div>'}</div></div>`;
  const aud=()=>[...$('#view').querySelectorAll('.bcA:checked')].map(c=>c.value);
  const count=()=>{const a=aud();$('#bcN').textContent=a.length?'':'Choose who should get it.';};
  $('#view').querySelectorAll('.bcA').forEach(c=>c.onchange=count);
  $('#bcP').onclick=async()=>{const r=await api('bcPreview',{audience:aud(),subject:$('#bcS').value,body:$('#bcB').value});
    modal('Preview · '+r.recipients+' people',`<iframe sandbox="" style="width:100%;height:60vh;border:1px solid var(--line);border-radius:12px;background:#fff" srcdoc="${esc(r.html)}"></iframe>`,[]);$('#mBox').classList.add('wide');};
  $('#bcGo').onclick=async function(){const a=aud();if(!a.length)return toast('Choose who should get it',1);
    if(!confirm('Send this email now?'))return;this.disabled=true;
    try{const r=await api('bcSend',{audience:a,subject:$('#bcS').value,body:$('#bcB').value,team_mail:$('#bcTM').checked});toast(`Sent to ${r.sent}${r.queued?' · '+r.queued+' queued for later':''}`);VIEWS.broadcast();}catch(e){toast(e.message,1);this.disabled=false;}};
};

/* ═════════════ PREVIEW DATA ═════════════ */
const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  const a=b.action;
  if(!D._ds){D._ds=1;
    D.ds=[{id:'DS-2026-0003',title:'Speaker reveal: Asha Rao',kind:'Instagram post',size:'1080 × 1350 px',deadline:'2026-11-20',priority:'High',public:true,status:'In review',requested_by:'Kalash',mine_req:false,assignee:'Sashwat',mine_work:false,waiting_me:true,purpose:'Instagram feed on 20 Nov, third speaker reveal',copy_text:'Meet our third speaker\nASHA RAO\nScience teacher · Maps of the unseen',refs:'Headshot in Drive',canva_edit:'https://www.canva.com/design/DAF1/edit',canva_view:'https://www.canva.com/design/DAF1/view',created_at:'2026-11-10'},
      {id:'DS-2026-0002',title:'Volunteer call poster',kind:'Poster A3',size:'297 × 420 mm',deadline:'2026-11-25',priority:'Medium',public:true,status:'In progress',requested_by:'Fenil Pritesh Shah',mine_req:true,assignee:'Riya',purpose:'Print for school notice boards',created_at:'2026-11-09'},
      {id:'DS-2026-0004',title:'Zenith countdown story',kind:'Instagram story / reel cover',size:'1080 × 1920 px',deadline:'2026-11-18',priority:'Urgent',public:true,status:'Requested',requested_by:'Kalash',assignee:'',purpose:'Countdown series',created_at:'2026-11-12'},
      {id:'DS-2026-0001',title:'Team meet slide deck cover',kind:'Presentation',size:'1920 × 1080 px',deadline:'2026-11-08',priority:'Low',public:false,status:'Approved',requested_by:'Hirva',assignee:'Sashwat',final:true,purpose:'Internal',created_at:'2026-11-02'}];
    D.brand=[{id:'BK1',kind:'Logo',name:'TEDxThaltej Youth: primary (black)',note:'Use on light backgrounds',link:'https://drive.google.com/x',file_id:'f1'},{id:'BK2',kind:'Logo',name:'TEDxThaltej Youth: white',note:'Use on navy or photos',file_id:'f2'},
      {id:'BK3',kind:'Colour',name:'TEDx Red',value:'#E62B1E'},{id:'BK4',kind:'Colour',name:'Navy',value:'#101B3D'},{id:'BK5',kind:'Colour',name:'Yellow',value:'#FFC83D'},{id:'BK6',kind:'Colour',name:'Cream',value:'#FFF4E2'},
      {id:'BK7',kind:'Font',name:'Anton',value:'Headlines, uppercase'},{id:'BK8',kind:'Font',name:'Inter',value:'Body text, 400 / 700'},{id:'BK9',kind:'Template',name:'Speaker card',link:'https://www.canva.com/design/T1/view',note:'Duplicate, never edit the master'}];
    D.tasks.push({id:'TS-3',title:'Press note for Zenith launch',assigned_to:'member1@example.com',assigned_by:'kalash@example.com',priority:'High',due_date:'2026-11-16',status:'Awaiting approval',approvers:'demo@tedxthaltejyouth.in',approvals_json:'[]',comments:'',proof_json:JSON.stringify([{title:'Draft',url:'https://docs.google.com/document/d/x'}]),created_at:'2026-11-11'});}
  if(a==='dsBoot')return {ok:true,team:true,manager:true,kinds:[['Instagram post','1080 × 1350 px'],['Instagram story / reel cover','1080 × 1920 px'],['Poster A3','297 × 420 mm'],['Speaker card','1080 × 1350 px'],['Presentation','1920 × 1080 px'],['Other','custom']],
    statuses:[],brandKinds:['Logo','Colour','Font','Template','Checklist','Guide'],designers:[{email:'s@x',name:'Sashwat',open:2},{email:'r@x',name:'Riya',open:1},{email:'m@x',name:'Mehul',open:0}],
    rows:D.ds,library:D.ds.filter(r=>r.status==='Approved'),brand:D.brand,checks:['The TEDxThaltej Youth logo is the official file, not redrawn or recoloured','The red TEDx logo is not stretched, rotated or changed in any way','“x = independently organized TED event” is shown where the logo is used publicly','Colours are from the brand palette (cream, navy, red, yellow)','Fonts are Anton and Inter','Names, titles, dates and spellings are checked','Partner logos are the latest versions and placed as agreed']};
  if(a==='dsGet'){const r=D.ds.find(x=>x.id===b.id);return {ok:true,team:true,manager:true,checks:MOCK_PLUS({action:'dsBoot'},me,D).checks,
    request:Object.assign({},r,{requested_by_name:r.requested_by,assignee_name:r.assignee,next:r.waiting_me?me.email:'',chain:r.status==='In review'?[{name:'Kalash'},{name:'Sashwat (head)'},{name:'Fenil Pritesh Shah'}]:[],approvals:r.status==='In review'?[{name:'Kalash',decision:'approve'},{name:'Sashwat (head)',decision:'approve'}]:[]}),
    versions:r.status==='In review'?[{id:'DV2',v:'2',has_file:false,link:'https://drive.google.com/file/d/x',canva_view:r.canva_view,note:'Bigger name, moved the logo to the top left',by:'Sashwat',status:'In review',created_at:'2026-11-12T18:20'},{id:'DV1',v:'1',has_file:false,link:'https://drive.google.com/file/d/y',by:'Sashwat',status:'Changes requested',created_at:'2026-11-11T16:00'}]:[],
    messages:r.status==='In review'?[{from:'system',body:'Sashwat: submitted version 1 for approval',at:'2026-11-11T16:00'},{from:'Kalash',body:'Can her name be bigger? It gets lost on mobile.',at:'2026-11-11T17:10'},{from:'system',body:'Sashwat: submitted version 2 for approval',at:'2026-11-12T18:20'}]:[]};}
  if(a==='dsRequest'){D.ds.unshift({id:'DS-2026-000'+(D.ds.length+1),title:b.title,kind:b.kind,size:b.size||'1080 × 1350 px',deadline:b.deadline,priority:b.priority,public:b.public,status:'Requested',requested_by:me.name,mine_req:true,assignee:'',purpose:b.purpose,created_at:new Date().toISOString()});return {ok:true,id:D.ds[0].id};}
  if(['dsAssign','dsUpdate','dsMsg','dsBrandSave','dsBrandDelete'].includes(a))return {ok:true};
  if(a==='dsDecide'){const r=D.ds.find(x=>x.id===b.id);r.status=b.decision==='approve'?'Approved':'Changes requested';r.waiting_me=false;return {ok:true,status:r.status};}
  if(a==='dsSubmit')return {ok:true,v:3};
  if(a==='dsFile')return {ok:false,error:'Not in preview'};
  if(a==='approvals')return {ok:true,rows:D.ds.filter(r=>r.status==='In review').map(r=>({type:'design',id:r.id,title:r.title,who:r.assignee,due:r.deadline,public:r.public,chain:['Kalash','Sashwat (head)','Fenil Pritesh Shah'],approvals:[{name:'Kalash',decision:'approve'},{name:'Sashwat (head)',decision:'approve'}],mine:true}))
    .concat(D.tasks.filter(t=>t.status==='Awaiting approval').map(t=>({type:'task',id:t.id,title:t.title,who:'Sample Member',due:t.due_date,proof:JSON.parse(t.proof_json||'[]'),chain:['Fenil Pritesh Shah'],approvals:[],mine:true,description:'One-page note for the launch.'})))};
  if(a==='taskApprove'){const t=D.tasks.find(x=>x.id===b.id);t.status=b.decision==='approve'?'Done':'In progress';return {ok:true,status:t.status};}
  if(a==='bcBoot')return {ok:true,provider:'zoho',room:142,audiences:[{id:'all',name:'Everyone on the team',count:24},{id:'core',name:'Core Team (heads)',count:8},{id:'council',name:'Council members',count:9},{id:'advisors',name:'Senior Advisors',count:2},{id:'idc',name:'Internal Disciplinary Committee',count:6}].concat(D.departments.map(d=>({id:'dept:'+(d.id||d[0]),name:d.name||d[1],count:3}))),
    history:[{created_at:'2026-11-08T19:02',subject:'Zenith: theme reveal and next steps',recipients:'24',queued:'0'}]};
  if(a==='bcPreview')return {ok:true,recipients:24,html:'<div style="font-family:Inter,sans-serif;padding:24px;background:#FFF4E2"><div style="background:#fff;border-radius:16px;padding:24px"><h2 style="font-family:Anton,Impact,sans-serif">'+esc(b.subject||'Subject')+'</h2>'+String(b.body||'').split(/\n{2,}/).map(p=>'<p>'+esc(p).replace('{name}','Aarav')+'</p>').join('')+'</div></div>'};
  if(a==='bcSend')return {ok:true,sent:24,queued:0};
  return prev?prev(b,me,D):null;
};
})();
