/* Team Portal: Side events, News, speaker Rehearsals. Loaded after portal-plus.js. */
(function(){
const css=`
.evg{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.evc{background:#fff;border:1.5px solid var(--n);border-radius:20px;overflow:hidden;box-shadow:5px 5px 0 var(--n);display:flex;flex-direction:column}
.evc .evim{height:140px;background:linear-gradient(135deg,#FFC83D,#FF4F8B) center/cover;border-bottom:1.5px solid var(--n);position:relative}
.evc .evim span{position:absolute;left:10px;top:10px}
.evc .tx{padding:14px 16px;display:grid;gap:8px;flex:1}
.evc h4{font-size:17px;line-height:1.25}
.evc .nums{display:flex;gap:14px;font-size:13px;color:var(--mute)}.evc .nums b{color:var(--ink);font-size:16px;display:block}
.evc .acts{display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 14px}
.b-upcoming{background:#e8f0fe;color:#1a56db}.b-live{background:var(--red);color:#fff}.b-past{background:#f1f1f1;color:#666}.b-deleted{background:#111;color:#fff}
.b-Published{background:#e6f6ec;color:var(--ok)}.b-Draft{background:#fff4e0;color:var(--warn)}
.b-Scheduled{background:#e8f0fe;color:#1a56db}.b-Missed{background:#fdeaea;color:var(--bad)}.b-Confirmed{background:#e6f6ec;color:var(--ok)}.b-Needs{background:#fff4e0;color:var(--warn)}
.agr{display:grid;grid-template-columns:110px 1fr 1.4fr 34px;gap:6px;margin-bottom:6px}
.agr button{border:0;background:#f4f2ee;border-radius:8px;cursor:pointer}
.npsbig{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.npsbig .n{font-family:Anton,Impact,sans-serif;font-size:64px;line-height:1}
.npsbar{display:flex;height:14px;border-radius:99px;overflow:hidden;min-width:220px;flex:1;background:#eee}
.npsbar i{display:block;height:100%}
.copyrow{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start}
.copyrow textarea,.copyrow input{font-family:ui-monospace,Menlo,monospace;font-size:12.5px}
.bnprev{height:120px;border-radius:12px;border:1px solid var(--line);background:#f6f3ec center/cover;display:grid;place-items:center;color:var(--mute);font-size:13px}
.mdprev{border:1px solid var(--line);border-radius:12px;padding:16px 20px;max-height:420px;overflow:auto;font-family:Georgia,serif;font-size:16px;line-height:1.65}
.mdprev h2{font-family:Anton,Impact,sans-serif;font-weight:400;text-transform:uppercase;margin:14px 0 6px}.mdprev p{margin:0 0 10px}.mdprev blockquote{border-left:4px solid var(--red);padding-left:12px;font-style:italic;margin:10px 0}.mdprev img{max-width:100%;border-radius:10px}.mdprev ul,.mdprev ol{margin:0 0 10px 20px}
.rh{border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:grid;gap:6px;background:#fff}
.rh .top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* sections */
const at=id=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('editions'),0,{id:'events',name:'Side events',ico:'◇',grp:'Website'},{id:'news',name:'News',ico:'▤',grp:'Website'});
const h=location.hash.slice(1);if(h&&SECTIONS.some(s=>s.id===h))CUR=h;

const copy=(t,label)=>{try{navigator.clipboard.writeText(t);toast((label||'Copied')+' ✓');}catch(e){prompt('Copy this:',t);}};
const fmtDT=s=>s?new Date(s+(String(s).length===16?':00':'')).toLocaleString('en-IN',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'';
const fileToDataUrl=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
async function shrink(file,max){ // resize big photos in the browser before upload
  const url=await fileToDataUrl(file);if(file.size<900000||!/jpe?g|png|webp/.test(file.type))return url;
  const img=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=url;});
  const k=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.86);
}
function uploader(btn,input,preview){
  btn.onclick=()=>{const f=document.createElement('input');f.type='file';f.accept='image/png,image/jpeg,image/webp,image/gif';
    f.onchange=async()=>{const file=f.files[0];if(!file)return;btn.disabled=true;btn.textContent='Uploading…';
      try{const dataUrl=await shrink(file,2000);const r=await api('upload',{name:file.name,dataUrl});input.value=r.url;input.dispatchEvent(new Event('input'));toast('Image uploaded');}
      catch(e){toast(e.message,1);}btn.disabled=false;btn.textContent='⇪ Upload image';};f.click();};
  const upd=()=>{if(preview){preview.style.backgroundImage=input.value?`url('${input.value.replace(/'/g,'%27')}')`:'';preview.textContent=input.value?'':'No image yet';}};
  input.addEventListener('input',upd);upd();
}

/* ───────── SIDE EVENTS ───────── */
VIEWS.events=async function(){
  const j=await api('evList');
  $('#tools').innerHTML=`<a class="btn light" href="/events/" target="_blank" rel="noopener">↗ Events page</a><button class="btn red" id="evNew">＋ New side event</button>`;
  $('#evNew').onclick=()=>evEdit(null,j);
  const stateOf=e=>e.purged_at?'deleted':e.state;
  $('#view').innerHTML=`<p class="muted" style="margin-bottom:14px">Registrations and written feedback are deleted ${j.keepDays} days after each event ends. The NPS score is kept.</p>
    ${j.rows.length?`<div class="evg">${j.rows.map(e=>`<div class="evc"><div class="evim" style="${e.banner_url?`background-image:url('${esc(e.banner_url)}')`:''}"><span>${badge(stateOf(e)==='deleted'?'deleted':stateOf(e))}</span></div>
      <div class="tx"><h4>${esc(e.title)}</h4><div class="muted" style="font-size:13px">${esc(fmtDT(e.starts_at))} · ${esc(e.venue||'Venue TBA')}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${truthy(e.published)?badge('Published'):badge('Draft')}<span class="badge">${e.reg_mode==='site'?'Registration on site':e.reg_mode==='link'?'Outside link':'No registration'}</span></div>
      <div class="nums"><div><b>${e.purged_at?'—':e.regs}</b>registered</div><div><b>${e.nps_responses||0}</b>feedback</div><div><b>${e.nps===''||e.nps==null?'—':esc(e.nps)}</b>NPS</div></div>
      <div class="muted" style="font-size:12px">${e.purged_at?'Personal data deleted on '+esc(String(e.purged_at).slice(0,10)):'Data deleted on '+esc(e.purge_on)}</div></div>
      <div class="acts"><button class="btn sm light" data-a="edit" data-id="${e.id}">Edit</button>${e.reg_mode==='site'&&!e.purged_at?`<button class="btn sm light" data-a="regs" data-id="${e.id}">Registrations</button>`:''}<button class="btn sm light" data-a="fb" data-id="${e.id}">Feedback & NPS</button><a class="btn sm light" href="/events/?e=${encodeURIComponent(e.slug)}" target="_blank" rel="noopener">View ↗</a></div></div>`).join('')}</div>`
    :'<div class="panel"><div class="empty">No side events yet. Create one to give it its own page with registration and an agenda.</div></div>'}
    ${j.log.length?`<div class="panel" style="margin-top:22px"><h3>NPS history (kept after data is deleted)</h3><div class="scroll"><table class="tbl"><thead><tr><th>Event</th><th>Date</th><th>Responses</th><th>Promoters</th><th>Passives</th><th>Detractors</th><th>NPS</th><th>Average</th></tr></thead><tbody>
      ${j.log.map(l=>`<tr><td><b>${esc(l.title)}</b></td><td>${fmt(l.event_date)}</td><td>${esc(l.responses)}</td><td>${esc(l.promoters)}</td><td>${esc(l.passives)}</td><td>${esc(l.detractors)}</td><td><b>${esc(l.nps)}</b></td><td>${esc(l.avg)}/10</td></tr>`).join('')}</tbody></table></div></div>`:''}`;
  $('#view').onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const ev=j.rows.find(x=>x.id===b.dataset.id);
    if(b.dataset.a==='edit')evEdit(ev,j);if(b.dataset.a==='regs')evRegs(ev);if(b.dataset.a==='fb')evFeedback(ev);};
};
function evEdit(e,j){
  e=e||{reg_mode:'site',reg_open:'TRUE',published:'TRUE',agenda:[],extra_fields:''};
  const ex=String(e.extra_fields||'').split(',');
  modal(e.id?'Edit side event':'New side event',`<div class="grid2">
      <label style="grid-column:1/-1">Title<input id="eT" value="${esc(e.title||'')}" maxlength="140"></label>
      <label style="grid-column:1/-1">Subtitle <span class="muted" style="font-weight:400">one line under the title</span><input id="eS" value="${esc(e.subtitle||'')}" maxlength="200"></label>
      <label style="grid-column:1/-1">Banner image <span class="muted" style="font-weight:400">wide image, about 2100 × 900</span><div style="display:flex;gap:8px"><input id="eB" value="${esc(e.banner_url||'')}" placeholder="Paste an image link or upload"><button type="button" class="btn light" id="eBU">⇪ Upload image</button></div></label>
      <div class="bnprev" id="eBP" style="grid-column:1/-1"></div>
      <label>Starts<input type="datetime-local" id="eSt" value="${esc(e.starts_at||'')}"></label><label>Ends<input type="datetime-local" id="eEn" value="${esc(e.ends_at||'')}"></label>
      <label>Venue<input id="eV" value="${esc(e.venue||'')}" placeholder="Hall, building, area"></label><label>Google Maps link<input id="eM" value="${esc(e.map_url||'')}" placeholder="https://maps.app.goo.gl/…"></label>
      <label style="grid-column:1/-1">Hosted by <span class="muted" style="font-weight:400">optional</span><input id="eH" value="${esc(e.host||'')}"></label>
      <label style="grid-column:1/-1">About the event<textarea id="eD" style="min-height:120px">${esc(e.description||'')}</textarea></label></div>
    <div><b style="font-size:13px">Agenda: what happens when</b><div id="agL" style="margin-top:8px"></div><button type="button" class="btn sm light" id="agAdd">＋ Add a slot</button></div>
    <div class="panel" style="padding:14px;display:grid;gap:12px"><b style="font-size:13px">Registration</b>
      <div style="display:flex;gap:14px;flex-wrap:wrap">${[['site','On this website'],['link','Outside link (Google Form, etc.)'],['none','No registration']].map(([v,t])=>`<label class="chk"><input type="radio" name="rm" value="${v}" ${e.reg_mode===v?'checked':''}> ${t}</label>`).join('')}</div>
      <div id="rmSite" class="grid2"><label>Capacity <span class="muted" style="font-weight:400">blank = no limit</span><input id="eC" type="number" min="1" value="${esc(e.capacity||'')}"></label><label>Ticket price (₹) <span class="muted" style="font-weight:400">0 or blank = free · paid by UPI</span><input id="ePr" type="number" min="0" max="100000" value="${esc(+e.price?e.price:'')}"></label>
        <label class="chk" style="align-self:end"><input type="checkbox" id="eRO" ${truthy(e.reg_open)?'checked':''}> Registration open</label>
        <div style="grid-column:1/-1"><span class="muted" style="font-size:12px">We always ask for name, email and phone. Also ask for:</span><div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px">${Object.entries(j.extra).map(([k,t])=>`<label class="chk"><input type="checkbox" class="exf" value="${k}" ${ex.includes(k)?'checked':''}> ${esc(t)}</label>`).join('')}</div></div></div>
      <label id="rmLink">Registration link<input id="eL" value="${esc(e.reg_link||'')}" placeholder="https://forms.gle/…"></label></div>
    <label class="chk"><input type="checkbox" id="eP" ${truthy(e.published)?'checked':''}> Show on the website</label>`,
    [e.id&&['Delete',async()=>{if(!confirm('Delete this event, its registrations and feedback? The NPS score is kept in the history.'))return;await api('evRemove',{id:e.id});toast('Event deleted');closeM();VIEWS.events();},'bad left'],
     ['Save',async()=>{const ag=[...document.querySelectorAll('#agL .agr')].map(r=>({time:r.querySelector('.t').value,title:r.querySelector('.n').value,detail:r.querySelector('.x').value}));
      const rm=(document.querySelector('[name=rm]:checked')||{}).value;
      const r=await api('evSave',{record:{id:e.id,title:$('#eT').value,subtitle:$('#eS').value,banner_url:$('#eB').value,starts_at:$('#eSt').value,ends_at:$('#eEn').value,venue:$('#eV').value,map_url:$('#eM').value,host:$('#eH').value,
        description:$('#eD').value,agenda:ag,reg_mode:rm,reg_link:$('#eL').value,capacity:$('#eC').value,price:$('#ePr').value||'0',reg_open:$('#eRO').checked?'TRUE':'FALSE',extra_fields:[...document.querySelectorAll('.exf:checked')].map(x=>x.value),published:$('#eP').checked?'TRUE':'FALSE'}});
      toast('Saved. The page is at /events/?e='+r.slug);closeM();VIEWS.events();}]]);
  $('#mBox').classList.add('wide');$('#mBox').style.width='min(860px,100%)';
  uploader($('#eBU'),$('#eB'),$('#eBP'));
  const addRow=(a={})=>{const d=document.createElement('div');d.className='agr';d.innerHTML=`<input class="t" placeholder="2:00 PM" value="${esc(a.time||'')}"><input class="n" placeholder="What happens" value="${esc(a.title||'')}"><input class="x" placeholder="Details (optional)" value="${esc(a.detail||'')}"><button type="button" title="Remove">✕</button>`;
    d.querySelector('button').onclick=()=>d.remove();$('#agL').appendChild(d);};
  (e.agenda&&e.agenda.length?e.agenda:[{}]).forEach(addRow);$('#agAdd').onclick=()=>addRow();
  const sync=()=>{const v=(document.querySelector('[name=rm]:checked')||{}).value;$('#rmSite').classList.toggle('hide',v!=='site');$('#rmLink').classList.toggle('hide',v!=='link');};
  document.querySelectorAll('[name=rm]').forEach(x=>x.onchange=sync);sync();
}
async function evRegs(e){
  const r=await api('evRegs',{id:e.id});
  const cols=['name','email','phone'].concat(String(e.extra_fields||'').split(',').filter(Boolean));
  modal('Registrations · '+e.title,`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b>${r.rows.length} registered</b><span class="muted">· deleted on ${esc(r.purge_on)}</span>
      <span style="margin-left:auto"></span><button class="btn sm light" id="rgE">Copy all emails</button><button class="btn sm light" id="rgP">Copy all phones</button><button class="btn sm" id="rgC">Download CSV</button>${(ME.registrar||ME.role==='super')&&window.gxIssueEvent&&r.rows.length?'<button class="btn sm red" id="rgCert">🎓 Issue certificates</button>':''}</div>
    <div class="scroll"><table class="tbl"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}<th>Status</th><th>Registered</th></tr></thead><tbody>${r.rows.map(x=>`<tr>${cols.map(c=>`<td>${esc(x[c])}</td>`).join('')}<td>${x.status==='Payment pending'?'<span class="badge" style="background:#fff4e0;color:var(--warn)">Payment pending</span>':'Confirmed'}</td><td>${esc(String(x.created_at).replace('T',' ').slice(0,16))}</td></tr>`).join('')||'<tr><td colspan="9" class="empty">No registrations yet.</td></tr>'}</tbody></table></div>`,[]);
  $('#mBox').classList.add('wide');
  $('#rgE').onclick=()=>copy(r.rows.map(x=>x.email).join(', '),r.rows.length+' emails copied');
  if($('#rgCert'))$('#rgCert').onclick=()=>gxIssueEvent(e);
  $('#rgP').onclick=()=>copy(r.rows.map(x=>x.phone).join(', '),'Phones copied');
  $('#rgC').onclick=()=>{const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv=[cols.concat('registered_at').join(',')].concat(r.rows.map(x=>cols.map(c=>q(x[c])).concat(q(x.created_at)).join(','))).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=e.slug+'-registrations.csv';a.click();};
}
async function evFeedback(e){
  const k=await api('evFeedbackKit',{id:e.id});const n=k.nps||{};const tot=+n.responses||0;
  const pct=x=>tot?Math.round((+x||0)/tot*100):0;
  modal('Feedback & NPS · '+e.title,`
    <div class="npsbig"><div><div class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em">Net Promoter Score</div><div class="n">${n.nps===''||n.nps==null?'—':esc(n.nps)}</div><div class="muted">${tot} response${tot===1?'':'s'}${n.avg?' · average '+esc(n.avg)+'/10':''}</div></div>
      <div style="flex:1;min-width:240px;display:grid;gap:6px"><div class="npsbar"><i style="width:${pct(n.promoters)}%;background:#16a34a"></i><i style="width:${pct(n.passives)}%;background:#FFC83D"></i><i style="width:${pct(n.detractors)}%;background:#e45a5a"></i></div>
      <div class="muted" style="font-size:12px">🟢 Promoters (9–10): ${esc(n.promoters||0)} · 🟡 Passives (7–8): ${esc(n.passives||0)} · 🔴 Detractors (0–6): ${esc(n.detractors||0)}</div></div></div>
    ${k.purged_at?`<div class="banner">Registrations and written feedback were deleted on ${esc(String(k.purged_at).slice(0,10))}. Only the score is kept.</div>`:`
    <div class="banner" style="margin:0">Nothing is sent automatically. Copy the subject, message and email list into your own mail (put the emails in <b>Bcc</b>). The link stays open until ${esc(k.purge_on)}.</div>
    <label>Feedback link<div class="copyrow"><input readonly value="${esc(k.link)}"><button class="btn sm light" type="button" data-c="link">Copy</button></div></label>
    <label>Subject<div class="copyrow"><input readonly value="${esc(k.subject)}"><button class="btn sm light" type="button" data-c="subject">Copy</button></div></label>
    <label>Message<div class="copyrow"><textarea readonly style="min-height:150px">${esc(k.body)}</textarea><button class="btn sm light" type="button" data-c="body">Copy</button></div></label>
    <label>All registered emails (${k.emails.length})<div class="copyrow"><textarea readonly style="min-height:60px">${esc(k.emails.join(', '))}</textarea><button class="btn sm" type="button" data-c="emails">Copy all</button></div></label>`}
    ${k.responses.length?`<h4>Written feedback</h4><div style="display:grid;gap:8px">${k.responses.map(f=>`<div class="rh"><div class="top"><span class="badge" style="background:${+f.nps>=9?'#e6f6ec':+f.nps>=7?'#fff4e0':'#fdeaea'}">${esc(f.nps)}/10</span><small class="muted">${esc(String(f.created_at).replace('T',' ').slice(0,16))}</small></div>${f.liked?`<div><b>Liked:</b> ${esc(f.liked)}</div>`:''}${f.improve?`<div><b>Could be better:</b> ${esc(f.improve)}</div>`:''}</div>`).join('')}</div>`:''}`,[]);
  $('#mBox').classList.add('wide');$('#mBox').style.width='min(860px,100%)';
  document.querySelectorAll('#mBox [data-c]').forEach(b=>b.onclick=()=>{const c=b.dataset.c;copy(c==='emails'?k.emails.join(', '):k[c],c==='emails'?k.emails.length+' emails copied':'Copied');});
}

/* ───────── NEWS ───────── */
VIEWS.news=async function(){
  const j=await api('newsList');
  $('#tools').innerHTML=`<a class="btn light" href="/news/" target="_blank" rel="noopener">↗ News page</a><button class="btn red" id="nwNew">＋ New article</button>`;
  $('#nwNew').onclick=()=>newsEdit(null,j);
  $('#view').innerHTML=`<div class="panel"><div class="scroll"><table class="tbl"><thead><tr><th></th><th>Headline</th><th>Section</th><th>Status</th><th>Date</th><th>Author</th></tr></thead><tbody>
    ${j.rows.map(a=>`<tr class="click" data-id="${a.id}"><td>${a.image_url?`<img class="thumb" src="${esc(a.image_url)}">`:''}</td><td><b>${esc(a.title)}</b><div class="muted">${esc(a.summary||'')}</div></td><td>${esc(a.category)}</td><td>${badge(a.status)}${a.status==='Published'&&a.published_at>today()?' <small class="muted">scheduled</small>':''}</td><td>${fmt(a.published_at)}</td><td>${esc(a.author)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No articles yet.</td></tr>'}
    </tbody></table></div></div>`;
  $('#view tbody').onclick=e=>{const tr=e.target.closest('[data-id]');if(tr)newsEdit(j.rows.find(x=>x.id===tr.dataset.id),j);};
};
function newsEdit(a,j){
  a=a||{status:'Draft',category:j.categories[0],author:ME.name||'',published_at:today(),tags:[]};
  modal(a.id?'Edit article':'New article',`<div class="grid2">
      <label style="grid-column:1/-1">Headline<input id="nT" value="${esc(a.title||'')}" maxlength="160"></label>
      <label style="grid-column:1/-1">Summary <span class="muted" style="font-weight:400">one or two sentences, shown on cards and in search</span><textarea id="nS" style="min-height:60px" maxlength="400">${esc(a.summary||'')}</textarea></label>
      <label>Section<select id="nC">${j.categories.map(c=>`<option ${c===a.category?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
      <label>Author / byline<input id="nA" value="${esc(a.author||'')}"></label>
      <label>Publication date<input id="nD" type="date" value="${esc(a.published_at||'')}"></label>
      <label>Tags <span class="muted" style="font-weight:400">comma separated</span><input id="nG" value="${esc((a.tags||[]).join(', '))}"></label>
      <label style="grid-column:1/-1">Main image<div style="display:flex;gap:8px"><input id="nI" value="${esc(a.image_url||'')}" placeholder="Paste an image link or upload"><button type="button" class="btn light" id="nIU">⇪ Upload image</button></div></label>
      <div class="bnprev" id="nIP" style="grid-column:1/-1"></div>
      <label>Image description (alt text)<input id="nIA" value="${esc(a.image_alt||'')}"></label><label>Photo credit<input id="nIC" value="${esc(a.image_credit||'')}"></label></div>
    <div><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13px">Article</b><div class="tabsx" style="margin:0"><button type="button" class="on" id="tW">Write</button><button type="button" id="tP">Preview</button></div></div>
      <textarea id="nB" style="min-height:300px;font-family:ui-monospace,Menlo,monospace;font-size:13px;margin-top:6px">${esc(a.body||'')}</textarea><div class="mdprev hide" id="nPV"></div>
      <p class="muted" style="font-size:12px;margin-top:6px">Blank line = new paragraph · <code>## Heading</code> · <code>&gt; quote</code> · <code>- list</code> · <code>**bold**</code> · <code>*italic*</code> · <code>[text](https://link)</code> · <code>![caption](https://image-link)</code> on its own line</p></div>
    <label>Status<select id="nST"><option ${a.status==='Draft'?'selected':''}>Draft</option><option ${a.status==='Published'?'selected':''}>Published</option></select></label>`,
    [a.id&&['Delete',async()=>{if(!confirm('Delete this article?'))return;await api('newsRemove',{id:a.id});toast('Deleted');closeM();VIEWS.news();},'bad left'],
     a.slug&&['View on site ↗',async()=>{window.open('/news/?a='+encodeURIComponent(a.slug),'_blank');},'light'],
     ['Save',async()=>{const r=await api('newsSave',{record:{id:a.id,title:$('#nT').value,summary:$('#nS').value,category:$('#nC').value,author:$('#nA').value,published_at:$('#nD').value,tags:$('#nG').value,
       image_url:$('#nI').value,image_alt:$('#nIA').value,image_credit:$('#nIC').value,body:$('#nB').value,status:$('#nST').value}});
       toast($('#nST').value==='Published'?'Published at /news/?a='+r.slug:'Draft saved');closeM();VIEWS.news();}]]);
  $('#mBox').classList.add('wide');$('#mBox').style.width='min(900px,100%)';
  uploader($('#nIU'),$('#nI'),$('#nIP'));
  $('#tW').onclick=()=>{$('#tW').classList.add('on');$('#tP').classList.remove('on');$('#nB').classList.remove('hide');$('#nPV').classList.add('hide');};
  $('#tP').onclick=()=>{$('#tP').classList.add('on');$('#tW').classList.remove('on');$('#nPV').innerHTML=window.TXMD?TXMD.render($('#nB').value).html:'';$('#nB').classList.add('hide');$('#nPV').classList.remove('hide');};
}

/* ───────── SPEAKER REHEARSALS (tab inside a speaker) ───────── */
window.rehTab=async function(T,sp){
  T.innerHTML='<div class="empty">Loading…</div>';
  let j;try{j=await api('rehList',{speaker_id:sp.id});}catch(e){T.innerHTML=`<div class="empty">${esc(e.message)}</div>`;return;}
  const up=j.rows.filter(r=>r.status==='Scheduled'),rest=j.rows.filter(r=>r.status!=='Scheduled').reverse();
  const card=r=>`<div class="rh"><div class="top"><b>${esc(fmtDT(r.starts_at))}</b><span class="muted">· ${esc(r.minutes)} min · ${esc(r.type)}</span>${badge(r.status)}${r.speaker_reply?badge(r.speaker_reply==='Confirmed'?'Confirmed':'Needs another time'):r.status==='Scheduled'?'<span class="badge">Not confirmed yet</span>':''}</div>
    <div>${r.meet_link?`🎥 <a href="${esc(r.meet_link)}" target="_blank" rel="noopener">${esc(r.meet_link)}</a>`:'📍 '+esc(r.location)}</div>
    ${r.agenda?`<div class="muted" style="white-space:pre-wrap">${esc(r.agenda)}</div>`:''}${r.speaker_note?`<div style="background:#fff4e0;border-radius:8px;padding:6px 10px">💬 ${esc(sp.name.split(' ')[0])}: “${esc(r.speaker_note)}”</div>`:''}
    ${r.notes?`<div style="background:#f4f2ee;border-radius:8px;padding:6px 10px;white-space:pre-wrap"><b>Notes:</b> ${esc(r.notes)}</div>`:''}
    ${j.canEdit&&r.status==='Scheduled'?`<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm light" data-r="move" data-id="${r.id}">Move</button><button class="btn sm ok" data-r="Done" data-id="${r.id}">Mark done + notes</button><button class="btn sm light" data-r="Missed" data-id="${r.id}">Missed</button><button class="btn sm light" data-r="Cancelled" data-id="${r.id}">Cancel</button></div>`:''}</div>`;
  T.innerHTML=`${j.canEdit?`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b>${up.length} upcoming</b><button class="btn sm red" id="rhNew">＋ Schedule a rehearsal</button></div>`:''}
    <div style="display:grid;gap:10px">${up.map(card).join('')||'<div class="empty" style="padding:20px">No rehearsals scheduled.</div>'}</div>
    ${rest.length?`<h4 style="margin-top:16px">Earlier</h4><div style="display:grid;gap:10px;margin-top:8px">${rest.map(card).join('')}</div>`:''}<div id="rhForm"></div>`;
  const form=(r)=>{r=r||{type:j.types[0],minutes:'30',location:'Online'};const online=!r.location||r.location==='Online';
    $('#rhForm').innerHTML=`<div class="panel" style="padding:14px;display:grid;gap:12px;margin-top:14px"><b>${r.id?'Move rehearsal':'Schedule a rehearsal'}</b>
      <div class="grid2"><label>Type<select id="rT">${j.types.map(t=>`<option ${t===r.type?'selected':''}>${esc(t)}</option>`).join('')}</select></label><label>Length (minutes)<input id="rM" type="number" min="10" max="240" value="${esc(r.minutes)}"></label>
      <label>Date<input id="rD" type="date" min="${today()}" value="${esc(String(r.starts_at||'').slice(0,10))}"></label><label>Time (IST)<input id="rTi" type="time" value="${esc(String(r.starts_at||'').slice(11,16)||'17:00')}"></label></div>
      <div style="display:flex;gap:14px"><label class="chk"><input type="radio" name="rmode" value="online" ${online?'checked':''}> Online (Google Meet link is created)</label><label class="chk"><input type="radio" name="rmode" value="venue" ${online?'':'checked'}> In person</label></div>
      <label id="rLw" class="${online?'hide':''}">Venue<input id="rL" value="${online?'':esc(r.location)}"></label>
      <label>What you will work on (sent to the speaker)<textarea id="rA">${esc(r.agenda||'')}</textarea></label>
      <label>Also invite (team members)</label><div class="ppick">${j.people.filter(p=>p.email!==ME.email).map(p=>`<label class="chk"><input type="checkbox" class="rP" value="${esc(p.email)}"> ${esc(p.name)}</label>`).join('')}</div>
      <div><button class="btn red" id="rSave">${r.id?'Move and notify':'Schedule and send invite'}</button></div></div>`;
    document.querySelectorAll('[name=rmode]').forEach(x=>x.onchange=()=>$('#rLw').classList.toggle('hide',x.value==='online'&&x.checked));
    $('#rSave').onclick=async function(){this.disabled=true;try{const res=await api('rehSave',{speaker_id:sp.id,id:r.id,type:$('#rT').value,minutes:$('#rM').value,date:$('#rD').value,time:$('#rTi').value,
      mode:(document.querySelector('[name=rmode]:checked')||{}).value,location:$('#rL').value,agenda:$('#rA').value,team:[...document.querySelectorAll('.rP:checked')].map(x=>x.value)});
      toast(res.meet_link?'Scheduled with a Google Meet link. Invite sent.':'Scheduled. Invite sent.');rehTab(T,sp);}catch(e){toast(e.message,1);this.disabled=false;}};
    $('#rhForm').scrollIntoView({behavior:'smooth',block:'nearest'});};
  if($('#rhNew'))$('#rhNew').onclick=()=>form();
  T.onclick=async e=>{const b=e.target.closest('[data-r]');if(!b)return;const r=j.rows.find(x=>x.id===b.dataset.id),a=b.dataset.r;
    if(a==='move')return form(r);
    const notes=a==='Done'?prompt('Notes for the speaker (they are emailed and shown in their portal):',''):a==='Cancelled'?prompt('Reason (optional, sent to the speaker):',''):'';
    if(notes===null)return;try{await api('rehUpdate',{id:r.id,status:a,notes});toast('Updated');rehTab(T,sp);}catch(x){toast(x.message,1);}};
};

/* ───────── preview data ───────── */
const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  const a=b.action,now=()=>new Date().toISOString().slice(0,19);
  if(!D._ev){const d=n=>new Date(Date.now()+n*864e5+19800000).toISOString().slice(0,16);
    D._ev={rows:[{id:'EV1',slug:'design-thinking-workshop-ab12',title:'Design Thinking Workshop',subtitle:'An afternoon of making ideas tangible',banner_url:'',starts_at:d(9),ends_at:d(9.1),venue:'Ahmedabad University',reg_mode:'site',reg_open:'TRUE',capacity:'40',extra_fields:'institution',published:'TRUE',state:'upcoming',purge_on:d(16).slice(0,10),purged_at:'',regs:2,feedback:0,nps:'',nps_responses:0,agenda:[{time:'2:00 PM',title:'Welcome'},{time:'2:20 PM',title:'Empathy maps',detail:'Find the real problem.'}],description:'A hands-on workshop.'},
      {id:'EV0',slug:'zenith-meetup-ef56',title:'Zenith Community Meetup',banner_url:'',starts_at:d(-20),ends_at:d(-19.9),venue:'Thaltej',reg_mode:'none',published:'TRUE',state:'past',purge_on:d(-13).slice(0,10),purged_at:d(-13),regs:0,nps:'62',nps_responses:'21',agenda:[]}],
      regs:[{name:'Riya Patel',email:'riya@example.com',phone:'+91 98765 43210',institution:'Udgam School',created_at:now()},{name:'Aarav Mehta',email:'aarav@example.com',phone:'+91 90000 11111',institution:'Zydus School',created_at:now()}],
      news:[{id:'NW1',slug:'announcing-the-zenith-ab12',title:'Announcing The Zenith: TEDxThaltej Youth 2027',summary:'Our third edition explores what becomes visible when our vantage point changes.',body:'## A new vantage point\n\nThe Zenith asks a simple question.\n\n> Our vantage point did.',category:'Announcement',author:'TEDxThaltej Youth',tags:['The Zenith'],status:'Published',published_at:'2026-11-10',image_url:''},
        {id:'NW2',slug:'draft-ab',title:'Meet the Virasat performers',summary:'',body:'',category:'Story',author:'Fenil Pritesh Shah',tags:[],status:'Draft',published_at:'',image_url:''}],
      reh:[{id:'RH1',type:'Online run-through',starts_at:d(3),minutes:'45',location:'Online',meet_link:'https://meet.google.com/abc-defg-hij',agenda:'Opening and pacing',status:'Scheduled',speaker_reply:'Confirmed',notes:''},
        {id:'RH0',type:'In person',starts_at:d(-4),minutes:'60',location:'JG Auditorium',status:'Done',notes:'Great energy. Slow down in the middle section.'}]};}
  const E=D._ev;
  if(a==='evList') return {ok:true,rows:E.rows,extra:{institution:'School / college / organisation',age:'Age',city:'City',grade:'Class / year'},keepDays:7,siteUrl:'https://tedxthaltejyouth.in',log:[{title:'Zenith Community Meetup',event_date:E.rows[1].starts_at.slice(0,10),responses:'21',promoters:'15',passives:'4',detractors:'2',nps:'62',avg:'8.9'}]};
  if(a==='evSave'){const r=b.record;if(!r.title)return {ok:false,error:'Add a title.'};if(r.id)Object.assign(E.rows.find(x=>x.id===r.id),r);else E.rows.unshift(Object.assign({id:'EV'+Date.now(),slug:'new-event',state:'upcoming',regs:0,nps:'',purge_on:'',purged_at:''},r));return {ok:true,slug:'new-event'};}
  if(a==='evRemove'){E.rows=E.rows.filter(x=>x.id!==b.id);return {ok:true};}
  if(a==='evRegs') return {ok:true,rows:E.regs,purge_on:E.rows[0].purge_on};
  if(a==='evFeedbackKit'){const ev=E.rows.find(x=>x.id===b.id);const link='https://tedxthaltejyouth.in/events/feedback/?e='+ev.slug+'&t=3f9c2a71b0';
    return {ok:true,link,subject:'How was '+ev.title+'? (1 minute)',body:'Hi,\n\nThank you for joining us at '+ev.title+'. We would love to hear how it went for you. It takes about a minute:\n\n'+link+'\n\nWarm regards,\nTEDxThaltej Youth',
      emails:E.regs.map(x=>x.email),purge_on:ev.purge_on,purged_at:ev.purged_at,nps:ev.purged_at?{nps:ev.nps,responses:ev.nps_responses,promoters:15,passives:4,detractors:2}:{nps:50,responses:4,promoters:2,passives:2,detractors:0,avg:8.8},
      responses:ev.purged_at?[]:[{nps:'10',liked:'The prototype sprint!',improve:'More time',created_at:now()},{nps:'8',liked:'Friendly mentors',improve:'',created_at:now()}]};}
  if(a==='newsList') return {ok:true,rows:E.news,categories:['Announcement','Press release','Story','Event recap','Speaker','Idea Search','Partners','Behind the scenes']};
  if(a==='newsSave'){const r=b.record;if(!r.title)return {ok:false,error:'Add a headline.'};if(r.id)Object.assign(E.news.find(x=>x.id===r.id),r,{tags:String(r.tags).split(',').map(s=>s.trim()).filter(Boolean)});else E.news.unshift(Object.assign({id:'NW'+Date.now(),slug:'new-article'},r,{tags:[]}));return {ok:true,slug:'new-article'};}
  if(a==='newsRemove'){E.news=E.news.filter(x=>x.id!==b.id);return {ok:true};}
  if(a==='upload') return {ok:true,url:b.dataUrl};
  if(a==='rehList') return {ok:true,rows:E.reh,types:['Online run-through','In person','Full dress rehearsal','Tech check'],statuses:['Scheduled','Done','Missed','Cancelled'],canEdit:true,people:[{email:me.email,name:me.name},{email:'hirva@example.com',name:'Hirva'}]};
  if(a==='rehSave'){if(!b.date)return {ok:false,error:'Choose a date and a time.'};const x={id:b.id||'RH'+Date.now(),type:b.type,starts_at:b.date+'T'+b.time,minutes:b.minutes,location:b.mode==='venue'?b.location:'Online',meet_link:b.mode==='venue'?'':'https://meet.google.com/new-prev-iew',agenda:b.agenda,status:'Scheduled',speaker_reply:'',notes:''};
    if(b.id)Object.assign(E.reh.find(r=>r.id===b.id),x);else E.reh.push(x);return {ok:true,meet_link:x.meet_link};}
  if(a==='rehUpdate'){Object.assign(E.reh.find(r=>r.id===b.id),{status:b.status,notes:b.notes});return {ok:true};}
  return prev?prev(b,me,D):null;
};
})();
