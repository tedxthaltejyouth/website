/* Team Portal: Charter tools (elections, RTI, hearings & reviews, withdrawal), Office of the Registrar,
   TES (open tasks, submit & review, meetings & attendance, awards, grievances) and access locks.
   Loaded after portal-content.js. */
(function(){
const css=`
.board{grid-template-columns:repeat(5,minmax(210px,1fr))!important}
@media(max-width:900px){.board{grid-template-columns:repeat(5,250px)!important}}
.b-Submitted{background:#e8f0fe;color:#1a56db}.b-Valid{background:#e6f6ec;color:var(--ok)}.b-Void{background:#111;color:#fff}.b-Issued{background:#e6f6ec;color:var(--ok)}.b-Declined{background:#fdeaea;color:var(--bad)}
.b-Open{background:#fff4e0;color:var(--warn)}.b-Voting{background:var(--red);color:#fff}.b-Counting{background:#e8f0fe;color:#1a56db}.b-Answered{background:#e6f6ec;color:var(--ok)}
.b-Present{background:#e6f6ec;color:var(--ok)}.b-Late{background:#fff4e0;color:var(--warn)}.b-Absent{background:#fdeaea;color:var(--bad)}.b-Excused{background:#fff7d6;color:#8a6100}.b-N\\.A\\.{background:#eee;color:#555}
.b-Resolved{background:#e6f6ec;color:var(--ok)}.b-Closed{background:#f1f1f1;color:#666}.b-Acknowledged{background:#e6f6ec;color:var(--ok)}.b-Lapsed{background:#f1f1f1;color:#666}
.gx-hero{background:var(--n,#101B3D);color:#fff;border-radius:20px;padding:22px 24px;margin-bottom:18px;display:flex;gap:18px;align-items:center;flex-wrap:wrap;position:relative;overflow:hidden}
.gx-hero h2{font-family:Anton,Impact,sans-serif;font-weight:400;text-transform:uppercase;font-size:34px;line-height:1;letter-spacing:.01em}
.gx-hero p{opacity:.85;font-size:14px;max-width:640px;margin-top:6px}
.gx-hero:after{content:"";position:absolute;right:-40px;top:-40px;width:150px;height:150px;border-radius:50%;background:var(--y,#FFC83D);border:3px solid #fff;opacity:.95}
.gx-hero>*{position:relative;z-index:1}
.gx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.gx-card{background:#fff;border:1.5px solid var(--n,#101B3D);border-radius:18px;padding:16px 18px;display:grid;gap:8px;box-shadow:4px 4px 0 var(--n,#101B3D);align-content:start}
.gx-card h4{font-size:17px;line-height:1.25;letter-spacing:-.01em}
.gx-card .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.gx-card .meta{font-size:13px;color:var(--mute)}
.gx-card .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.gx-prog{height:10px;border-radius:99px;background:#eee;overflow:hidden}.gx-prog i{display:block;height:100%;background:var(--red)}
.gx-sec{font-family:Anton,Impact,sans-serif;font-weight:400;text-transform:uppercase;font-size:20px;letter-spacing:.02em;margin:22px 0 10px}
.gx-note{font-size:12.5px;color:var(--mute);line-height:1.5}
.gx-types{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin-bottom:14px}
.gx-types button{text-align:left;border:1.5px solid var(--line);background:#fff;border-radius:14px;padding:10px 12px;cursor:pointer;font-weight:700;font-size:13.5px;display:grid;gap:2px}
.gx-types button small{font-weight:500;color:var(--mute);font-size:11.5px}
.gx-types button.on{border-color:var(--n,#101B3D);background:var(--n,#101B3D);color:#fff}.gx-types button.on small{color:#cdd3e6}
.gx-issue{display:grid;grid-template-columns:minmax(300px,1fr) minmax(320px,1.15fr);gap:18px;align-items:start}
@media(max-width:1000px){.gx-issue{grid-template-columns:1fr}}
.gx-form{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;display:grid;gap:10px}
.gx-form label{display:grid;gap:4px;font-size:13px;font-weight:600}
.gx-form label.chk{display:flex}.gx-form .req>span:after{content:" *";color:var(--red)}
/* live previews */
.pv-cert{aspect-ratio:1.414/1;background:#FFF4E2;border:2px solid #101B3D;border-radius:6px;position:relative;overflow:hidden;font-family:Inter,sans-serif;color:#101B3D;container-type:inline-size}
.pv-cert .fr{position:absolute;inset:2.4%;border:2px solid #101B3D}
.pv-cert .c1{position:absolute;left:-8%;top:-12%;width:22%;aspect-ratio:1;border-radius:50%;background:#FFC83D;border:3px solid #101B3D}
.pv-cert .c2{position:absolute;right:-10%;bottom:-16%;width:26%;aspect-ratio:1;border-radius:50%;background:#EB0028;border:3px solid #101B3D}
.pv-cert .c3{position:absolute;right:7%;top:7%;width:3.6%;aspect-ratio:1;border-radius:50%;background:#2D6BFF;border:2px solid #101B3D}
.pv-cert .wm{position:absolute;right:6%;top:12%;width:34%;opacity:.5}
.pv-cert .lg{position:absolute;left:6%;top:6%;width:26%}
.pv-cert .no{position:absolute;right:7%;top:5%;font-size:1.3cqw;color:#3b4466}
.pv-cert .mid{position:absolute;left:8%;right:8%;top:15%;text-align:center;display:grid;gap:.6cqw}
.pv-cert .t1{font-family:Anton,Impact,sans-serif;font-size:7cqw;line-height:1;letter-spacing:.02em}
.pv-cert .t2{font-family:Anton,Impact,sans-serif;font-size:2.8cqw;color:#EB0028;letter-spacing:.06em}
.pv-cert .t3{font-size:1.6cqw}
.pv-cert .nm{font-family:Anton,Impact,sans-serif;font-size:5.4cqw;line-height:1.1;margin-top:.6cqw}
.pv-cert .bar{width:19%;height:.55cqw;background:#EB0028;margin:0 auto}
.pv-cert .ln{font-size:1.7cqw;line-height:1.45;max-width:80%;margin:0 auto}
.pv-cert .foot{position:absolute;left:6%;right:6%;bottom:6%;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:2cqw}
.pv-cert .sg{font-size:1.25cqw;line-height:1.35}.pv-cert .sg i{display:block;width:21cqw;max-width:100%;border-top:1.5px solid #101B3D;margin-bottom:.4cqw}
.pv-cert .sg .sig{font-family:'Great Vibes',cursive;font-size:3cqw;line-height:1}
.pv-cert .seal{width:10cqw}
.pv-cert .qr{justify-self:end;text-align:right;font-size:1.05cqw;color:#3b4466;display:grid;justify-items:end;gap:.4cqw}
.pv-cert .qr b{display:block;width:7.6cqw;aspect-ratio:1;background:repeating-conic-gradient(#101B3D 0 25%,#fff 0 50%) 0 0/25% 25%;border:2px solid #101B3D}
.pv-cert.id .mid{text-align:left;left:6%;top:21%}.pv-cert.id .bar{margin:0}.pv-cert.id .t1{font-size:6cqw}
.pv-letter{aspect-ratio:1/1.414;background:#fff;border:1px solid #d9d4c8;border-radius:4px;position:relative;overflow:hidden;font-family:Georgia,serif;color:#111;container-type:inline-size;box-shadow:0 6px 24px rgba(0,0,0,.08)}
.pv-letter .hd{width:100%;display:block}.pv-letter .ft{position:absolute;left:0;right:0;bottom:0;width:100%}
.pv-letter .wm{position:absolute;left:50%;top:50%;width:50%;transform:translate(-50%,-50%);opacity:.6}
.pv-letter .bd{position:relative;padding:3cqw 9cqw;font-size:2.05cqw;line-height:1.5;display:grid;gap:1.4cqw}
.pv-letter .ref{display:flex;justify-content:space-between;font-family:Inter,sans-serif;font-size:1.7cqw;color:#3b4466}
.pv-letter .ttl{font-family:Inter,sans-serif;font-weight:800;font-size:2.6cqw;text-transform:uppercase;letter-spacing:.04em;text-align:center}
.pv-letter .tx{white-space:pre-wrap;max-height:62cqw;overflow:hidden}
.pv-letter .sgn{display:flex;justify-content:space-between;align-items:end;font-family:Inter,sans-serif;font-size:1.6cqw}
.pv-letter .sgn .sig{font-family:'Great Vibes',cursive;font-size:4cqw;line-height:1}.pv-letter .sgn img{width:12cqw}
/* meetings, donut */
.donut{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.donut svg{width:150px;height:150px}
.donut .lg{display:grid;gap:6px;font-size:13px}.donut .lg span{display:flex;gap:8px;align-items:center}.donut .lg i{width:12px;height:12px;border-radius:4px;display:inline-block}
.mbars{display:flex;gap:8px;align-items:end;height:90px}.mbars div{display:grid;gap:4px;justify-items:center;font-size:11px;color:var(--mute)}.mbars b{display:block;width:26px;border-radius:7px 7px 3px 3px;background:var(--n,#101B3D)}
.att{display:grid;gap:6px}.att .r{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)}
.att .pills{display:flex;gap:4px;flex-wrap:wrap}.att .pills button{border:1.5px solid var(--line);background:#fff;border-radius:99px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer}
.att .pills button.on[data-s="Present"]{background:#13804b;color:#fff;border-color:#13804b}.att .pills button.on[data-s="Late"]{background:#FFC83D;border-color:#FFC83D}
.att .pills button.on[data-s="Absent"]{background:#EB0028;color:#fff;border-color:#EB0028}.att .pills button.on[data-s="Excused"]{background:#F59E0B;color:#fff;border-color:#F59E0B}.att .pills button.on[data-s="N.A."]{background:#101B3D;color:#fff;border-color:#101B3D}
.chips{display:flex;gap:6px;flex-wrap:wrap;max-height:180px;overflow:auto;padding:4px 0}.chips label{display:inline-flex!important;grid-auto-flow:column;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:99px;padding:5px 10px;font-weight:600;font-size:12.5px;cursor:pointer}
.chips input{width:auto}
/* awards */
.aw{border-radius:20px;padding:18px;display:grid;gap:8px;border:1.5px solid var(--n,#101B3D);background:#fff;box-shadow:4px 4px 0 var(--n,#101B3D);position:relative;overflow:hidden}
.aw .ic{font-size:30px}.aw h4{font-family:Anton,Impact,sans-serif;font-weight:400;text-transform:uppercase;font-size:22px;letter-spacing:.02em}
.aw q{font-style:italic;font-size:14px;line-height:1.5}
.aw.torch{background:radial-gradient(circle at 85% 10%,rgba(255,200,61,.35),transparent 45%),linear-gradient(160deg,#101B3D,#1c2a5c);color:#fff;border-color:#FFC83D;box-shadow:4px 4px 0 #FFC83D}
.aw.torch h4{color:#FFC83D}.aw.torch .meta{color:#cdd3e6}
/* grievances */
.thread{display:grid;gap:10px;max-height:48vh;overflow:auto;padding:4px}
.bub{max-width:82%;border-radius:16px;padding:10px 14px;font-size:14px;line-height:1.5;white-space:pre-wrap;background:#f4f2ee}
.bub.me{justify-self:end;background:var(--n,#101B3D);color:#fff}.bub.sys{justify-self:center;background:none;color:var(--mute);font-size:12px;padding:2px}
.bub small{display:block;font-size:11px;opacity:.7;margin-bottom:3px}
.lnk{display:grid;grid-template-columns:1fr 1.6fr 34px;gap:6px;margin-bottom:6px}.lnk button{border:0;background:#f4f2ee;border-radius:8px;cursor:pointer}
.proof a{display:block;font-size:13px;word-break:break-all}
.lockst{background:#101B3D;color:#fff;border-radius:12px;padding:10px 14px;font-size:13px}
.sigbox canvas{width:100%;height:150px;border:1.5px dashed #c9c2b3;border-radius:12px;background:#fff;touch-action:none}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* ───────── sections ───────── */
const isReg=()=>!!(ME&&(ME.registrar||ME.role==='super'));
const at=id=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('mail')+1,0,
  {id:'available',name:'Open tasks',ico:'✋',grp:'Overview',always:true},
  {id:'meetings',name:'Meetings',ico:'◷',grp:'Overview',always:true});
SECTIONS.splice(at('tasks'),0,
  {id:'charter',name:'Charter & Council',ico:'⚖',grp:'Charter',always:true},
  {id:'mydocs',name:'My documents',ico:'✎',grp:'Charter',always:true},
  {id:'grievances',name:'Grievances',ico:'☏',grp:'Charter',always:true},
  {id:'awards',name:'Awards',ico:'✷',grp:'Charter',always:true},
  {id:'registrar',name:'Office of the Registrar',ico:'⌘',grp:'Registrar',show:isReg});
const h=location.hash.slice(1);if(h&&SECTIONS.some(s=>s.id===h))CUR=h;

/* ───────── helpers ───────── */
const SITE='https://tedxthaltejyouth.in';
const pad2=n=>String(n).padStart(2,'0');
const fmtDT=s=>s?new Date(String(s).slice(0,16)+':00+05:30').toLocaleString('en-IN',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'}):'';
const istNow=(addMin=0)=>{const d=new Date(Date.now()+19800000+addMin*60000);return d.toISOString().slice(0,16);};
const copy=(t,label)=>{try{navigator.clipboard.writeText(t);toast((label||'Copied')+' ✓');}catch(e){prompt('Copy this:',t);}};
const nl=s=>esc(s||'').replace(/\n/g,'<br>');
const hero=(t,p,right)=>`<div class="gx-hero"><div style="flex:1;min-width:240px"><h2>${t}</h2>${p?`<p>${p}</p>`:''}</div>${right||''}</div>`;
const tabs=(list,cur,id)=>`<div class="tabsx" id="${id}" style="flex-wrap:wrap;margin-bottom:14px">${list.map(t=>`<button data-t="${t[0]}" class="${cur===t[0]?'on':''}">${t[1]}</button>`).join('')}</div>`;
const val=sel=>{const e=$(sel);return e?e.value.trim():'';};
const wide=()=>$('#mBox').classList.add('wide');
const ask=(title,label,required,ph)=>new Promise(res=>{modal(title,`<label>${label}<textarea id="gxAsk" placeholder="${esc(ph||'')}"></textarea></label>`,[
  ['Cancel',()=>{closeM();res(null);},'light'],['Continue',()=>{const v=$('#gxAsk').value.trim();if(required&&!v)return toast('Please fill this in',1);closeM();res(v);}]]);});
const printHTML=(title,html)=>{const w=window.open('','_blank');if(!w)return toast('Allow pop-ups to print',1);
  w.document.write(`<!doctype html><title>${esc(title)}</title><style>body{font:14px/1.55 Inter,system-ui,sans-serif;color:#111;max-width:760px;margin:30px auto;padding:0 20px}img.h{width:100%}h1{font-size:20px}.m{border-bottom:1px solid #ddd;padding:10px 0}.m small{color:#666}</style><img class="h" src="/assets/letterhead/header.png">${html}<script>onload=()=>setTimeout(()=>print(),300)<\/script>`);w.document.close();};

/* ═════════════ OPEN TASKS (claim) ═════════════ */
VIEWS.available=async function(){
  const j=await api('taskAvailable'); const dn=id=>(j.departments.find(d=>d.id===id)||{}).name||'';
  const paint=()=>{$('#view').innerHTML=hero('Open tasks','Tasks nobody has taken yet, for your team or for everyone. Claim one and it moves to My tasks. When you finish, submit links to your work for review.')+
    (j.rows.length?`<div class="gx-grid">${j.rows.map((t,i)=>{const over=t.due_date&&t.due_date<today();return `<div class="gx-card"><div class="row">${badge(t.priority)}${t.department_id?`<span class="badge">${esc(dn(t.department_id))}</span>`:'<span class="badge">Everyone</span>'}</div>
      <h4>${esc(t.title)}</h4>${t.description?`<div class="meta">${esc(String(t.description).slice(0,180))}</div>`:''}<div class="meta">${t.due_date?(over?'⚠ Overdue · ':'Due ')+fmt(t.due_date):'No due date'}</div>
      <div class="acts"><button class="btn red sm" data-c="${i}">✋ Claim this task</button></div></div>`;}).join('')}</div>`:'<div class="panel"><div class="empty">No open tasks right now. Check back later ✦</div></div>');
    $('#view').querySelectorAll('[data-c]').forEach(b=>b.onclick=async()=>{const t=j.rows[b.dataset.c];if(!confirm('Claim “'+t.title+'”? It becomes your responsibility.'))return;
      b.disabled=true;try{await api('taskClaim',{id:t.id});toast('It’s yours. Find it in My tasks.');j.rows.splice(b.dataset.c,1);paint();}catch(e){toast(e.message,1);b.disabled=false;}});};
  paint();
};

/* ═════════════ MY TASKS: submit work ═════════════ */
const proofOf=t=>{try{return JSON.parse(t.proof_json||'[]');}catch(e){return [];}};
const proofHTML=t=>{const p=proofOf(t);return p.length?`<div class="proof"><b style="font-size:12px">Submitted work</b>${p.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">↗ ${esc(x.title||x.url)}</a>`).join('')}</div>`:'';};
const linkRows=box=>{const add=(t='',u='')=>{const r=document.createElement('div');r.className='lnk';r.innerHTML=`<input placeholder="What is it (e.g. Final poster)" value="${esc(t)}"><input placeholder="https://drive.google.com/…" value="${esc(u)}"><button type="button">×</button>`;r.querySelector('button').onclick=()=>r.remove();box.appendChild(r);};
  add();return {add,read:()=>[...box.querySelectorAll('.lnk')].map(r=>{const i=r.querySelectorAll('input');return {title:i[0].value.trim(),url:i[1].value.trim()};}).filter(x=>x.url)};};
window.openMyTask=openMyTask=function(t,S){
  const mineSt=S.filter(s=>!['Submitted','Done'].includes(s)||s===t.status);
  const canSubmit=!['Done','Submitted'].includes(t.status);
  modal(t.title,`${t.description?`<p style="white-space:pre-wrap">${esc(t.description)}</p>`:''}
    <dl class="kv"><dt>Status</dt><dd>${badge(t.status)}</dd><dt>Due</dt><dd>${t.due_date?fmt(t.due_date):'—'}</dd><dt>Priority</dt><dd>${badge(t.priority)}</dd><dt>Assigned by</dt><dd>${esc(t.assigned_by||'Claimed by you')}</dd></dl>
    ${t.status==='Submitted'?'<div class="banner">Submitted. Waiting for review by the person who set it.</div>':''}${proofHTML(t)}
    <div class="tabsx" id="mtT"><button data-t="u" class="on">Post an update</button>${canSubmit?'<button data-t="s">✓ Submit work for review</button>':''}</div>
    <div id="mtU"><label>Status<select id="ms">${mineSt.map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}</select></label>
      <label style="margin-top:8px;display:grid">Update / comment<textarea id="mc" placeholder="What’s the progress? Anything blocking you?"></textarea></label></div>
    <div id="mtS" class="hide"><p class="gx-note">Add links to the finished work: Drive folder, Canva design, photos, a document. The person who set the task will accept it or ask for changes.</p><div id="mtL" style="margin-top:8px"></div>
      <button type="button" class="btn sm light" id="mtAdd">+ Another link</button><label style="margin-top:8px;display:grid">Note (optional)<textarea id="mtN" placeholder="Anything the reviewer should know"></textarea></label></div>
    ${t.comments?`<div><b style="font-size:12px">History</b><div class="log">${esc(t.comments)}</div></div>`:''}`,
    [['Save',async()=>{
      if(!$('#mtS').classList.contains('hide')){const links=L.read();if(!links.length)return toast('Add at least one link to your work',1);
        await api('taskSubmit',{id:t.id,links,note:$('#mtN').value});toast('Submitted for review ✓');closeM();go('mytasks');return;}
      const s=$('#ms').value,c=$('#mc').value;if(s===t.status&&!c)return closeM();await api('updateTask',{id:t.id,status:s!==t.status?s:'',comment:c});toast('Updated. Your head has been notified.');closeM();go('mytasks');}]]);
  const L=linkRows($('#mtL'));$('#mtAdd').onclick=()=>L.add();
  $('#mtT').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{$('#mtT').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));$('#mtU').classList.toggle('hide',b.dataset.t!=='u');$('#mtS').classList.toggle('hide',b.dataset.t!=='s');
    $('#mBox .ft .btn:last-child').textContent=b.dataset.t==='s'?'Submit for review':'Save';});
};

/* ═════════════ TASK BOARD: review queue + reminders ═════════════ */
const _tasks=VIEWS.tasks;let boardHook=null;
$('#view').addEventListener('click',e=>{if(CUR!=='tasks'||!boardHook)return;const tk=e.target.closest('.tk');if(!tk)return;const t=boardHook.rows.find(x=>x.id===tk.dataset.id);if(t&&t.status==='Submitted'){e.stopPropagation();boardHook.review(t);}},true);
VIEWS.tasks=async function(){
  await _tasks.call(VIEWS);
  let rows=[];try{rows=(await api('list',{module:'tasks'})).rows;}catch(e){}
  const sub=rows.filter(t=>t.status==='Submitted'), over=rows.filter(t=>t.assigned_to&&t.status!=='Done'&&t.due_date&&t.due_date<today());
  const b=document.createElement('button');b.className='btn'+(sub.length?' red':' light');b.textContent=`Review queue (${sub.length})`;b.onclick=()=>queue();$('#tools').prepend(b);
  if(sub.length){const v=$('#view');v.insertAdjacentHTML('afterbegin',`<div class="banner" id="rqB" style="cursor:pointer"><b>${sub.length} task${sub.length>1?'s':''} waiting for your review.</b> Open the review queue to accept or ask for rework.</div>`);$('#rqB').onclick=()=>queue();}
  // Submitted cards open the review modal instead of the editor
  boardHook={rows,review:t=>review(t)};
  const queue=()=>{modal('Review queue',`${sub.length?sub.map((t,i)=>`<div class="gx-card" style="box-shadow:none;margin-bottom:8px"><div class="row">${badge('Submitted')}<b>${esc(t.title)}</b></div><div class="meta">by ${esc(t.assigned_to)}</div><div class="acts"><button class="btn sm red" data-r="${i}">Review</button></div></div>`).join(''):'<div class="empty">Nothing waiting for review.</div>'}
    ${over.length?`<div class="gx-sec" style="font-size:16px">Overdue</div>${over.map((t,i)=>`<div class="row" style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)"><span style="flex:1"><b>${esc(t.title)}</b> <span class="muted">· ${esc(t.assigned_to)} · due ${fmt(t.due_date)}</span></span><button class="btn sm light" data-m="${i}">Send reminder</button></div>`).join('')}`:''}`,[]);
    $('#mBox').querySelectorAll('[data-r]').forEach(x=>x.onclick=()=>review(sub[x.dataset.r]));
    $('#mBox').querySelectorAll('[data-m]').forEach(x=>x.onclick=async()=>{x.disabled=true;try{const r=await api('taskRemind',{id:over[x.dataset.m].id,message:''});toast('Reminder sent to '+r.sent);}catch(e){toast(e.message,1);}});};
  const review=t=>{modal('Review: '+t.title,`<dl class="kv"><dt>Submitted by</dt><dd>${esc(t.assigned_to)}</dd><dt>Due</dt><dd>${t.due_date?fmt(t.due_date):'—'}</dd></dl>${proofHTML(t)}
    ${t.comments?`<div class="log">${esc(t.comments)}</div>`:''}<label>Feedback (needed for rework)<textarea id="rvN" placeholder="Great work! / Please change…"></textarea></label>`,[
    ['Ask for rework',async()=>{const n=$('#rvN').value.trim();if(!n)return toast('Say what needs to change',1);await api('taskReview',{id:t.id,decision:'rework',note:n});toast('Sent back for rework');closeM();go('tasks');},'light'],
    ['✓ Accept, mark done',async()=>{await api('taskReview',{id:t.id,decision:'accept',note:$('#rvN').value});toast('Accepted. Marked done 🎉');closeM();go('tasks');},'ok']]);};
};

/* ═════════════ MEETINGS & ATTENDANCE ═════════════ */
const ATT_COL={Present:'#13804b',Late:'#FFC83D',Excused:'#F59E0B',Absent:'#EB0028','N.A.':'#101B3D'};
function donutHTML(stats){
  const c=stats.counts||{},keys=Object.keys(ATT_COL),tot=keys.reduce((s,k)=>s+(c[k]||0),0);
  let a=0;const R=54,C=2*Math.PI*R;
  const segs=tot?keys.filter(k=>c[k]).map(k=>{const f=c[k]/tot,s=`<circle r="${R}" cx="75" cy="75" fill="none" stroke="${ATT_COL[k]}" stroke-width="22" stroke-dasharray="${f*C} ${C}" stroke-dashoffset="${-a*C}" transform="rotate(-90 75 75)"/>`;a+=f;return s;}).join(''):`<circle r="${R}" cx="75" cy="75" fill="none" stroke="#eee" stroke-width="22"/>`;
  const months=(stats.months||[]);
  return `<div class="donut"><svg viewBox="0 0 150 150">${segs}<text x="75" y="72" text-anchor="middle" font-family="Anton,Impact" font-size="30" fill="#101B3D">${stats.rate==null?'—':stats.rate+'%'}</text><text x="75" y="92" text-anchor="middle" font-size="11" fill="#6b6b6b">attended</text></svg>
    <div class="lg">${keys.map(k=>`<span><i style="background:${ATT_COL[k]}"></i>${k}: <b>${c[k]||0}</b></span>`).join('')}<span class="gx-note">Excused counts as attended. N.A. is left out.</span></div>
    ${months.length?`<div class="mbars" title="Monthly attendance">${months.map(m=>`<div><b style="height:${Math.max(4,m.rate*.7)}px;background:${m.rate>=75?'#13804b':m.rate>=50?'#FFC83D':'#EB0028'}"></b>${m.month.slice(5)}/${m.month.slice(2,4)}<span>${m.rate}%</span></div>`).join('')}</div>`:''}</div>`;
}
window.donutHTML=donutHTML;
VIEWS.meetings=async function(){
  const j=await api('meetList'); let tab='up';
  if(j.canManage) addBtn('+ New meeting',()=>edit({minutes:'60',audience:'all',meet:true}));
  const audName=a=>{a=String(a||'all');if(a==='all')return 'Everyone';return a.split(',').map(x=>x.startsWith('dept:')?((j.departments.find(d=>'dept:'+d.id===x)||{}).name||x):((j.people.find(p=>p.email===x)||{}).name||x)).join(', ');};
  const now=istNow();
  const paint=()=>{const up=j.rows.filter(m=>String(m.starts_at)>=now.slice(0,10)).reverse(),past=j.rows.filter(m=>String(m.starts_at)<now.slice(0,10));
    const list=tab==='up'?up:past;
    $('#view').innerHTML=`<div class="two" style="margin-bottom:18px"><div class="panel" style="padding:18px"><h3 style="margin-bottom:10px">My attendance</h3>${donutHTML(j.stats)}</div>
      <div class="panel" style="padding:18px"><h3>Next up</h3>${up[0]?`<p style="font-size:20px;font-weight:800;margin:8px 0 2px">${esc(up[0].title)}</p><p class="muted">${fmtDT(up[0].starts_at)} · ${esc(up[0].minutes)} min · ${esc(up[0].location||'Online')}</p>${up[0].link?`<a class="btn red" style="margin-top:12px" href="${esc(up[0].link)}" target="_blank" rel="noopener">Join meeting ↗</a>`:''}`:'<p class="muted" style="margin-top:8px">No meetings scheduled.</p>'}</div></div>
      ${tabs([['up','Upcoming ('+up.length+')'],['past','Past ('+past.length+')']],tab,'mtTabs')}
      ${list.length?`<div class="gx-grid">${list.map(m=>`<div class="gx-card"><div class="row">${m.my_status?badge(m.my_status):''}${m.link?'<span class="badge">Google Meet</span>':''}<span class="badge">${esc(audName(m.audience))}</span></div>
        <h4>${esc(m.title)}</h4><div class="meta">${fmtDT(m.starts_at)} · ${esc(m.minutes)} min${m.location?' · '+esc(m.location):''}</div>${m.agenda?`<div class="meta" style="white-space:pre-wrap">${esc(String(m.agenda).slice(0,200))}</div>`:''}
        ${j.canManage?`<div class="meta">${m.marked||0} of ${m.audience_size||0} marked</div>`:''}
        <div class="acts">${m.link&&tab==='up'?`<a class="btn sm red" href="${esc(m.link)}" target="_blank" rel="noopener">Join ↗</a>`:''}${j.canManage?`<button class="btn sm" data-a="${esc(m.id)}">Attendance</button><button class="btn sm light" data-e="${esc(m.id)}">Edit</button>`:''}</div></div>`).join('')}</div>`:'<div class="panel"><div class="empty">Nothing here.</div></div>'}`;
    $('#mtTabs').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;paint();});
    $('#view').querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>edit(j.rows.find(m=>m.id===b.dataset.e)));
    $('#view').querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>mark(b.dataset.a));};
  const edit=m=>{const aud=String(m.audience||'all').split(','),all=aud.includes('all');const d=String(m.starts_at||istNow(1440).slice(0,11)+'17:00');
    modal(m.id?'Edit meeting':'New meeting',`<div class="grid2"><label style="grid-column:1/-1">Title<input id="mT" value="${esc(m.title||'')}" placeholder="e.g. Weekly core team sync"></label>
      <label>Date<input id="mD" type="date" value="${esc(d.slice(0,10))}"></label><label>Time (IST)<input id="mH" type="time" value="${esc(d.slice(11,16))}"></label>
      <label>Duration (minutes)<input id="mM" type="number" value="${esc(m.minutes||60)}"></label><label>Place (optional)<input id="mL" value="${esc(m.location||'')}" placeholder="Online / venue"></label>
      <label style="grid-column:1/-1">Agenda<textarea id="mA">${esc(m.agenda||'')}</textarea></label>
      <label class="chk" style="grid-column:1/-1"><input type="checkbox" id="mG" ${m.link||m.meet?'checked':''}> Add a Google Meet link and send calendar invites</label>
      <label style="grid-column:1/-1">Or paste your own meeting link<input id="mK" value="${esc(m.link||'')}" placeholder="https://"></label></div>
      <div style="margin-top:10px"><b style="font-size:13px">Who should attend</b><div class="chips"><label><input type="checkbox" class="au" value="all" ${all?'checked':''}> Everyone</label>${j.departments.map(x=>`<label><input type="checkbox" class="au" value="dept:${esc(x.id)}" ${aud.includes('dept:'+x.id)?'checked':''}> ${esc(x.name)}</label>`).join('')}</div>
      <details><summary class="gx-note" style="cursor:pointer">Pick individual people</summary><div class="chips">${j.people.map(p=>`<label><input type="checkbox" class="au" value="${esc(p.email)}" ${aud.includes(p.email)?'checked':''}> ${esc(p.name||p.email)}</label>`).join('')}</div></details></div>
      <label class="chk" style="margin-top:6px"><input type="checkbox" id="mNo" checked> Email everyone invited</label>`,[
      m.id&&['Delete',async()=>{if(!confirm('Delete this meeting? Invitees are told if it was upcoming.'))return;await api('meetRemove',{id:m.id});toast('Deleted');closeM();go('meetings');},'bad left'],
      ['Save',async()=>{const audience=[...$('#mBox').querySelectorAll('.au:checked')].map(x=>x.value);
        const r=await api('meetSave',{id:m.id,title:val('#mT'),starts_at:val('#mD')+'T'+val('#mH'),minutes:val('#mM'),location:val('#mL'),agenda:$('#mA').value,link:val('#mK'),meet:$('#mG').checked,audience,notify:$('#mNo').checked});
        toast('Meeting saved'+(r.link?' · Meet link ready':''));closeM();go('meetings');}]]);};
  const mark=async id=>{const d=await api('meetAttendance',{id});const marks={};d.rows.forEach(r=>marks[r.email]=r.status);
    modal('Attendance: '+d.meeting.title,`<p class="muted" style="font-size:13px">${fmtDT(d.meeting.starts_at)}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm light" id="allP">Mark all Present</button></div>
      <div class="att">${d.rows.map(r=>`<div class="r"><span><b>${esc(r.name)}</b><div class="muted" style="font-size:12px">${esc(r.email)}</div></span><div class="pills" data-e="${esc(r.email)}">${d.statuses.map(s=>`<button type="button" data-s="${s}" class="${marks[r.email]===s?'on':''}">${s}</button>`).join('')}</div></div>`).join('')||'<div class="empty">No one invited.</div>'}</div>`,
      [['Save attendance',async()=>{await api('meetMark',{id,marks});toast('Attendance saved');closeM();go('meetings');}]]);wide();
    const sync=()=>$('#mBox').querySelectorAll('.pills').forEach(p=>p.querySelectorAll('button').forEach(b=>b.classList.toggle('on',marks[p.dataset.e]===b.dataset.s)));
    $('#mBox').querySelectorAll('.pills button').forEach(b=>b.onclick=()=>{marks[b.parentNode.dataset.e]=b.dataset.s;sync();});
    $('#allP').onclick=()=>{d.rows.forEach(r=>{if(!marks[r.email])marks[r.email]='Present';});sync();};};
  paint();
};

/* dashboard: attendance + awards strip */
const _dash=VIEWS.dashboard;
VIEWS.dashboard=async function(){
  await _dash.call(VIEWS);
  try{const [m,a]=await Promise.all([api('meetList'),api('awList')]);const mine=a.rows.filter(x=>x.email===String(ME.email).toLowerCase());
    $('#view').insertAdjacentHTML('beforeend',`<div class="two" style="margin-top:14px"><div class="panel" style="padding:18px"><h3 style="margin-bottom:10px">My attendance</h3>${donutHTML(m.stats)}</div>
      <div class="panel" style="padding:18px"><h3 style="margin-bottom:10px">My awards</h3>${mine.length?mine.map(x=>`<div style="display:flex;gap:10px;align-items:center;padding:6px 0"><span style="font-size:24px">${x.award==='Torch Bearer Award'?'🔥':'🏆'}</span><span><b>${esc(x.award)}</b><div class="muted" style="font-size:12px">${fmt(x.awarded_at)}</div></span></div>`).join(''):'<p class="muted">No awards yet. Keep going ✦</p>'}</div></div>`);}catch(e){}
};

/* ═════════════ AWARDS ═════════════ */
VIEWS.awards=async function(){
  const j=await api('awList');
  if(j.canGrant) addBtn('+ Give an award',()=>grant());
  $('#view').innerHTML=hero('Awards','Recognition given by the Organizer for work that lights the way. The Torch Bearer Award is our highest honour.')+
    (j.rows.length?`<div class="gx-grid">${j.rows.map(x=>`<div class="aw ${x.award==='Torch Bearer Award'?'torch':''}"><div class="ic">${x.award==='Torch Bearer Award'?'🔥':'🏆'}</div><h4>${esc(x.award)}</h4><b style="font-size:16px">${esc(x.name)}</b><q>${esc(x.citation)}</q>
      <div class="meta" style="font-size:12px">${fmt(x.awarded_at)}${x.doc_id?' · certificate '+esc(x.doc_id):''}</div>${j.canGrant?`<div><button class="btn sm light" data-rv="${esc(x.id)}">Revoke</button></div>`:''}</div>`).join('')}</div>`:'<div class="panel"><div class="empty">No awards yet.</div></div>');
  $('#view').querySelectorAll('[data-rv]').forEach(b=>b.onclick=async()=>{if(!confirm('Revoke this award?'))return;await api('awRevoke',{id:b.dataset.rv});toast('Revoked');go('awards');});
  const grant=()=>modal('Give an award',`<label>Member<select id="awE">${j.people.map(p=>`<option value="${esc(p.email)}">${esc(p.name||p.email)}</option>`).join('')}</select></label>
    <label>Award<select id="awA">${j.types.map(t=>`<option>${esc(t)}</option>`).join('')}</select></label><label>Citation<textarea id="awC" placeholder="For carrying the Speaker Support team through…"></textarea></label>
    <label class="chk"><input type="checkbox" id="awK" checked> Also issue an Award Certificate from the Office of the Registrar</label>`,[
    ['Give award',async()=>{await api('awGrant',{email:val('#awE'),award:val('#awA'),citation:val('#awC'),certificate:$('#awK').checked});toast('Award given 🏆');closeM();go('awards');}]]);
};

/* ═════════════ GRIEVANCES ═════════════ */
VIEWS.grievances=async function(){
  const j=await api('grvList');
  if(!j.isAdmin) addBtn('+ Raise a concern',()=>raise());
  $('#view').innerHTML=hero('Grievances',j.isAdmin?'Every case is private between the member and the Organizer.':'Raise a concern privately with the Organizer. You get a case ID and can follow up here. Only you and the Organizer can see it.')+
    `<div class="panel">${tableHTML(j.rows,[['id','Case',v=>`<span class="mono">${esc(v)}</span>`],['subject','Subject',(v,_,r)=>`<b>${esc(v)}</b><div class="muted">${esc(r.category)}${j.isAdmin?' · '+esc(r.name):''}</div>`],['status','Status',badge],['messages','Messages'],['last_at','Last activity',fmt]],{},1)}</div>`;
  $('#view').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>thread(j.rows[tr.dataset.i].id));
  const raise=()=>modal('Raise a concern',`<label>Subject<input id="gS" placeholder="A short title"></label><label>Category<select id="gC">${j.categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label>
    <label>What happened?<textarea id="gB" style="min-height:140px" placeholder="Describe the concern, with dates and people involved if relevant."></textarea></label><label>Links to evidence (optional)<input id="gL" placeholder="https://"></label>`,[
    ['Submit privately',async()=>{const r=await api('grvNew',{subject:val('#gS'),category:val('#gC'),body:$('#gB').value,links:val('#gL')});toast('Case '+r.id+' opened');closeM();thread(r.id);}]]);
  const thread=async id=>{const d=await api('grvThread',{id});const g=d.case,mine=String(ME.email).toLowerCase();
    modal(g.id+' · '+g.subject,`<div class="row" style="display:flex;gap:6px;margin-bottom:8px">${badge(g.status)}<span class="badge">${esc(g.category)}</span>${d.isAdmin?`<span class="badge">${esc(g.name)}</span>`:''}</div>
      <div class="thread" id="gTh">${d.messages.map(m=>m.from_email==='system'?`<div class="bub sys">${esc(m.body)} · ${fmt(m.created_at)}</div>`:`<div class="bub ${m.from_email===mine?'me':''}"><small>${esc(m.from_name)} · ${fmt(m.created_at)}</small>${nl(m.body)}${m.links?`<br><a href="${esc(m.links)}" target="_blank" rel="noopener" style="color:inherit">↗ ${esc(m.links)}</a>`:''}</div>`).join('')}</div>
      ${g.status==='Closed'&&!d.isAdmin?'<div class="banner">This case is closed. You can reopen it if the matter isn’t settled.</div>':`<label>Reply<textarea id="gR" placeholder="Write a reply"></textarea></label>`}
      ${d.isAdmin?`<label>Status after reply<select id="gSt">${d.statuses.map(s=>`<option ${s===g.status?'selected':''}>${s}</option>`).join('')}</select></label>`:''}`,[
      ['Print transcript',()=>printHTML(g.id,`<h1>Grievance ${esc(g.id)}: ${esc(g.subject)}</h1><p>${esc(g.name)} · ${esc(g.category)} · status ${esc(g.status)} · opened ${esc(String(g.created_at).slice(0,10))}</p>${d.messages.map(m=>`<div class="m"><small>${esc(m.from_name)} · ${esc(String(m.created_at).replace('T',' ').slice(0,16))}</small><div>${nl(m.body)}</div></div>`).join('')}<p style="color:#666;font-size:12px">Confidential. Printed ${new Date().toLocaleString('en-IN')}.</p>`),'light left'],
      !d.isAdmin&&['Resolved','Closed'].includes(g.status)&&['Reopen case',async()=>{await api('grvStatus',{id:g.id,status:'Open'});toast('Reopened');closeM();thread(g.id);},'light'],
      d.isAdmin&&['Set status only',async()=>{await api('grvStatus',{id:g.id,status:val('#gSt')});toast('Status updated');closeM();go('grievances');},'light'],
      (g.status!=='Closed'||d.isAdmin)&&['Send reply',async()=>{const r=val('#gR');if(!r)return toast('Write a reply',1);await api('grvReply',{id:g.id,body:r,status:d.isAdmin?val('#gSt'):''});toast('Reply sent');closeM();thread(g.id);}]]);
    wide();const th=$('#gTh');th.scrollTop=th.scrollHeight;};
  const hid=new URLSearchParams(location.search).get('case');if(hid)thread(hid);
};

/* ═════════════ MY DOCUMENTS ═════════════ */
VIEWS.mydocs=async function(){
  const j=await api('myDocs');
  addBtn('+ Request a letter or certificate',()=>req());
  $('#view').innerHTML=hero('My documents','Letters, certificates and IDs issued to you by the Office of the Registrar. Every one carries a code anyone can check at tedxthaltejyouth.in/verify.')+
    `<div class="gx-sec">Issued to you</div>${j.rows.length?`<div class="gx-grid">${j.rows.map((d,i)=>`<div class="gx-card"><div class="row">${badge(d.status)}<span class="badge">${esc(d.label)}</span></div><h4>${esc(d.title)}</h4>
      <div class="meta">${esc(d.id)} · issued ${fmt(d.issued_at)}</div><div class="meta">Verification code <b class="mono" style="color:var(--ink)">${esc(d.code)}</b></div>${d.status==='Void'?`<div class="meta" style="color:var(--bad)">Void: ${esc(d.void_reason)}</div>`:''}
      <div class="acts">${d.has_file?`<button class="btn sm red" data-dl="${i}">⇩ Download PDF</button>`:''}<button class="btn sm light" data-cp="${i}">Copy verify link</button></div></div>`).join('')}</div>`:'<div class="panel"><div class="empty">Nothing issued to you yet.</div></div>'}
    <div class="gx-sec">My requests</div><div class="panel">${tableHTML(j.requests,[['id','Request',v=>`<span class="mono">${esc(v)}</span>`],['type','Document',v=>esc((j.requestable.find(x=>x.id===v)||{}).label||v)],['purpose','Purpose'],['status','Status',badge],['registrar_note','Note from the Registrar'],['created_at','Asked',fmt]],{})}</div>`;
  $('#view').querySelectorAll('[data-dl]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{dlPdf(await api('regPdf',{id:j.rows[b.dataset.dl].id}));}catch(e){toast(e.message,1);}b.disabled=false;});
  $('#view').querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>copy(SITE+'/verify/?c='+j.rows[b.dataset.cp].code,'Verify link copied'));
  const req=()=>modal('Request a letter or certificate',`<p class="gx-note">Under Charter 11.3 and 14.3 the Office of the Registrar checks your eligibility and issues it on the official letterhead, signed by the Organizer & Licensee.</p>
    <label>What do you need?<select id="rqT">${j.requestable.map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select></label>
    <label>What is it for?<input id="rqP" placeholder="e.g. university application, internship"></label><label>Details for the Registrar<textarea id="rqD" placeholder="Role, period, contributions to mention, who it should be addressed to…"></textarea></label>`,[
    ['Send request',async()=>{const r=await api('reqNew',{type:val('#rqT'),purpose:val('#rqP'),details:$('#rqD').value});toast('Request '+r.id+' sent to the Registrar');closeM();go('mydocs');}]]);
};

/* ═════════════ CHARTER & COUNCIL ═════════════ */
let govTab='el';
VIEWS.charter=async function(){
  const g=await api('govBoot');
  const T=[['el','Elections ('+g.elections.length+')'],['rti','Right to Information'],['mo','Hearings & reviews'],['wd','Withdrawal']];
  const draw=()=>{$('#tools').innerHTML='';
    $('#view').innerHTML=hero('Charter & Council',`The tools the TEDxThaltej Charter gives every member. The Council has <b>${g.councilSize}</b> active members today${g.isRegistrar?' · you hold the Office of the Registrar':''}.`)+tabs(T,govTab,'gvT')+'<div id="gvB"></div>';
    $('#gvT').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{govTab=b.dataset.t;draw();});
    ({el:elections,rti,mo:motions,wd:withdrawal})[govTab]();};
  const reload=async()=>{Object.assign(g,await api('govBoot'));draw();};

  function elections(){const B=$('#gvB');
    if(g.isSuper) addBtn('+ Invoke a selection',()=>elEdit({}));
    B.innerHTML=(g.elections.length?`<div class="gx-grid">${g.elections.map((e,i)=>{const top=e.candidates.slice().sort((a,b)=>(b.votes||0)-(a.votes||0));
      return `<div class="gx-card"><div class="row">${badge(e.phase)}${e.verified_at?'<span class="badge b-Valid">Count verified</span>':''}${e.override?'<span class="badge">Organizer override</span>':''}</div><h4>${esc(e.title)}</h4><div class="meta">Role: <b>${esc(e.role)}</b></div>
        <div class="meta">Apply by ${fmtDT(e.apply_until)} · Vote ${fmtDT(e.vote_from)} – ${fmtDT(e.vote_until)}</div>
        <div class="meta">${e.candidates.length} candidate${e.candidates.length===1?'':'s'} · turnout ${e.turnout}${e.council?' of '+e.council:''}</div>
        ${e.candidates[0]&&e.candidates[0].votes!=null?`<div style="display:grid;gap:4px">${top.map(c=>`<div style="font-size:13px"><b>${esc(c.name)}</b> · ${c.votes} vote${c.votes===1?'':'s'}<div class="gx-prog"><i style="width:${e.turnout?c.votes/e.turnout*100:0}%"></i></div></div>`).join('')}</div>`:''}
        ${e.phase==='Confirmed'?`<div class="meta">Outcome: <b>${esc(e.confirmed_name)}</b>${e.override_reason?' · reason recorded: '+esc(e.override_reason):''}</div>`:''}
        <div class="acts"><button class="btn sm light" data-o="${i}">Open</button>${e.phase==='Applications open'&&!g.isSuper?(e.applied?`<button class="btn sm light" data-wa="${i}">Withdraw my application</button>`:`<button class="btn sm red" data-ap="${i}">Apply</button>`):''}
          ${e.phase==='Voting'&&!g.isSuper&&!e.voted?`<button class="btn sm red" data-v="${i}">Cast your vote</button>`:''}${e.voted?'<span class="badge b-Valid">You voted ✓</span>':''}
          ${e.phase==='Counting'&&g.isRegistrar&&!e.verified_at?`<button class="btn sm" data-vf="${i}">Verify the count</button>`:''}${e.phase==='Counting'&&g.isSuper?`<button class="btn sm red" data-cf="${i}">Confirm outcome</button>`:''}
          ${g.isSuper&&['Draft','Open','Applications open','Applications closed'].includes(e.phase)?`<button class="btn sm light" data-ed="${i}">Edit</button>`:''}</div></div>`;}).join('')}</div>`:'<div class="panel"><div class="empty">No selection processes yet. The Organizer invokes one when a role needs Council input (Article 7).</div></div>')+
      `<p class="gx-note" style="margin-top:14px">Votes are secret and one per member. Campaigning and lobbying are not permitted and proceedings are confidential (7.8). The Registrar verifies the count; the outcome is a recommendation the Organizer confirms, or selects otherwise with a recorded reason (7.6, 7.7).</p>`;
    const E=i=>g.elections[i];
    B.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>elOpen(E(b.dataset.o)));
    B.querySelectorAll('[data-ap]').forEach(b=>b.onclick=()=>elApply(E(b.dataset.ap)));
    B.querySelectorAll('[data-wa]').forEach(b=>b.onclick=async()=>{if(!confirm('Withdraw your application?'))return;await api('elWithdrawApp',{id:E(b.dataset.wa).id});toast('Application withdrawn');reload();});
    B.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>elVote(E(b.dataset.v)));
    B.querySelectorAll('[data-vf]').forEach(b=>b.onclick=async()=>{const r=await api('elVerify',{id:E(b.dataset.vf).id});toast(`Count verified: ${r.votes} votes${r.flagged?' · '+r.flagged+' flagged':''}`);reload();});
    B.querySelectorAll('[data-cf]').forEach(b=>b.onclick=()=>elConfirm(E(b.dataset.cf)));
    B.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>elEdit(E(b.dataset.ed)));}
  const candHTML=c=>`<div class="gx-card" style="box-shadow:none;margin-bottom:8px"><h4>${esc(c.name)}${c.votes!=null?` · ${c.votes} votes`:''}</h4><div class="meta"><b>Intent</b><br>${nl(c.intent)}</div><div class="meta"><b>Experience</b><br>${nl(c.experience)}</div><div class="meta"><b>Plan for the role</b><br>${nl(c.vision)}</div>${c.links?`<a href="${esc(c.links)}" target="_blank" rel="noopener" style="font-size:13px">↗ ${esc(c.links)}</a>`:''}</div>`;
  const elOpen=e=>{modal(e.title,`<div class="row" style="display:flex;gap:6px">${badge(e.phase)}</div>${e.description?`<p style="white-space:pre-wrap">${esc(e.description)}</p>`:''}<dl class="kv"><dt>Role</dt><dd>${esc(e.role)}</dd><dt>Applications</dt><dd>until ${fmtDT(e.apply_until)}</dd><dt>Voting</dt><dd>${fmtDT(e.vote_from)} – ${fmtDT(e.vote_until)}</dd>${e.verified_at?`<dt>Verified</dt><dd>by the Registrar · ${fmt(e.verified_at)}</dd>`:''}</dl>
    <div class="gx-sec" style="font-size:16px">Candidates</div>${e.candidates.map(candHTML).join('')||'<p class="muted">No applications yet.</p>'}`,[]);wide();};
  const elEdit=e=>{const dl=istNow(7*1440),vf=istNow(8*1440),vu=istNow(10*1440);
    modal(e.id?'Edit selection':'Invoke a selection process',`<p class="gx-note">Article 7.2(A): name the role and set the application deadline and voting window. The Council is emailed when you publish.</p>
      <div class="grid2"><label style="grid-column:1/-1">Title<input id="eT" value="${esc(e.title||'')}" placeholder="Selection: Head of Curation 2027"></label><label style="grid-column:1/-1">Role under consideration<input id="eR" value="${esc(e.role||'')}" placeholder="Head of Curation"></label>
      <label>Applications close<input id="eA" type="datetime-local" value="${esc(e.apply_until||dl.slice(0,11)+'20:00')}"></label><label>Voting opens<input id="eF" type="datetime-local" value="${esc(e.vote_from||vf.slice(0,11)+'10:00')}"></label>
      <label>Voting closes<input id="eU" type="datetime-local" value="${esc(e.vote_until||vu.slice(0,11)+'20:00')}"></label><label style="grid-column:1/-1">Description and eligibility<textarea id="eD">${esc(e.description||'')}</textarea></label></div>`,[
      ['Save draft',async()=>{await api('elSave',{id:e.id,title:val('#eT'),role:val('#eR'),apply_until:val('#eA'),vote_from:val('#eF'),vote_until:val('#eU'),description:$('#eD').value,publish:false});toast('Draft saved');closeM();reload();},'light'],
      ['Publish to the Council',async()=>{await api('elSave',{id:e.id,title:val('#eT'),role:val('#eR'),apply_until:val('#eA'),vote_from:val('#eF'),vote_until:val('#eU'),description:$('#eD').value,publish:true});toast('Published. The Council has been emailed.');closeM();reload();}]]);};
  const elApply=e=>modal('Apply: '+e.role,`<p class="gx-note">Article 7.3(b) asks for all three. Your application is seen by the Council during voting.</p>
    <label>Statement of intent<textarea id="aI" placeholder="Why you want this role"></textarea></label><label>Relevant experience<textarea id="aE"></textarea></label><label>Your plan for the role<textarea id="aV"></textarea></label><label>Portfolio link (optional)<input id="aL" placeholder="https://"></label>`,[
    ['Submit application',async()=>{await api('elApply',{id:e.id,intent:$('#aI').value,experience:$('#aE').value,vision:$('#aV').value,links:val('#aL')});toast('Application submitted');closeM();reload();}]]);
  const elVote=e=>{modal('Secret ballot: '+e.role,`<p class="gx-note">One member, one vote. Your choice is recorded without being shown to anyone, and it cannot be changed once cast.</p>
    ${e.candidates.map(c=>`<label class="chk" style="border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:6px"><input type="radio" name="vc" value="${esc(c.id)}"> <b>${esc(c.name)}</b></label>`).join('')}
    <details><summary class="gx-note" style="cursor:pointer">Read the applications</summary>${e.candidates.map(candHTML).join('')}</details>`,[
    ['Cast my vote',async()=>{const c=$('#mBox').querySelector('[name=vc]:checked');if(!c)return toast('Choose a candidate',1);if(!confirm('Cast your vote? It cannot be changed.'))return;await api('elVote',{id:e.id,choice:c.value});toast('Vote cast ✓');closeM();reload();}]]);wide();};
  const elConfirm=e=>modal('Confirm outcome: '+e.role,`<p class="gx-note">The vote is a recommendation (7.6). Selecting someone other than the top candidate, or no one, needs a recorded reason.</p>
    <label>Appoint<select id="cC">${e.candidates.slice().sort((a,b)=>b.votes-a.votes).map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${c.votes} votes</option>`).join('')}<option value="">— No appointment —</option></select></label>
    <label>Reason (needed for an override)<textarea id="cR"></textarea></label>${e.verified_at?'':'<div class="banner">The Registrar has not verified the count yet.</div>'}`,[
    ['Confirm',async()=>{await api('elConfirm',{id:e.id,candidate:val('#cC'),reason:$('#cR').value});toast('Outcome confirmed');closeM();reload();}]]);

  function rti(){const B=$('#gvB');
    if(!g.isSuper) addBtn('+ Ask the Organizer',()=>rtiNew());
    B.innerHTML=`<p class="gx-note" style="margin-bottom:12px">Article 23.3: any member may ask the Organizer for clarification, reasoning or context on decisions. If anything is withheld for confidentiality, the 16.2.2 category must be named (27.5).</p>`+
      (g.rti.length?`<div class="gx-grid">${g.rti.map((r,i)=>`<div class="gx-card"><div class="row">${badge(String(r.status).replace(/ \(.*/,''))}${/withheld/.test(r.status)?'<span class="badge">Part withheld</span>':''}<span class="mono" style="font-size:12px">${esc(r.id)}</span></div><h4>${esc(r.subject)}</h4>
        <div class="meta">${g.isSuper||g.isRegistrar?esc(r.name)+' · ':''}${fmt(r.created_at)}${r.matter?' · '+esc(r.matter):''}</div><div class="meta" style="color:var(--ink)">${nl(r.question)}</div>
        ${r.answer?`<div class="log" style="white-space:normal"><b>Answer</b><br>${nl(r.answer)}${r.withheld?`<br><br><i>Withheld: ${esc(r.withheld)} · ${esc(r.withheld_category)}</i>`:''}</div>`:''}
        ${g.isSuper&&!r.answer?`<div class="acts"><button class="btn sm red" data-an="${i}">Answer</button></div>`:''}</div>`).join('')}</div>`:'<div class="panel"><div class="empty">No RTI requests.</div></div>');
    B.querySelectorAll('[data-an]').forEach(b=>b.onclick=()=>rtiAnswer(g.rti[b.dataset.an]));}
  const rtiNew=()=>modal('Right to Information request',`<label>Subject<input id="rS" placeholder="e.g. How speakers were shortlisted for 2027"></label><label>Decision or matter it concerns (optional)<input id="rM"></label><label>Your question<textarea id="rQ" style="min-height:130px"></textarea></label>`,[
    ['Submit',async()=>{const r=await api('rtiNew',{subject:val('#rS'),matter:val('#rM'),question:$('#rQ').value});toast('Submitted as '+r.id);closeM();reload();}]]);
  const rtiAnswer=r=>modal('Answer '+r.id,`<p><b>${esc(r.subject)}</b></p><div class="log">${esc(r.question)}</div><label>Answer<textarea id="aA" style="min-height:130px"></textarea></label>
    <label>Anything withheld? (optional)<input id="aW" placeholder="Describe what is withheld"></label><label>Confidentiality category<select id="aC"><option value="">—</option>${Object.entries(g.rtiCategories).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></label>`,[
    ['Send answer',async()=>{await api('rtiAnswer',{id:r.id,answer:$('#aA').value,withheld:val('#aW'),category:val('#aC')});toast('Answered');closeM();reload();}]]);

  function motions(){const B=$('#gvB');
    if(!g.isSuper) addBtn('+ Request a hearing or review',()=>moNew());
    B.innerHTML=`<p class="gx-note" style="margin-bottom:12px">An Institutional Hearing (23.4) or an Exceptional Constitutional Review (Article 24) needs the support of two-thirds of the Council, counted on the day it opens (27.7.1), within 14 days. The Registrar verifies the support (27.7.2).</p>`+
      (g.motions.length?`<div class="gx-grid">${g.motions.map((m,i)=>`<div class="gx-card"><div class="row">${badge(m.status)}<span class="badge">${m.type==='review'?'Constitutional Review':'Institutional Hearing'}</span><span class="mono" style="font-size:12px">${esc(m.id)}</span></div><h4>${esc(m.title)}</h4>
        <div class="meta">Raised by ${esc(m.proposer)} · ${fmt(m.created_at)}${m.status==='Gathering support'?' · closes '+fmt(m.closes_at):''}</div>
        <div><div class="meta" style="margin-bottom:4px"><b style="color:var(--ink)">${m.support}</b> of ${m.needed} needed (Council ${m.council_size})</div><div class="gx-prog"><i style="width:${Math.min(100,m.support/Math.max(1,m.needed)*100)}%"></i></div></div>
        ${m.outcome?`<div class="log" style="white-space:normal"><b>Outcome</b><br>${nl(m.outcome)}</div>`:''}
        <div class="acts"><button class="btn sm light" data-o="${i}">Read</button>${!g.isSuper&&m.status==='Gathering support'?(m.supported?`<button class="btn sm light" data-u="${i}">Withdraw support</button>`:`<button class="btn sm red" data-s="${i}">Add my support</button>`):''}
          ${g.isRegistrar&&m.status==='Threshold met'?`<button class="btn sm" data-vf="${i}">Verify support</button>`:''}${(g.isSuper||g.isRegistrar)&&['Hearing invoked','Referred to IDC Chairperson'].includes(m.status)?`<button class="btn sm light" data-cl="${i}">Record outcome</button>`:''}</div></div>`).join('')}</div>`:'<div class="panel"><div class="empty">No motions.</div></div>');
    const M=i=>g.motions[i];
    B.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{const m=M(b.dataset.o);modal(m.title,`<p class="gx-note">${m.type==='review'?'Exceptional Constitutional Review':'Institutional Hearing'} · ${esc(m.id)}</p><div class="log" style="white-space:normal">${nl(m.matter)}</div>
      ${m.grounds.length?`<b style="font-size:13px">Grounds (24.3.2)</b><ul style="margin:4px 0 0 18px;font-size:13px">${m.grounds.map(x=>`<li>${esc(g.reviewGrounds[x]||x)}</li>`).join('')}</ul>`:''}${m.facts?`<b style="font-size:13px">Factual basis</b><div class="log">${esc(m.facts)}</div>`:''}${m.prior_hearing?`<b style="font-size:13px">Prior hearing</b><div class="log">${esc(m.prior_hearing)}</div>`:''}`,[]);wide();});
    B.querySelectorAll('[data-s]').forEach(b=>b.onclick=async()=>{await api('moSupport',{id:M(b.dataset.s).id,on:true});toast('Support added');reload();});
    B.querySelectorAll('[data-u]').forEach(b=>b.onclick=async()=>{await api('moSupport',{id:M(b.dataset.u).id,on:false});toast('Support withdrawn');reload();});
    B.querySelectorAll('[data-vf]').forEach(b=>b.onclick=async()=>{const r=await api('moVerify',{id:M(b.dataset.vf).id});toast(r.passed?`Verified: ${r.valid} of ${r.needed} needed. The Organizer has been told.`:`Short: only ${r.valid} valid of ${r.needed}. Back to gathering support.`,!r.passed);reload();});
    B.querySelectorAll('[data-cl]').forEach(b=>b.onclick=async()=>{const o=await ask('Record the outcome','Outcome or key observations (23.6.2)',1);if(o==null)return;await api('moClose',{id:M(b.dataset.cl).id,outcome:o});toast('Closed');reload();});}
  const moNew=()=>{modal('Request a hearing or review',`<div class="tabsx" id="moT"><button data-t="hearing" class="on">Institutional Hearing</button><button data-t="review">Constitutional Review</button></div>
    <label>Title<input id="oT" placeholder="A short title for the matter"></label><label>The matter<textarea id="oM" style="min-height:110px" placeholder="What decision or conduct should be heard or reviewed, and why"></textarea></label>
    <div id="oR" class="hide"><b style="font-size:13px">Grounds under 24.3.2</b>${Object.entries(g.reviewGrounds).map(([k,v])=>`<label class="chk"><input type="checkbox" class="gr" value="${k}"> ${esc(v)}</label>`).join('')}
      <label>Factual basis for each ground (27.8.1(b))<textarea id="oF"></textarea></label><label>Was an Institutional Hearing held on this? If not, why? (27.8.1(c))<textarea id="oP"></textarea></label></div>`,[
    ['Open motion',async()=>{const type=$('#moT .on').dataset.t;const r=await api('moNew',{type,title:val('#oT'),matter:$('#oM').value,grounds:[...$('#mBox').querySelectorAll('.gr:checked')].map(x=>x.value),facts:$('#oF').value,prior_hearing:$('#oP').value});
      toast(r.id+' opened. The Council has been asked for support.');closeM();reload();}]]);
    $('#moT').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('#moT').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));$('#oR').classList.toggle('hide',b.dataset.t!=='review');});};

  function withdrawal(){const B=$('#gvB');
    const mine=g.withdrawals.filter(w=>w.email===g.me),pend=mine.find(w=>w.status==='Submitted');
    B.innerHTML=`<p class="gx-note" style="margin-bottom:12px">Article 10: a member may withdraw by submitting the formal Withdrawal Form, declaring pending responsibilities and handover. The Organizer acknowledges it, the Registrar issues the acknowledgement letter, and access ends. Confidentiality obligations continue (16.2.4).</p>`+
      (g.isSuper||g.isRegistrar?`<div class="panel">${tableHTML(g.withdrawals,[['id','Form',v=>`<span class="mono">${esc(v)}</span>`],['name','Member',(v,_,r)=>`<b>${esc(v)}</b><div class="muted">${esc(r.email)}</div>`],['status','Status',badge],['open_requests','Open requests',v=>v?`<span class="badge b-Open">${String(v).split(',').length} pending</span>`:'—'],['created_at','Submitted',fmt],['effective_date','Effective',v=>v?fmt(v):'—']],{},1)}</div>`:'')+
      (!g.isSuper?(pend?`<div class="gx-card" style="margin-top:14px"><div class="row">${badge('Submitted')}</div><h4>Your Withdrawal Form ${esc(pend.id)} is with the Organizer.</h4><div class="meta">Submitted ${fmt(pend.created_at)}. You’ll get the acknowledgement letter by email.</div></div>`:
        `<div class="gx-card" style="margin-top:14px;max-width:760px"><h4>Withdrawal Form</h4>
        <label class="chk"><input type="checkbox" id="wI"> I confirm that I intend to withdraw from TEDxThaltej Youth (10.2(a).2(a)).</label>
        <label class="chk"><input type="checkbox" id="wO"> I acknowledge my continuing obligations, including confidentiality (10.2(a).2(b), 16.2.4).</label>
        <label>Pending responsibilities (write “None” if there are none)<textarea id="wP"></textarea></label><label>Handover plan<textarea id="wH" placeholder="Who takes over what, and where the files are"></textarea></label>
        <label>Outstanding claims or dues (optional)<textarea id="wC"></textarea></label><label>Reason (optional)<textarea id="wR"></textarea></label>
        <label>Type your full name to sign: <b>${esc(ME.name)}</b><input id="wN" autocomplete="off"></label>
        <div class="sigbox"><b style="font-size:13px">Signature</b><canvas id="wSig"></canvas></div>
        <p class="gx-note">When you submit, we ask for your location and take a photo with your camera as signing evidence.</p>
        <div class="acts"><button class="btn red" id="wGo">Sign and submit</button></div></div>`):'');
    B.querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>{const w=g.withdrawals[tr.dataset.i];
      modal('Withdrawal '+w.id,`<dl class="kv"><dt>Member</dt><dd>${esc(w.name)} · ${esc(w.email)}</dd><dt>Status</dt><dd>${badge(w.status)}</dd><dt>Submitted</dt><dd>${fmt(w.created_at)}</dd></dl>
        <b style="font-size:13px">Pending responsibilities</b><div class="log">${esc(w.pending)}</div>${w.handover?`<b style="font-size:13px">Handover</b><div class="log">${esc(w.handover)}</div>`:''}${w.claims?`<b style="font-size:13px">Claims</b><div class="log">${esc(w.claims)}</div>`:''}${w.reason?`<b style="font-size:13px">Reason</b><div class="log">${esc(w.reason)}</div>`:''}
        ${w.open_requests?'<div class="banner">This member has pending letter or certificate requests. Settle them before withdrawal takes effect (10.3(b)).</div>':''}
        ${g.isSuper&&w.status==='Submitted'?`<label>Effective date<input type="date" id="wE" value="${today()}"></label><p class="gx-note">Acknowledging ends their portal access, removes them from the current team page and emails the acknowledgement letter from the Office of the Registrar.</p>`:''}`,[
        g.isSuper&&w.status==='Submitted'&&['Acknowledge withdrawal',async()=>{if(!confirm('Acknowledge? Their access ends.'))return;const r=await api('wdAck',{id:w.id,effective:val('#wE')});toast('Acknowledged'+(r.letter?' · letter '+r.letter.id+' issued':''));closeM();reload();}]]);});
    const cv=$('#wSig');if(!cv)return;const pad=TXSign.widget(cv,{name:()=>val('#wN')||ME.name});
    $('#wGo').onclick=async function(){
      if(!$('#wI').checked||!$('#wO').checked)return toast('Tick both confirmations',1);if(!val('#wP'))return toast('Declare pending responsibilities, or write None',1);
      if(val('#wN').toLowerCase()!==String(ME.name).trim().toLowerCase())return toast('Type your name exactly as: '+ME.name,1);if(pad.empty())return toast('Add your signature',1);
      if(!confirm('Submit your Withdrawal Form? This starts the end of your membership.'))return;
      let ev;try{ev=await TXSign.evidence({title:'Confirm it’s you before signing'});}catch(e){return toast('Signing cancelled',1);}ev.sig_method=pad.method;
      this.disabled=true;this.textContent='Submitting…';
      try{const r=await api('wdNew',{confirm_intent:true,ack_obligations:true,pending:val('#wP'),handover:val('#wH'),claims:val('#wC'),reason:val('#wR'),typedName:val('#wN'),signature:pad.data(),evidence:ev});
        toast('Withdrawal Form '+r.id+' submitted'+(r.pendingRequests?' · you have pending requests to settle':''));reload();}catch(e){toast(e.message,1);this.disabled=false;this.textContent='Sign and submit';}};}
  draw();
};

/* ═════════════ OFFICE OF THE REGISTRAR ═════════════ */
let regTab='issue',regPre=null;
const KIND_GROUP={letter:'Letters',cert:'Certificates',id:'Membership IDs',physical:'Physical documents'};
const DEFAULT_CERT_LINE={cert_event:'for attending and taking part in'};
function certPreview(type,T,f){
  const t=T.kind==='id';const nm=f.recipient_name||'Recipient Name';
  const ln=type==='cert_award'?(f.award?f.award+': ':'')+(f.line||'citation'):type==='cert_event'?(f.line||DEFAULT_CERT_LINE.cert_event)+' '+(f.event||'the event'):(f.line||'…');
  const title={cert_appreciation:'Of Appreciation',cert_participation:'Of Participation',cert_completion:'Of Completion',cert_event:'Of Participation',cert_award:'Award'}[type]||'';
  return `<div class="pv-cert ${t?'id':''}"><div class="c1"></div><div class="c2"></div><div class="c3"></div><div class="fr"></div><img class="wm" src="/assets/letterhead/watermark.png" alt=""><img class="lg" src="/assets/logo-black.png" alt=""><div class="no">No. TXTY/REG/${new Date().getFullYear()}/NNNN</div>
    <div class="mid">${t?`<div class="t1">${type==='vid'?'MEMBERSHIP ID':'EVENT ID'}</div><div class="t3" style="color:#EB0028;font-weight:700">${type==='vid'?'VID · permanent for the whole of your association':'E-VID · linked to VID '+esc(f.vid||'')}</div><div class="nm">${esc(nm)}</div><div class="bar"></div><div class="t1" style="color:#EB0028;font-size:4cqw">${type==='vid'?'TXTY-VID-NNNN':'TXTY-EVID-XXXX-XXXX'}</div><div class="t3">${esc([f.role,f.department,type==='vid'?(f.since?'Member since '+f.since:''):f.edition].filter(Boolean).join('  ·  '))}</div>`:
      `<div class="t1">CERTIFICATE</div><div class="t2">${esc(title.toUpperCase())}</div><div class="t3">${type==='cert_award'?'This award is presented to':'This certificate is presented to'}</div><div class="nm">${esc(nm)}</div><div class="bar"></div><div class="ln">${esc(ln)}${f.date_line?'<br>'+esc(f.date_line):''}</div>`}</div>
    <div class="foot"><div class="sg"><span class="sig">F. P. Shah</span><i></i><b>Fenil Pritesh Shah</b><br>Organizer & Licensee</div><img class="seal" src="/assets/letterhead/seal.png" alt=""><div class="qr"><b></b>Verify at tedxthaltejyouth.in/verify<br>TXTY-XXXX-XXXX</div></div></div>`;
}
function letterPreview(type,T,f){
  const d=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const body=f.body||(type==='notice'?'':'(The standard wording for a '+T.label.toLowerCase()+' is written for you from the fields on the left.)');
  return `<div class="pv-letter"><img class="hd" src="/assets/letterhead/header.png" alt=""><img class="wm" src="/assets/letterhead/watermark-faded.png" alt="">
    <div class="bd"><div class="ref"><span>Ref. TXTY/REG/${new Date().getFullYear()}/NNNN</span><span>${d}</span></div><div class="ttl">${esc(type==='notice'?(f.title||'Notice'):T.label)}</div>
    <div>${esc(f.addressee||(f.recipient_name?'Dear '+f.recipient_name+',':'To whom it may concern'))}</div><div class="tx">${esc(body)}</div>
    <div class="sgn"><div><span class="sig">F. P. Shah</span><br><b>Fenil Pritesh Shah</b><br>Organizer & Licensee, TEDxThaltej Youth</div><img src="/assets/letterhead/seal.png" alt=""></div>
    <div class="ref"><span>Verification code TXTY-XXXX-XXXX</span><span>tedxthaltejyouth.in/verify</span></div></div><img class="ft" src="/assets/letterhead/footer.png" alt=""></div>`;
}
VIEWS.registrar=async function(){
  if(!isReg()){$('#view').innerHTML='<div class="empty">Only the Registrar can open this.</div>';return;}
  const j=await api('regList'); let type=(regPre&&regPre.type)||'lor', q='', fT='', fS='';
  const TY=k=>j.types.find(t=>t.id===k)||{};
  const pending=j.requests.filter(r=>r.status==='Submitted').length;
  const T=[['issue','Issue'],['register','Register ('+j.rows.length+')'],['requests','Requests'+(pending?' ('+pending+')':'')],['sig','Signature & seal']];
  const draw=()=>{$('#tools').innerHTML='';
    $('#view').innerHTML=hero('Office of the Registrar','Issue letters, certificates and IDs on the official letterhead, signed by the Organizer & Licensee and sealed by this Office. Every document gets a register number and a code anyone can check at /verify.',
      `<img src="/assets/letterhead/seal.png" alt="" style="width:110px;border-radius:50%;background:#fff;border:3px solid #fff">`)+
      (j.hasSignature?'':'<div class="banner"><b>The Organizer’s signature is not set up yet.</b> Documents will carry the printed name only until it is added under “Signature & seal”.</div>')+
      tabs(T,regTab,'rgT')+'<div id="rgB"></div>';
    $('#rgT').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{regTab=b.dataset.t;draw();});
    ({issue,register,requests,sig})[regTab]();};

  function issue(){const B=$('#rgB'),ty=TY(type),pre=(regPre&&regPre.type===type)?regPre:null;
    const groups={};j.types.forEach(t=>(groups[t.kind]=groups[t.kind]||[]).push(t));
    B.innerHTML=Object.keys(groups).map(k=>`<div class="gx-note" style="font-weight:700;margin:4px 0">${KIND_GROUP[k]}</div><div class="gx-types">${groups[k].map(t=>`<button data-ty="${t.id}" class="${t.id===type?'on':''}">${esc(t.label)}<small>${t.kind==='letter'?'A4 letterhead':t.kind==='cert'?'Landscape certificate':t.kind==='id'?'ID card':'Seal codes'}</small></button>`).join('')}</div>`).join('')+
      `<div class="gx-issue"><div class="gx-form" id="rgF">${pre&&pre.request_id?`<div class="banner">Issuing for request <b>${esc(pre.request_id)}</b>. The member is told when it’s issued.</div>`:''}
        ${ty.kind!=='physical'?`<label>Fill from a team member<select id="rgPp"><option value="">— Choose (optional) —</option>${j.people.map(p=>`<option value="${esc(p.email)}">${esc(p.name||p.email)}</option>`).join('')}</select></label>`:''}
        ${type==='cert_event'?`<label>Side event<select id="rgEv"><option value="">— Choose —</option>${j.events.map(e=>`<option value="${esc(e.id)}">${esc(e.title)} · ${esc(e.date)}</option>`).join('')}</select></label>`:''}
        ${ty.fields.map(([k,lab,req,ph,kind])=>{const v=(pre&&pre.fields&&pre.fields[k])||'';return `<label class="${req?'req':''}"><span>${esc(lab)}</span>${kind==='textarea'||k==='highlights'?`<textarea data-f="${k}" placeholder="${esc(ph||'')}" style="${k==='body'?'min-height:160px':''}">${esc(v)}</textarea>`:`<input data-f="${k}" placeholder="${esc(ph||'')}" value="${esc(v)}">`}</label>`;}).join('')}
        ${ty.kind!=='physical'?'<label class="chk"><input type="checkbox" id="rgS" checked> Email the PDF to the recipient</label>':'<p class="gx-note">You get seal codes to stamp or write on each page. Anyone can check a seal code at /verify.</p>'}
        <div class="acts"><button class="btn red" id="rgGo">Issue ${esc(ty.label)}</button>${type==='cert_event'?'<button class="btn light" id="rgBulk">Issue to every registrant…</button>':''}</div></div>
        <div><div class="gx-note" style="margin-bottom:6px">Live preview (the PDF uses the same layout)</div><div id="rgV"></div></div></div>`;
    B.querySelectorAll('[data-ty]').forEach(b=>b.onclick=()=>{type=b.dataset.ty;regPre=null;issue();});
    const F=()=>{const o={};B.querySelectorAll('[data-f]').forEach(x=>o[x.dataset.f]=x.value.trim());return o;};
    const pv=()=>{const v=$('#rgV');if(!v)return;v.innerHTML=ty.kind==='letter'?letterPreview(type,ty,F()):ty.kind==='physical'?`<div class="gx-card"><h4>${esc(F().title||'Document title')}</h4><div class="meta">${esc(F().pages||1)} page(s) · ${esc(F().seals||1)} seal code(s): S-XXXX-01 …</div><img src="/assets/letterhead/seal.png" style="width:120px"></div>`:certPreview(type,ty,F());};
    B.querySelectorAll('[data-f]').forEach(x=>x.oninput=pv);
    if(pre&&pre.eventId&&$('#rgEv'))$('#rgEv').value=pre.eventId;pv();
    const set=(k,v)=>{const e=B.querySelector(`[data-f="${k}"]`);if(e&&v!=null){e.value=v;}};
    if($('#rgPp'))$('#rgPp').onchange=e=>{const p=j.people.find(x=>x.email===e.target.value);if(!p)return;set('recipient_name',p.name);set('recipient_email',p.email);set('department',(j.departments.find(d=>d.id===p.department_id)||{}).name||'');pv();};
    if($('#rgEv'))$('#rgEv').onchange=e=>{const ev=j.events.find(x=>x.id===e.target.value);if(!ev)return;set('event',ev.title);set('date_line',new Date(ev.date+'T12:00').toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}));pv();};
    $('#rgGo').onclick=async function(){this.disabled=true;const old=this.textContent;this.textContent='Issuing on the letterhead…';
      try{const r=await api('regIssue',{type,fields:F(),send:$('#rgS')?$('#rgS').checked:false,request_id:pre?pre.request_id:''});regPre=null;issued(r,ty);j.rows.unshift({id:r.id,code:r.code,type,title:ty.label+' — '+(F().recipient_name||F().title||''),recipient_name:F().recipient_name,status:'Valid',issued_at:new Date().toISOString(),seal_codes:(r.seal_codes||[]).join(','),file_id:ty.kind!=='physical'?'x':''});}
      catch(e){toast(e.message,1);}this.disabled=false;this.textContent=old;};
    if($('#rgBulk'))$('#rgBulk').onclick=()=>bulk(F());}
  const issued=(r,ty)=>{const link=SITE+'/verify/?c='+r.code;
    modal('Issued ✓',`<div style="text-align:center;display:grid;gap:8px;justify-items:center"><img src="/assets/letterhead/seal.png" style="width:110px"><div style="font-family:Anton,Impact;font-size:26px">${esc(r.id)}</div>
      <div>Verification code <b class="mono" style="font-size:18px">${esc(r.code)}</b></div>${r.vid?`<div>Member ID <b class="mono">${esc(r.vid)}</b></div>`:''}
      ${r.seal_codes&&r.seal_codes.length?`<div class="log" style="text-align:left;width:100%"><b>Seal codes: write one on each page</b>\n${r.seal_codes.map((c,i)=>'Page '+(i+1)+':  '+c).join('\n')}</div>`:''}</div>`,[
      ['Copy verify link',()=>copy(link,'Verify link copied'),'light'],ty.kind!=='physical'&&['⇩ Download PDF',async()=>dlPdf(await api('regPdf',{id:r.id}))]]);};
  const bulk=async f=>{const ev=$('#rgEv')&&j.events.find(x=>x.id===$('#rgEv').value);if(!ev)return toast('Choose the side event first',1);
    let regs;try{regs=(await api('evRegs',{id:ev.id})).rows;}catch(e){return toast('You need access to Side events to load registrants. '+e.message,1);}
    if(!regs.length)return toast('No registrants (registrations may already be deleted after 7 days)',1);
    modal('Certificates for '+ev.title,`<p class="gx-note">Untick anyone who did not attend. Each person gets their own certificate, code and email.</p><div class="chips" style="max-height:320px">${regs.map((r,i)=>`<label><input type="checkbox" class="bk" value="${i}" checked> ${esc(r.name)}</label>`).join('')}</div><div id="bkP" class="gx-note"></div>`,[
      ['Issue certificates',async()=>{const pick=[...$('#mBox').querySelectorAll('.bk:checked')].map(x=>regs[x.value]);let ok=0,bad=0;
        for(const r of pick){$('#bkP').textContent=`Issuing ${ok+bad+1} of ${pick.length}…`;try{await api('regIssue',{type:'cert_event',fields:Object.assign({},f,{recipient_name:r.name,recipient_email:r.email,event:f.event||ev.title}),send:true});ok++;}catch(e){bad++;}}
        toast(`${ok} certificate${ok===1?'':'s'} issued and emailed${bad?' · '+bad+' failed':''}`,!!bad);closeM();regTab='register';VIEWS.registrar();}]]);};

  function register(){const B=$('#rgB');
    searchBox('Search the register…',v=>{q=v;paint();});
    selectBox(j.types.map(t=>t.label),v=>{fT=(j.types.find(t=>t.label===v)||{}).id||'';paint();},'All types');
    selectBox(['Valid','Void'],v=>{fS=v;paint();},'Any status');
    addBtn('⇩ Export',()=>csv('register',rows().map(r=>({number:r.id,code:r.code,type:TY(r.type).label,title:r.title,recipient:r.recipient_name,email:r.recipient_email,issued:r.issued_at,status:r.status,void_reason:r.void_reason,seal_codes:r.seal_codes}))));
    const rows=()=>j.rows.filter(r=>match(r,q)&&(!fT||r.type===fT)&&(!fS||r.status===fS));
    const paint=()=>{const R=rows();B.innerHTML=`<div class="panel">${tableHTML(R,[['id','Number',(v,_,r)=>`<b class="mono">${esc(v)}</b><div class="muted mono">${esc(r.code)}</div>`],['type','Type',v=>esc(TY(v).label||v)],['recipient_name','Issued to',(v,_,r)=>`${esc(v||'—')}<div class="muted">${esc(r.recipient_email||'')}</div>`],['status','Status',badge],['issued_at','Issued',fmt]],{},1)}</div>`;
      B.querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>open(R[tr.dataset.i]));};
    const open=r=>{const link=SITE+'/verify/?c='+r.code;
      modal(r.id,`<dl class="kv"><dt>Type</dt><dd>${esc(TY(r.type).label||r.type)}</dd><dt>Title</dt><dd>${esc(r.title)}</dd><dt>Issued to</dt><dd>${esc(r.recipient_name||'—')} ${r.recipient_email?'· '+esc(r.recipient_email):''}</dd><dt>Code</dt><dd class="mono">${esc(r.code)}</dd>
        <dt>Status</dt><dd>${badge(r.status)}${r.void_reason?' '+esc(r.void_reason):''}</dd><dt>Issued</dt><dd>${fmt(r.issued_at)} by ${esc(r.issued_by||'')}</dd>${r.seal_codes?`<dt>Seal codes</dt><dd class="mono">${esc(String(r.seal_codes).replace(/,/g,', '))}</dd>`:''}${r.request_id?`<dt>Request</dt><dd>${esc(r.request_id)}</dd>`:''}</dl>`,[
        r.status==='Valid'&&['Void…',async()=>{const why=await ask('Void '+r.id,'Reason (shown to anyone who verifies it)',1,'e.g. Issued with a spelling mistake; reissued as …');if(why==null)return;await api('regVoid',{id:r.id,reason:why});r.status='Void';r.void_reason=why;toast('Voided');paint();},'bad left'],
        ['Copy verify link',()=>copy(link,'Verify link copied'),'light'],
        r.file_id&&r.recipient_email&&['Email again',async()=>{await api('regResend',{id:r.id});toast('Sent to '+r.recipient_email);},'light'],
        r.file_id&&['⇩ PDF',async()=>dlPdf(await api('regPdf',{id:r.id}))]]);};
    paint();}

  function requests(){const B=$('#rgB');let show='Submitted';
    const paint=()=>{const R=j.requests.filter(r=>show==='all'||r.status===show);
      B.innerHTML=`<div class="tabsx" id="rqF">${['Submitted','Issued','Declined','all'].map(s=>`<button data-s="${s}" class="${s===show?'on':''}">${s==='all'?'All':s}</button>`).join('')}</div>`+
        (R.length?`<div class="gx-grid">${R.map((r,i)=>`<div class="gx-card"><div class="row">${badge(r.status)}<span class="badge">${esc(TY(r.type).label||r.type)}</span><span class="mono" style="font-size:12px">${esc(r.id)}</span></div><h4>${esc(r.name)}</h4><div class="meta">${esc(r.email)} · ${fmt(r.created_at)}</div>
          <div class="meta"><b style="color:var(--ink)">For:</b> ${esc(r.purpose)}</div>${r.details?`<div class="meta" style="white-space:pre-wrap">${esc(r.details)}</div>`:''}${r.registrar_note?`<div class="meta">Note: ${esc(r.registrar_note)}</div>`:''}${r.doc_id?`<div class="meta">Issued as ${esc(r.doc_id)}</div>`:''}
          ${r.status==='Submitted'?`<div class="acts"><button class="btn sm red" data-is="${i}">Prepare & issue</button><button class="btn sm light" data-dc="${i}">Decline</button></div>`:''}</div>`).join('')}</div>`:'<div class="panel"><div class="empty">No requests here.</div></div>');
      $('#rqF').querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{show=b.dataset.s;paint();});
      B.querySelectorAll('[data-is]').forEach(b=>b.onclick=()=>{const r=R[b.dataset.is],p=j.people.find(x=>x.email===r.email)||{};
        regPre={type:r.type,request_id:r.id,fields:{recipient_name:r.name,recipient_email:r.email,department:(j.departments.find(d=>d.id===p.department_id)||{}).name||'',purpose:r.purpose}};type=r.type;regTab='issue';draw();});
      B.querySelectorAll('[data-dc]').forEach(b=>b.onclick=async()=>{const r=R[b.dataset.dc];const n=await ask('Decline '+r.id,'Why it can’t be issued (Charter 11.1 eligibility). The member is emailed this.',1);if(n==null)return;await api('reqDecline',{id:r.id,note:n});r.status='Declined';r.registrar_note=n;toast('Declined');paint();});};
    paint();}

  function sig(){const B=$('#rgB');
    B.innerHTML=`<div class="two"><div class="gx-form"><h3>Organizer’s signature</h3><p class="gx-note">Only the Organizer & Licensee signs documents. ${j.hasSignature?'A signature is on file. Saving a new one replaces it for documents issued from now on.':'No signature on file yet.'}</p>
      ${j.isSuper?`<div class="sigbox"><canvas id="osig"></canvas></div><div class="acts"><button class="btn light" id="oclr">Clear</button><button class="btn red" id="osave">Save signature</button></div>`:'<div class="banner">The Organizer sets this from their own account.</div>'}</div>
      <div class="gx-form"><h3>Official seal</h3><img src="/assets/letterhead/seal.png" style="width:170px;justify-self:center"><p class="gx-note">The seal of the Office of the Registrar is printed on every letter and certificate next to the signature, with a QR code that opens the verification page.</p>
      <a class="btn light" href="/verify/" target="_blank" rel="noopener" style="justify-self:start">Open the public verification page ↗</a></div></div>`;
    if(!j.isSuper)return;const pad=TXSign.widget($('#osig'),{name:()=>ME.name});$('#oclr').onclick=()=>pad.clear();
    $('#osave').onclick=async()=>{if(pad.empty())return toast('Add the signature first',1);await api('orgSigSave',{signature:pad.data()});j.hasSignature=true;toast('Signature saved');draw();};}
  draw();
};

/* ═════════════ ACCESS LOCKS ═════════════ */
window.gxIssueEvent=function(ev){const dt=String(ev.starts_at||'').slice(0,10);
  regPre={type:'cert_event',eventId:ev.id,fields:{event:ev.title,date_line:dt?new Date(dt+'T12:00').toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):''}};regTab='issue';closeM();go('registrar');};
window.lockDialog=function(module,id,row,after){
  const on=row.locked_until&&row.locked_until>istNow();const who={admins:'portal',speakers:'speaker portal',stewards:'Steward Desk'}[module];
  modal((on?'Access paused: ':'Pause access: ')+(row.name||id),`${on?`<div class="lockst">Paused until <b>${fmtDT(row.locked_until)}</b>${row.lock_reason?' · '+esc(row.lock_reason):''}</div>`:`<p class="gx-note">They can’t sign in to the ${who} until the time you choose. Their data is kept and nothing is deleted. They see the reason when they try to sign in.</p>`}
    <div class="grid2"><label>Paused until<input type="datetime-local" id="lkU" value="${esc(on?String(row.locked_until).slice(0,16):istNow(3*1440).slice(0,11)+'09:00')}"></label><label>Reason (shown to them)<input id="lkR" value="${esc(row.lock_reason||'')}" placeholder="e.g. pending review"></label></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${[['1 day',1],['3 days',3],['1 week',7],['1 month',30]].map(([l,d])=>`<button type="button" class="btn sm light" data-d="${d}">${l}</button>`).join('')}</div>`,[
    on&&['Restore access now',async()=>{await api('lockSet',{module,id,until:''});toast('Access restored');row.locked_until='';closeM();after&&after();},'ok left'],
    ['Cancel',closeM,'light'],
    [on?'Update pause':'Pause access',async()=>{const u=val('#lkU');if(!u)return toast('Choose until when',1);await api('lockSet',{module,id,until:u,reason:val('#lkR')});row.locked_until=u+':00';row.lock_reason=val('#lkR');toast('Access paused until '+fmtDT(u));closeM();after&&after();},'bad']]);
  $('#mBox').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{$('#lkU').value=istNow(b.dataset.d*1440).slice(0,11)+'09:00';});
};
window.lockBadge=row=>row&&row.locked_until&&row.locked_until>istNow()?' <span class="badge b-Void" title="Paused until '+esc(row.locked_until)+'">⏸ Paused</span>':'';

/* ───────── preview data ───────── */
const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  const a=b.action,now=()=>new Date(Date.now()+19800000).toISOString().slice(0,19),d=n=>new Date(Date.now()+n*864e5+19800000).toISOString().slice(0,16);
  if(!D._g){
    const ppl=[{email:'kalash@example.com',name:'Kalash',department_id:'DP4',role:'lead'},{email:'member1@example.com',name:'Sample Member',department_id:'DP4',role:'member'},{email:'hirva@example.com',name:'Hirva',department_id:'DP2',role:'lead'},{email:'riya@example.com',name:'Riya Patel',department_id:'DP3',role:'member'}];
    D._g={people:ppl,
      open:[{id:'TK-O1',title:'Design the Idea Search reel cover',description:'Three options in the brand style for the reel announcing the Steward call.',priority:'High',department_id:'DP5',due_date:d(4).slice(0,10),status:'To do'},{id:'TK-O2',title:'Collect volunteer T-shirt sizes',description:'Form + sheet, share with Hosting.',priority:'Medium',department_id:'',due_date:d(9).slice(0,10),status:'To do'}],
      meets:[{id:'MT1',title:'Core team weekly sync',starts_at:d(2).slice(0,11)+'18:00',minutes:'45',location:'Online',link:'https://meet.google.com/abc-defg-hij',agenda:'1. Speaker pipeline\n2. Sponsor deck\n3. AOB',audience:'all',my_status:'',marked:0,audience_size:5},
        {id:'MT0',title:'Venue walkthrough',starts_at:d(-6).slice(0,11)+'16:00',minutes:'60',location:'JG Auditorium',link:'',agenda:'',audience:'dept:DP6,dept:DP3',my_status:'Present',marked:4,audience_size:4},
        {id:'MT-1',title:'Curation round 2',starts_at:d(-20).slice(0,11)+'17:00',minutes:'90',location:'Online',link:'',audience:'dept:DP2',my_status:'Late',marked:3,audience_size:3}],
      stats:{counts:{Present:9,Late:2,Absent:1,Excused:1,'N.A.':1},rate:92,total:13,months:[{month:'2026-06',rate:100},{month:'2026-07',rate:80},{month:'2026-08',rate:75},{month:'2026-09',rate:100},{month:'2026-10',rate:90},{month:'2026-11',rate:100}]},
      awards:[{id:'AW1',email:'kalash@example.com',name:'Kalash',award:'Torch Bearer Award',citation:'For carrying Social Media through the 2026 edition with steady, generous leadership.',awarded_at:d(-30),doc_id:'TXTY/REG/2026/0003'},
        {id:'AW2',email:me.email,name:me.name,award:'Spirit of TEDx',citation:'For building the Team Portal that holds us together.',awarded_at:d(-12),doc_id:''},{id:'AW3',email:'riya@example.com',name:'Riya Patel',award:'Rising Star',citation:'For a flawless first speaker rehearsal season.',awarded_at:d(-5),doc_id:''}],
      grv:[{id:'GRV-2026-0001',email:'member1@example.com',name:'Sample Member',subject:'Workload in the last two weeks',category:'Workload or tasks',status:'Under review',created_at:d(-3),updated_at:d(-1),messages:2,last_at:d(-1)}],
      gmsg:[{id:'GM1',case_id:'GRV-2026-0001',from_email:'member1@example.com',from_name:'Sample Member',body:'I have been given three design tasks with the same deadline. Could we look at priorities?',created_at:d(-3)},{id:'GM2',case_id:'GRV-2026-0001',from_email:me.email,from_name:me.name,body:'Thanks for raising this. I have asked Kalash to move one deadline. Let me know by Friday if it is still too much.',created_at:d(-1)}],
      reg:[{id:'TXTY/REG/2026/0004',code:'TXTY-7KQ2-M9XD',type:'cert_event',title:'Side Event Certificate — Riya Patel',recipient_name:'Riya Patel',recipient_email:'riya@example.com',issued_by:me.email,issued_at:d(-2),status:'Valid',file_id:'f',seal_codes:'',fields:{event:'Zenith Community Meetup'}},
        {id:'TXTY/REG/2026/0003',code:'TXTY-H4TR-2PLB',type:'cert_award',title:'Award Certificate — Kalash',recipient_name:'Kalash',recipient_email:'kalash@example.com',issued_by:me.email,issued_at:d(-30),status:'Valid',file_id:'f',seal_codes:''},
        {id:'TXTY/REG/2026/0002',code:'TXTY-QW8E-ZZ31',type:'physical',title:'Venue MoU (signed copy)',recipient_name:'JG University',recipient_email:'',issued_by:me.email,issued_at:d(-40),status:'Valid',file_id:'',seal_codes:'S-QW8E-01,S-QW8E-02,S-QW8E-03'},
        {id:'TXTY/REG/2026/0001',code:'TXTY-AB12-CD34',type:'lor',title:'Letter of Recommendation — Sample Member',recipient_name:'Sample Member',recipient_email:'member1@example.com',issued_by:me.email,issued_at:d(-60),status:'Void',void_reason:'Spelling mistake in the name; reissued.',file_id:'f',seal_codes:''}],
      req:[{id:'REQ-2026-0002',email:'member1@example.com',name:'Sample Member',type:'lor',purpose:'University application (Fall 2027)',details:'Role: Design Associate, Jun 2025 – now. Please mention the Kaleidoscope stage design.',status:'Submitted',created_at:d(-1)},
        {id:'REQ-2026-0001',email:me.email,name:me.name,type:'association',purpose:'Internship',details:'',status:'Issued',doc_id:'TXTY/REG/2026/0001',created_at:d(-62)}],
      el:[{id:'SEL-2026-0001',title:'Selection: Head of Curation 2027',role:'Head of Curation',description:'Leads talk curation for The Zenith. Open to members with at least one edition of service.',apply_until:d(-1).slice(0,11)+'20:00',vote_from:d(-1).slice(0,11)+'21:00',vote_until:d(2).slice(0,11)+'20:00',status:'Open',phase:'Voting',
        candidates:[{id:'c1',name:'Hirva',intent:'I want to build a curation process that finds unheard voices.',experience:'Curation 2025, 2026.',vision:'Open nominations through Idea Search; two-round coaching.',links:'',votes:null},{id:'c2',name:'Riya Patel',intent:'Bring student voices to the main stage.',experience:'Speaker Support 2026.',vision:'Student panel in shortlisting.',links:'',votes:null}],applied:false,voted:false,turnout:3,council:'4'}],
      rti:[{id:'RTI-2026-0001',email:'member1@example.com',name:'Sample Member',subject:'How the 2027 theme was chosen',matter:'Theme: The Zenith',question:'Could the team know how the final theme was picked from the shortlist?',status:'Answered',answer:'Three shortlisted themes were tested with 40 students; The Zenith scored highest on clarity and range of talks.',withheld:'',created_at:d(-15)}],
      mo:[{id:'HRG-2026-0001',type:'hearing',title:'Clarify the sponsor selection for 2027',matter:'Members would like a structured session on how the title sponsor was chosen.',grounds:[],facts:'',prior_hearing:'',proposer:'Sample Member',status:'Gathering support',council_size:4,needed:3,support:2,supported:false,created_at:d(-2),closes_at:d(12)}],
      wd:[]};}
  const G=D._g;
  if(a==='taskAvailable') return {ok:true,rows:G.open,departments:D.departments};
  if(a==='taskClaim'){const t=G.open.find(x=>x.id===b.id);G.open=G.open.filter(x=>x.id!==b.id);if(t&&D.tasks)D.tasks.push(Object.assign(t,{assigned_to:me.email,status:'In progress'}));return {ok:true};}
  if(a==='taskSubmit'){if(!b.links.length)return {ok:false,error:'Add at least one link to your work.'};const t=(D.tasks||[]).find(x=>x.id===b.id);if(t){t.status='Submitted';t.proof_json=JSON.stringify(b.links);}return {ok:true};}
  if(a==='taskReview'){const t=(D.tasks||[]).find(x=>x.id===b.id);if(t)t.status=b.decision==='accept'?'Done':'In progress';return {ok:true};}
  if(a==='taskRemind') return {ok:true,sent:1};
  if(a==='meetList') return {ok:true,rows:G.meets,statuses:['Present','Late','Absent','Excused','N.A.'],canManage:true,stats:G.stats,departments:D.departments,people:G.people};
  if(a==='meetSave'){if(!b.title)return {ok:false,error:'Add a title, date and time.'};const r={id:b.id||'MT'+Date.now(),title:b.title,starts_at:b.starts_at,minutes:b.minutes,location:b.location,agenda:b.agenda,link:b.link||(b.meet?'https://meet.google.com/new-meet-now':''),audience:b.audience.join(',')||'all',marked:0,audience_size:4,my_status:''};
    if(b.id)Object.assign(G.meets.find(m=>m.id===b.id),r);else G.meets.unshift(r);G.meets.sort((x,y)=>String(y.starts_at).localeCompare(x.starts_at));return {ok:true,id:r.id,link:r.link};}
  if(a==='meetRemove'){G.meets=G.meets.filter(m=>m.id!==b.id);return {ok:true};}
  if(a==='meetAttendance'){const m=G.meets.find(x=>x.id===b.id);G._att=G._att||{};return {ok:true,meeting:m,statuses:['Present','Late','Absent','Excused','N.A.'],rows:[{email:me.email,name:me.name}].concat(G.people).map(p=>({email:p.email,name:p.name,status:(G._att[b.id]||{})[p.email]||''}))};}
  if(a==='meetMark'){G._att=G._att||{};G._att[b.id]=b.marks;const m=G.meets.find(x=>x.id===b.id);if(m)m.marked=Object.keys(b.marks).length;return {ok:true};}
  if(a==='awList') return {ok:true,types:['Torch Bearer Award','Rising Star','Spirit of TEDx','Above and Beyond','Team Player','Idea Champion'],canGrant:true,rows:G.awards,people:G.people};
  if(a==='awGrant'){const p=G.people.find(x=>x.email===b.email);if(!b.citation)return {ok:false,error:'Choose the award and write the citation.'};G.awards.unshift({id:'AW'+Date.now(),email:b.email,name:p.name,award:b.award,citation:b.citation,awarded_at:now(),doc_id:b.certificate?'TXTY/REG/2026/0005':''});return {ok:true};}
  if(a==='awRevoke'){G.awards=G.awards.filter(x=>x.id!==b.id);return {ok:true};}
  if(a==='grvList') return {ok:true,rows:G.grv,statuses:['Open','Under review','Waiting for member','Resolved','Closed'],categories:['Workload or tasks','Conduct of a member','Process or decision','Recognition or certificate','Safety or wellbeing','Other'],isAdmin:true};
  if(a==='grvThread'){const g=G.grv.find(x=>x.id===b.id);return {ok:true,case:g,messages:G.gmsg.filter(m=>m.case_id===b.id),statuses:['Open','Under review','Waiting for member','Resolved','Closed'],isAdmin:true};}
  if(a==='grvNew'){if(!b.subject||!b.body)return {ok:false,error:'Add a subject and describe the concern.'};const id='GRV-2026-000'+(G.grv.length+1);G.grv.unshift({id,email:me.email,name:me.name,subject:b.subject,category:b.category,status:'Open',created_at:now(),messages:1,last_at:now()});G.gmsg.push({id:'GMx',case_id:id,from_email:me.email,from_name:me.name,body:b.body,created_at:now()});return {ok:true,id};}
  if(a==='grvReply'){G.gmsg.push({id:'GM'+Date.now(),case_id:b.id,from_email:me.email,from_name:me.name,body:b.body,created_at:now()});const g=G.grv.find(x=>x.id===b.id);if(b.status)g.status=b.status;g.messages++;return {ok:true};}
  if(a==='grvStatus'){G.grv.find(x=>x.id===b.id).status=b.status;G.gmsg.push({id:'GM'+Date.now(),case_id:b.id,from_email:'system',from_name:'System',body:'Status changed to '+b.status+'.',created_at:now()});return {ok:true};}
  if(a==='myDocs') return {ok:true,rows:G.reg.filter(r=>r.recipient_email===me.email).concat([{id:'TXTY/REG/2026/0006',code:'TXTY-9PLM-4RTY',type:'vid',label:'Membership ID (VID)',title:'Membership ID (VID) — '+me.name,issued_at:d(-100),status:'Valid',has_file:true},{id:'TXTY/REG/2026/0007',code:'TXTY-R3ZA-81QK',type:'cert_participation',label:'Certificate of Participation',title:'Certificate of Participation — '+me.name,issued_at:d(-140),status:'Valid',has_file:true}]),
    requests:G.req.filter(r=>r.email===me.email),requestable:[{id:'lor',label:'Letter of Recommendation'},{id:'association',label:'Letter of Association'},{id:'cert_appreciation',label:'Certificate of Appreciation'},{id:'cert_participation',label:'Certificate of Participation'},{id:'cert_completion',label:'Certificate of Completion'},{id:'vid',label:'Membership ID (VID)'}]};
  if(a==='reqNew'){if(!b.purpose)return {ok:false,error:'Tell the Registrar what it is for.'};const id='REQ-2026-000'+(G.req.length+1);G.req.unshift({id,email:me.email,name:me.name,type:b.type,purpose:b.purpose,details:b.details,status:'Submitted',created_at:now()});return {ok:true,id};}
  if(a==='reqDecline'){Object.assign(G.req.find(r=>r.id===b.id),{status:'Declined',registrar_note:b.note});return {ok:true};}
  if(a==='regList'){const F=(l,k,lab,req,ph,tp)=>[k,lab,req?1:0,ph||'',tp||''];
    const types=[['lor','Letter of Recommendation','letter',[F(0,'recipient_name','Full name',1),F(0,'recipient_email','Email (to send it)'),F(0,'role','Role / position held',1),F(0,'department','Team / department'),F(0,'period','Period of association',1,'e.g. June 2025 – June 2027'),F(0,'addressee','Addressed to',0,'To whom it may concern'),F(0,'purpose','Purpose',0,'e.g. university application'),F(0,'highlights','Contributions to mention',0,'One per line'),F(0,'body','Letter text (leave blank to write it for you)',0,'','textarea')]],
      ['association','Letter of Association','letter',[F(0,'recipient_name','Full name',1),F(0,'recipient_email','Email (to send it)'),F(0,'role','Role / position',1),F(0,'department','Team / department'),F(0,'since','Associated since',1,'e.g. 1 July 2026'),F(0,'purpose','Purpose'),F(0,'body','Letter text (leave blank to write it for you)',0,'','textarea')]],
      ['appointment','Appointment Letter','letter',[F(0,'recipient_name','Full name',1),F(0,'recipient_email','Email (to send it)'),F(0,'role','Position',1),F(0,'department','Team / department'),F(0,'effective','Effective from',1,'e.g. 15 November 2026'),F(0,'term','Term'),F(0,'body','Letter text (leave blank to write it for you)',0,'','textarea')]],
      ['notice','Official Notice','letter',[F(0,'title','Notice title',1),F(0,'addressee','Addressed to',0,'All members of TEDxThaltej Youth'),F(0,'recipient_email','Email a copy to (optional)'),F(0,'body','Text of the notice',1,'','textarea')]],
      ['withdrawal_ack','Acknowledgement of Withdrawal','letter',[F(0,'recipient_name','Full name',1),F(0,'recipient_email','Email',1),F(0,'effective','Effective date',1)]],
      ['cert_appreciation','Certificate of Appreciation','cert',[F(0,'recipient_name','Name on the certificate',1),F(0,'recipient_email','Email (to send it)'),F(0,'line','For',1,'e.g. outstanding contribution to Speaker Support'),F(0,'date_line','Date / edition',0,'e.g. TEDxThaltej Youth 2027 · 26 June 2027')]],
      ['cert_participation','Certificate of Participation','cert',[F(0,'recipient_name','Name on the certificate',1),F(0,'recipient_email','Email (to send it)'),F(0,'line','For taking part in',1),F(0,'date_line','Date / edition')]],
      ['cert_completion','Certificate of Completion','cert',[F(0,'recipient_name','Name on the certificate',1),F(0,'recipient_email','Email (to send it)'),F(0,'line','For completing',1),F(0,'date_line','Date / edition')]],
      ['cert_event','Side Event Certificate','cert',[F(0,'recipient_name','Name on the certificate',1),F(0,'recipient_email','Email (to send it)'),F(0,'event','Side event',1,'Event title'),F(0,'line','Wording',0,'for attending and taking part in'),F(0,'date_line','Date')]],
      ['cert_award','Award Certificate','cert',[F(0,'recipient_name','Name on the certificate',1),F(0,'recipient_email','Email (to send it)'),F(0,'award','Award',1,'e.g. Torch Bearer Award'),F(0,'line','Citation',1),F(0,'date_line','Date / edition')]],
      ['vid','Membership ID (VID)','id',[F(0,'recipient_name','Member name',1),F(0,'recipient_email','Member email',1),F(0,'role','Role'),F(0,'department','Team'),F(0,'since','Member since')]],
      ['evid','Event ID (E-VID)','id',[F(0,'recipient_name','Member name',1),F(0,'recipient_email','Member email',1),F(0,'vid','Linked VID number',1,'TXTY-VID-0001'),F(0,'edition','Edition / event',1),F(0,'role','Role for this event')]],
      ['physical','Physical document (seal codes)','physical',[F(0,'title','Document title',1),F(0,'recipient_name','Issued to / prepared by'),F(0,'recipient_email','Their email'),F(0,'pages','Number of pages',1,'1'),F(0,'seals','Seals to stamp',1,'1'),F(0,'notes','Notes')]]].map(([id,label,kind,fields])=>({id,label,kind,fields}));
    G._types=types;
    return {ok:true,rows:G.reg,types,requests:G.req,hasSignature:!!G._sig,isSuper:true,people:[{email:me.email,name:me.name,department_id:''}].concat(G.people),departments:D.departments,events:(D._ev?D._ev.rows:[]).map(e=>({id:e.id,title:e.title,date:String(e.starts_at).slice(0,10)}))};}
  if(a==='regIssue'){const T=(G._types||[]).find(t=>t.id===b.type);for(const f of T.fields)if(f[2]&&!b.fields[f[0]])return {ok:false,error:'Fill in: '+f[1]};
    const n=G.reg.length+1,code='TXTY-'+Math.random().toString(36).slice(2,6).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase(),id='TXTY/REG/2026/'+String(n).padStart(4,'0');
    const seals=b.type==='physical'?Array.from({length:+b.fields.seals||1},(_,i)=>'S-'+code.slice(5,9)+'-'+String(i+1).padStart(2,'0')):[];
    G.reg.unshift({id,code,type:b.type,title:T.label+' — '+(b.fields.recipient_name||b.fields.title||''),recipient_name:b.fields.recipient_name||'',recipient_email:b.fields.recipient_email||'',issued_by:me.email,issued_at:now(),status:'Valid',file_id:T.kind==='physical'?'':'f',seal_codes:seals.join(','),request_id:b.request_id||''});
    if(b.request_id){const q=G.req.find(r=>r.id===b.request_id);if(q)Object.assign(q,{status:'Issued',doc_id:id});}
    return {ok:true,id,code,seal_codes:seals,vid:b.type==='vid'?'TXTY-VID-0002':''};}
  if(a==='regVoid'){if(!b.reason)return {ok:false,error:'Give a reason.'};Object.assign(G.reg.find(r=>r.id===b.id),{status:'Void',void_reason:b.reason});return {ok:true};}
  if(a==='regPdf') return {ok:true,name:'preview.pdf',base64:''};
  if(a==='regResend') return {ok:true};
  if(a==='orgSigSave'){G._sig=1;return {ok:true};}
  if(a==='govBoot') return {ok:true,me:me.email,isSuper:me.role==='super',isRegistrar:true,councilSize:4,now:now(),elections:G.el,motions:G.mo,rti:G.rti,withdrawals:G.wd,
    rtiCategories:{a:'16.2.2(a) internal discussions and decisions',b:'16.2.2(b) documents, records and communications',c:'16.2.2(c) personal or organisational data',d:'16.2.2(d) information designated as confidential'},
    reviewGrounds:{a:'24.3.2(a) favoritism, partiality or unequal treatment',b:'24.3.2(b) abuse or misuse of authority',c:'24.3.2(c) actions inconsistent with the Charter',d:'24.3.2(d) actions threatening the integrity of governance',e:'24.3.2(e) misuse of override powers under Article 21',f:'24.3.2(f) a matter of exceptional institutional importance'}};
  if(a==='elSave'){if(!b.title||!b.role)return {ok:false,error:'Add a title and the role under consideration.'};if(b.id)Object.assign(G.el.find(e=>e.id===b.id),b,{status:b.publish?'Open':'Draft',phase:b.publish?'Applications open':'Draft'});
    else G.el.unshift({id:'SEL-2026-000'+(G.el.length+1),title:b.title,role:b.role,description:b.description,apply_until:b.apply_until,vote_from:b.vote_from,vote_until:b.vote_until,status:b.publish?'Open':'Draft',phase:b.publish?'Applications open':'Draft',candidates:[],applied:false,voted:false,turnout:0,council:'4'});return {ok:true};}
  if(a==='elVote'){const e=G.el.find(x=>x.id===b.id);e.voted=true;e.turnout++;return {ok:true};}
  if(a==='elApply'||a==='elWithdrawApp'||a==='elConfirm') return {ok:true};
  if(a==='elVerify') return {ok:true,votes:3,flagged:0};
  if(a==='rtiNew'){const id='RTI-2026-000'+(G.rti.length+1);G.rti.unshift({id,email:me.email,name:me.name,subject:b.subject,matter:b.matter,question:b.question,status:'Submitted',created_at:now()});return {ok:true,id};}
  if(a==='rtiAnswer'){if(b.withheld&&!b.category)return {ok:false,error:'If anything is withheld, name the 16.2.2 category (Article 27.5).'};Object.assign(G.rti.find(r=>r.id===b.id),{answer:b.answer,withheld:b.withheld,status:b.withheld?'Answered (part withheld)':'Answered'});return {ok:true};}
  if(a==='moNew'){const id=(b.type==='review'?'ECR':'HRG')+'-2026-000'+(G.mo.length+1);G.mo.unshift({id,type:b.type,title:b.title,matter:b.matter,grounds:b.grounds,facts:b.facts,prior_hearing:b.prior_hearing,proposer:me.name,status:'Gathering support',council_size:4,needed:3,support:1,supported:true,created_at:now(),closes_at:d(14)});return {ok:true,id};}
  if(a==='moSupport'){const m=G.mo.find(x=>x.id===b.id);m.supported=b.on;m.support+=b.on?1:-1;if(m.support>=m.needed)m.status='Threshold met';return {ok:true};}
  if(a==='moVerify'){const m=G.mo.find(x=>x.id===b.id);m.status=m.type==='review'?'Referred to IDC Chairperson':'Hearing invoked';return {ok:true,valid:m.support,needed:m.needed,passed:true};}
  if(a==='moClose'){Object.assign(G.mo.find(x=>x.id===b.id),{status:'Closed',outcome:b.outcome});return {ok:true};}
  if(a==='wdNew'){const id='WDL-2026-0001';G.wd.unshift({id,email:me.email,name:me.name,pending:b.pending,status:'Submitted',created_at:now()});return {ok:true,id,pendingRequests:0};}
  if(a==='wdAck'){G.wd[0].status='Acknowledged';return {ok:true,letter:{id:'TXTY/REG/2026/0009'}};}
  if(a==='lockSet'){const tab=b.module==='speakers'?D.speakers:D.admins;const r=(tab||[]).find(x=>(x.id||x.email)===b.id);if(r){r.locked_until=b.until?b.until+':00':'';r.lock_reason=b.reason||'';}return {ok:true};}
  return prev?prev(b,me,D):null;
};
})();
