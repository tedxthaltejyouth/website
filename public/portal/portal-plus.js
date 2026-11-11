/* Team Portal additions: Team Mail, Recruitment, home-screen app, mobile tab bar.
   Loaded after the main portal script; uses its globals ($, esc, api, modal, toast, VIEWS, SECTIONS, ME, go). */
(function(){
const css=`
/* ── Team Mail ── */
.im{display:grid;grid-template-columns:190px minmax(280px,380px) 1fr;height:calc(100vh - 150px);min-height:480px;background:#fff;border:1.5px solid var(--n,#101B3D);border-radius:20px;overflow:hidden;box-shadow:6px 6px 0 var(--n,#101B3D)}
.imf{background:#FFF8EC;border-right:1px solid var(--line);padding:14px 10px;display:flex;flex-direction:column;gap:2px}
.imf button{display:flex;align-items:center;gap:10px;border:0;background:none;padding:10px 12px;border-radius:12px;font-weight:600;cursor:pointer;text-align:left;color:#333}
.imf button:hover{background:#fff}.imf button.on{background:var(--n,#101B3D);color:#fff}
.imf button .n{margin-left:auto;font-size:12px;background:var(--red);color:#fff;border-radius:99px;padding:0 7px}
.imf .new{background:var(--red)!important;color:#fff!important;justify-content:center;margin-bottom:10px;border-radius:99px!important}
.iml{border-right:1px solid var(--line);overflow:auto;display:flex;flex-direction:column}
.iml .srch{position:sticky;top:0;background:#fff;padding:10px;border-bottom:1px solid var(--line);z-index:1}
.iml .srch input{border-radius:99px;background:#f4f2ee;border:0;padding:9px 14px}
.imi{display:grid;grid-template-columns:40px 1fr;gap:10px;padding:12px 14px;border-bottom:1px solid #f0eee9;cursor:pointer;position:relative}
.imi:hover{background:#fbfaf7}.imi.on{background:#FFF4E2}
.imi.unread::before{content:'';position:absolute;left:5px;top:26px;width:7px;height:7px;border-radius:50%;background:#2D6BFF}
.av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:14px;flex:none}
.imi .r1{display:flex;gap:8px;align-items:baseline}.imi .r1 b{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.imi.unread .r1 b,.imi.unread .sub{font-weight:800}
.imi time{font-size:12px;color:var(--mute);white-space:nowrap}
.imi .sub{font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.imi .sn{font-size:13px;color:var(--mute);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.imi .st{position:absolute;right:12px;bottom:10px;color:#FFC83D;font-size:14px}
.imr{overflow:auto;display:flex;flex-direction:column;background:#fff}
.imr .bar{display:flex;gap:6px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff;z-index:1}
.imr .bar .back{display:none}
.imr .bar{overflow-x:auto}.imr .bar button{white-space:nowrap;flex:none;border:0;background:#f4f2ee;border-radius:99px;padding:7px 12px;cursor:pointer;font-weight:600;font-size:13px}
.imr .bar button:hover{background:#ebe8e1}
.imr h2.subj{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:28px;letter-spacing:.01em;text-transform:uppercase;padding:18px 22px 4px;line-height:1.1}
.imr .ppl{padding:0 22px 10px;color:var(--mute);font-size:13px}
.msg{margin:8px 18px;border:1px solid #eee;border-radius:16px;padding:14px 16px;background:#fff}
.msg.mine{background:#FFF8EC;border-color:#f3e3c4}
.msg .mh{display:flex;gap:10px;align-items:center;margin-bottom:8px}.msg .mh .av{width:34px;height:34px;font-size:12px}
.msg .mh b{display:block}.msg .mh small{color:var(--mute)}.msg .mh time{margin-left:auto;font-size:12px;color:var(--mute)}
.msg .mb{white-space:pre-wrap;word-wrap:break-word;line-height:1.6;font-size:14.5px}.msg .mb a{color:#2D6BFF}
.reply{margin:10px 18px 18px;border:1.5px solid var(--n,#101B3D);border-radius:16px;overflow:hidden}
.reply textarea{border:0;border-radius:0;min-height:90px;outline:0!important}
.reply .rf{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#fafaf8;font-size:12px;color:var(--mute)}
.imempty{flex:1;display:grid;place-items:center;color:var(--mute);text-align:center;padding:30px}
.imempty .big{font-family:Anton,Impact,sans-serif;font-size:44px;color:#e9e3d6;line-height:1}
.chips{display:flex;flex-wrap:wrap;gap:6px;padding:6px;border:1px solid var(--line);border-radius:12px;background:#fff;position:relative}
.chips input{border:0;flex:1;min-width:140px;padding:6px;outline:0!important}
.chip{display:inline-flex;align-items:center;gap:6px;background:#101B3D;color:#fff;border-radius:99px;padding:4px 6px 4px 12px;font-size:13px;font-weight:600}
.chip.g{background:var(--red)}.chip button{border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:50%;width:20px;height:20px;cursor:pointer;line-height:1}
.sugg{position:absolute;left:0;right:0;top:100%;margin-top:4px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.12);max-height:260px;overflow:auto;z-index:5}
.sugg div{padding:9px 12px;cursor:pointer;display:flex;justify-content:space-between;gap:10px}.sugg div:hover,.sugg div.on{background:#FFF4E2}.sugg small{color:var(--mute)}
@media(max-width:860px){
  .im{grid-template-columns:1fr;grid-template-rows:auto 1fr;height:calc(100vh - 200px);box-shadow:none;border-radius:16px}
  #imNew{display:none}
  .imf{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid var(--line);padding:8px;gap:4px}
  .imf button{white-space:nowrap;padding:8px 12px}.imf .new{display:none}
  .imr{position:fixed;inset:0;z-index:45;transform:translateX(100%);transition:transform .25s}
  .imr.open{transform:none}.imr .bar .back{display:inline-block}
  .fab{display:grid!important}
}
.fab{display:none;position:fixed;right:18px;bottom:84px;width:58px;height:58px;border-radius:50%;background:var(--red);color:#fff;border:0;font-size:24px;place-items:center;box-shadow:0 8px 20px rgba(235,0,40,.4);z-index:30;cursor:pointer}

/* ── Recruitment ── */
.pipe{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.pipe button{border:1.5px solid var(--n,#101B3D);background:#fff;border-radius:99px;padding:7px 14px;font-weight:700;cursor:pointer;font-size:13px}
.pipe button b{margin-left:6px;background:#FFC83D;border-radius:99px;padding:0 7px}
.pipe button.on{background:var(--n,#101B3D);color:#fff}.pipe button.on b{color:#101B3D}
.b-Applied{background:#e8f0fe;color:#1a56db}.b-Shortlisted{background:#fff4e0;color:var(--warn)}.b-Interview.scheduled{background:#ede7ff;color:#5b3fd6}
.b-Interviewed{background:#e0f2fe;color:#0369a1}.b-Selected{background:#ffe4ef;color:#be185d}.b-Not.selected,.b-Withdrawn{background:#f1f1f1;color:#666}.b-Onboarded{background:#e6f6ec;color:var(--ok)}
.crit{display:grid;grid-template-columns:1fr 160px 44px;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid #f0eee9}
.crit input[type=range]{padding:0;accent-color:var(--red)}.crit output{font-weight:800;text-align:right}
.ppick{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;max-height:180px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:8px}
.meet{display:flex;gap:10px;align-items:center;background:#e9f7ef;border:1px solid #bfe6cf;border-radius:12px;padding:10px 14px}
.meet a{color:#0b7a3e;font-weight:700;word-break:break-all}
.tabsx{flex-wrap:wrap}
@media(max-width:700px){.rt thead{display:none}.rt tr{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:12px 14px;border-bottom:1px solid var(--line)}.rt td{border:0!important;padding:0!important}.rt td:nth-child(2),.rt td:nth-child(3),.rt td:nth-child(5){grid-column:1;color:var(--mute);font-size:13px}.rt td:nth-child(4){grid-row:1;grid-column:2}.rt td:nth-child(6){grid-column:2;grid-row:2;text-align:right}}
.steps{display:flex;gap:4px;margin:2px 0 6px;flex-wrap:wrap}.steps span{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#f1efe9;color:#999}.steps span.done{background:#101B3D;color:#fff}.steps span.now{background:var(--red);color:#fff}

/* ── App shell: home-page look ── */
:root{--n:#101B3D;--y:#FFC83D;--c:#FFF4E2;--bg:#FFF4E2;--line:#ebe3d3}
body{background:var(--c)}
aside{background:var(--n)!important}
aside nav a:hover{background:rgba(255,255,255,.08)!important}
aside nav a.on{background:var(--y)!important;color:var(--n)!important}
aside nav .grp{color:#8f9ac0!important}
aside .me{border-top-color:rgba(255,255,255,.12)!important}
.top h2,.auth h1{font-family:Anton,Impact,'Arial Narrow',sans-serif!important;font-weight:400!important;letter-spacing:.01em!important;text-transform:uppercase}
.top h2{font-size:34px!important}
.btn{border-radius:99px!important}.btn:not(.light):not(.red):not(.ok):not(.bad):not(.warn){background:var(--n)}
.panel,.stat{border-radius:18px!important;border-color:var(--line)!important}
.stat{box-shadow:4px 4px 0 var(--n);border:1.5px solid var(--n)!important}
.auth{background:var(--c) radial-gradient(circle at 50% 18%,rgba(235,0,40,.18),transparent 45%)!important}
.auth .box{border:1.5px solid var(--n);box-shadow:8px 8px 0 var(--n)}

/* mobile tab bar */
.tabbar{display:none}
@media(max-width:860px){
  .tabbar{display:grid;grid-template-columns:repeat(4,1fr);position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);z-index:35;padding:6px 6px calc(6px + env(safe-area-inset-bottom))}
  .tabbar button{border:0;background:none;display:grid;justify-items:center;gap:2px;font-size:11px;font-weight:700;color:#777;cursor:pointer;padding:4px;position:relative}
  .tabbar button i{font-style:normal;font-size:20px;line-height:1}
  .tabbar button.on{color:var(--red)}
  .tabbar .dot{position:absolute;top:0;right:calc(50% - 22px);background:var(--red);color:#fff;border-radius:99px;font-size:10px;padding:0 5px;min-width:16px}
  main{padding-bottom:90px!important}
}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const fl=document.createElement('link');fl.rel='stylesheet';fl.href='https://fonts.googleapis.com/css2?family=Anton&display=swap';document.head.appendChild(fl);

/* ───────── sections ───────── */
const at=(id)=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('mytasks')+1,0,{id:'mail',name:'Team Mail',ico:'✉',grp:'Overview',always:true});
const sub=SECTIONS.find(s=>s.id==='submissions'); if(sub) sub.name='Website inbox';
SECTIONS.splice(at('admins')+1,0,{id:'recruit',name:'Recruitment',ico:'⊕',grp:'Team'});

/* ───────── helpers ───────── */
const COLORS=['#EB0028','#2D6BFF','#FF4F8B','#101B3D','#0E9F6E','#F59E0B','#7C3AED','#0891B2'];
const avatar=(name,email)=>{const s=String(name||email||'?');let h=0;for(const c of String(email||s))h=(h*31+c.charCodeAt(0))>>>0;
  const ini=s.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();return `<span class="av" style="background:${COLORS[h%COLORS.length]}">${esc(ini)}</span>`;};
const when=d=>{if(!d)return'';const t=new Date(String(d).length>10?d:d+'T00:00');const n=new Date();
  if(t.toDateString()===n.toDateString())return t.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});
  if(n-t<6*864e5)return t.toLocaleDateString('en-IN',{weekday:'short'});return t.toLocaleDateString('en-IN',{day:'numeric',month:'short'});};
const linkify=s=>esc(s).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');

/* ───────── TEAM MAIL ───────── */
let IM={folder:'inbox',q:'',boot:null,open:null};
const FOLDERS=[['inbox','Inbox','⬇'],['starred','Starred','★'],['sent','Sent','➚'],['archive','Archive','▤'],['trash','Trash','✕']];
function setMailCount(n){const c=$('#ct-mail');if(c){c.textContent=n;c.classList.toggle('hide',!n);}
  const d=document.querySelector('.tabbar [data-t=mail] .dot');if(d){d.textContent=n;d.style.display=n?'':'none';}
  try{if(navigator.setAppBadge){n?navigator.setAppBadge(n):navigator.clearAppBadge();}}catch(e){}}
VIEWS.mail=async function(){
  if(!IM.boot) IM.boot=await api('imBoot');
  $('#tools').innerHTML=`<button class="btn red" id="imNew">✎ New message</button>`;
  $('#imNew').onclick=()=>compose();
  $('#view').innerHTML=`<div class="im"><nav class="imf" id="imf"></nav><section class="iml"><div class="srch"><input id="imQ" placeholder="Search mail" value="${esc(IM.q)}"></div><div id="imList"></div></section>
    <section class="imr" id="imR"><div class="imempty"><div><div class="big">TEAM MAIL</div><p>Messages between the team, right here in the portal.<br>Pick a conversation or start a new one.</p></div></div></section></div>
    <button class="fab" id="imFab" title="New message">✎</button>`;
  $('#imFab').onclick=()=>compose();
  let t;$('#imQ').oninput=e=>{clearTimeout(t);t=setTimeout(()=>{IM.q=e.target.value;loadList();},250);};
  drawFolders(IM.boot.counts); await loadList();
  if(IM.open) openThread(IM.open);
};
function drawFolders(c){
  $('#imf').innerHTML=`<button class="new" id="imNew2">✎ New message</button>`+FOLDERS.map(([id,n,ic])=>`<button data-f="${id}" class="${IM.folder===id?'on':''}"><span>${ic}</span>${n}${id==='inbox'&&c.inbox?`<span class="n">${c.inbox}</span>`:''}</button>`).join('');
  $('#imNew2').onclick=()=>compose();
  $('#imf').onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;IM.folder=b.dataset.f;IM.open=null;drawFolders(c);loadList();
    $('#imR').classList.remove('open');};
  setMailCount(c.inbox);
}
async function loadList(){
  const box=$('#imList');if(!box)return;
  const j=await api('imList',{folder:IM.folder,q:IM.q});drawFolders(j.counts);
  if(!j.rows.length){box.innerHTML=`<div class="empty">${IM.q?'Nothing matches “'+esc(IM.q)+'”.':IM.folder==='inbox'?'Your inbox is empty. 🎉':'Nothing here yet.'}</div>`;return;}
  box.innerHTML=j.rows.map(r=>`<div class="imi ${r.unread?'unread':''} ${IM.open===r.thread_id?'on':''}" data-t="${r.thread_id}">${avatar(IM.folder==='sent'?r.to_label:r.from,IM.folder==='sent'?r.to_label:r.from_email)}
    <div style="min-width:0"><div class="r1"><b>${esc(IM.folder==='sent'?'To: '+r.to_label:r.from)}${r.count>1?` <small class="muted">(${r.count})</small>`:''}</b><time>${when(r.at)}</time></div>
    <div class="sub">${esc(r.subject)}</div><div class="sn">${esc(r.snippet)}</div></div>${r.starred?'<span class="st">★</span>':''}</div>`).join('');
  box.onclick=e=>{const it=e.target.closest('[data-t]');if(it)openThread(it.dataset.t);};
}
async function openThread(id){
  IM.open=id;document.querySelectorAll('.imi').forEach(x=>x.classList.toggle('on',x.dataset.t===id));
  const R=$('#imR');R.classList.add('open');R.innerHTML='<div class="empty">Loading…</div>';
  const j=await api('imThread',{thread_id:id});
  const it=document.querySelector(`.imi[data-t="${id}"]`);if(it)it.classList.remove('unread');
  drawFolders(j.counts);
  const others=j.participants.filter(p=>p.email!==ME.email);
  R.innerHTML=`<div class="bar"><button class="back" id="imBack">‹ Back</button>
      <button data-op="${j.starred?'unstar':'star'}">${j.starred?'★ Starred':'☆ Star'}</button>
      ${j.folder==='inbox'?'<button data-op="archive">▤ Archive</button>':''}${j.folder==='archive'||j.folder==='trash'?'<button data-op="inbox">↩ Move to inbox</button>':''}
      ${j.folder!=='trash'?'<button data-op="trash">✕ Delete</button>':''}<button data-op="unread">● Mark unread</button></div>
    <h2 class="subj">${esc(j.subject)}</h2><div class="ppl">${j.participants.length} people · ${others.map(p=>esc(p.name)).slice(0,6).join(', ')}${others.length>6?' and '+(others.length-6)+' more':''}</div>
    ${j.messages.map(m=>`<div class="msg ${m.from_email===ME.email?'mine':''}"><div class="mh">${avatar(m.from,m.from_email)}<div><b>${esc(m.from)}</b><small>to ${esc(m.to_label==='Reply'?'everyone in this conversation':m.to_label)}</small></div><time>${esc(String(m.at).replace('T',' ').slice(0,16))}</time></div><div class="mb">${linkify(m.body)}</div></div>`).join('')}
    <div class="reply"><textarea id="imRe" placeholder="Reply to everyone in this conversation…"></textarea><div class="rf"><span>${others.length===1?'Your reply goes to '+esc(others[0].name)+'.':'Replies go to all '+others.length+' people here.'}</span><button class="btn red sm" id="imSendRe">Send</button></div></div>`;
  R.scrollTop=0;
  $('#imBack').onclick=()=>{R.classList.remove('open');IM.open=null;};
  R.querySelectorAll('[data-op]').forEach(b=>b.onclick=async()=>{const op=b.dataset.op;const r=await api('imAct',{thread_id:id,op});setMailCount(r.counts.inbox);
    if(['archive','trash','inbox','unread'].includes(op)){R.classList.remove('open');IM.open=null;R.innerHTML='<div class="imempty"><div><div class="big">DONE</div><p>'+({archive:'Archived.',trash:'Moved to Trash.',inbox:'Moved back to your inbox.',unread:'Marked as unread.'})[op]+'</p></div></div>';}
    else openThread(id); loadList();});
  $('#imSendRe').onclick=async function(){const v=$('#imRe').value.trim();if(!v){toast('Write a reply first.',1);return;}this.disabled=true;
    try{await api('imSend',{thread_id:id,body:v});toast('Sent');openThread(id);loadList();}catch(e){toast(e.message,1);this.disabled=false;}};
}
function compose(pre){
  const B=IM.boot||{people:[],groups:[]};
  const all=B.groups.map(g=>({id:g.id,label:g.name,sub:g.count+' people',g:1})).concat(B.people.filter(p=>p.email!==ME.email).map(p=>({id:p.email,label:p.name,sub:p.email})));
  let sel=[];
  modal('New message',`<label>To<div class="chips" id="cTo"><input id="cIn" placeholder="Name, email or a team…" autocomplete="off"><div class="sugg hide" id="cS"></div></div></label>
    <label>Subject<input id="cSub" maxlength="200"></label><label>Message<textarea id="cBody" style="min-height:200px"></textarea></label>
    <p class="muted" style="font-size:12px">Team Mail stays inside the portal. People get a short email nudge that a message is waiting, without its text.</p>`,
    [['Send',async()=>{if(!sel.length)throw new Error('Add at least one person or team.');
      const j=await api('imSend',{to:sel.map(s=>s.id),subject:$('#cSub').value,body:$('#cBody').value});closeM();toast('Message sent');
      IM.folder='sent';IM.open=j.thread_id;if(CUR==='mail')VIEWS.mail();else go('mail');}]]);
  $('#mBox').classList.add('wide');$('#mBox').style.width='min(720px,100%)';
  const draw=()=>{$('#cTo').querySelectorAll('.chip').forEach(c=>c.remove());sel.forEach((s,i)=>{const c=document.createElement('span');c.className='chip'+(s.g?' g':'');
    c.innerHTML=`${esc(s.label)}<button type="button">×</button>`;c.querySelector('button').onclick=()=>{sel.splice(i,1);draw();};$('#cTo').insertBefore(c,$('#cIn'));});};
  let idx=0;
  const sug=()=>{const q=$('#cIn').value.toLowerCase().trim();const list=all.filter(x=>!sel.some(s=>s.id===x.id)&&(!q||(x.label+' '+x.id).toLowerCase().includes(q))).slice(0,8);
    const S=$('#cS');if(!list.length||document.activeElement!==$('#cIn')){S.classList.add('hide');return list;}
    idx=Math.min(idx,list.length-1);S.classList.remove('hide');S.innerHTML=list.map((x,i)=>`<div data-i="${i}" class="${i===idx?'on':''}"><span>${x.g?'👥 ':''}${esc(x.label)}</span><small>${esc(x.sub)}</small></div>`).join('');
    S.onmousedown=e=>{const d=e.target.closest('[data-i]');if(d){e.preventDefault();sel.push(list[+d.dataset.i]);$('#cIn').value='';draw();sug();}};return list;};
  $('#cIn').oninput=()=>{idx=0;sug();};$('#cIn').onfocus=sug;$('#cIn').onblur=()=>setTimeout(()=>$('#cS').classList.add('hide'),120);
  $('#cIn').onkeydown=e=>{const list=sug();if(e.key==='ArrowDown'){idx=Math.min(idx+1,list.length-1);sug();e.preventDefault();}
    else if(e.key==='ArrowUp'){idx=Math.max(idx-1,0);sug();e.preventDefault();}
    else if(e.key==='Enter'&&list[idx]){e.preventDefault();sel.push(list[idx]);$('#cIn').value='';idx=0;draw();sug();}
    else if(e.key==='Backspace'&&!$('#cIn').value&&sel.length){sel.pop();draw();}};
  if(pre){sel=pre;draw();}
  setTimeout(()=>$('#cIn').focus(),50);
}
/* role presets in Portal users → Add/Edit */
window.applyPreset=function(k){
  const box=$('#mBox'),role=box.querySelector('[data-k=role]'),dept=box.querySelector('[data-k=department_id]');
  const P={ais:['lead',['referrals','stewards','submissions'],/idea search|ais/i],recruit:['lead',['recruit','team'],null],dept:['lead',['team','tasks'],null],member:['member',[],null]}[k];
  role.value=P[0];box.querySelectorAll('.sc').forEach(c=>c.checked=P[1].includes(c.value));
  if(P[2]&&dept){const o=[...dept.options].find(o=>P[2].test(o.text));if(o)dept.value=o.value;}
  toast({ais:'AIS Head: manages referrals and Idea Stewards. Save to apply.',recruit:'Recruitment lead: sees applicants, schedules interviews, enters marks.',dept:'Department head: tasks and team for their department.',member:'Team member: My tasks and Team Mail.'}[k]);
};
window.teamMailTo=(email,name)=>{compose([{id:email,label:name||email}]);};

/* poll the unread count once a minute */
async function poll(){if(!TOKEN||!ME||$('#vApp').classList.contains('hide'))return;try{const j=await api('imCounts');setMailCount(j.counts.inbox);}catch(e){}}
setInterval(poll,60000);

/* ───────── RECRUITMENT ───────── */
let REC={status:'',q:''};
const STEPS=['Applied','Shortlisted','Interview scheduled','Interviewed','Selected','Onboarded'];
VIEWS.recruit=async function(){
  const j=await api('recList');REC.data=j;
  $('#tools').innerHTML=`<input id="rQ" placeholder="Search name, school, email" value="${esc(REC.q)}"><button class="btn light" id="rLink">⧉ Copy form link</button>`;
  $('#rLink').onclick=()=>{try{navigator.clipboard.writeText(j.joinUrl);toast('Link copied: '+j.joinUrl);}catch(e){prompt('Share this link:',j.joinUrl);}};
  $('#rQ').oninput=e=>{REC.q=e.target.value;draw();};
  const draw=()=>{
    const rows=j.rows.filter(r=>(!REC.status||r.status===REC.status)&&(!REC.q||(r.name+' '+r.email+' '+r.institution).toLowerCase().includes(REC.q.toLowerCase())));
    const dn=id=>String(id||'').split(',').filter(Boolean).map(x=>(j.departments.find(d=>d.id===x)||{}).name||x).join(', ');
    $('#view').innerHTML=`${j.open?'':'<div class="banner">Applications are closed. Turn on <b>recruit_open</b> in Site settings to open the form.</div>'}
      <div class="pipe"><button data-s="" class="${!REC.status?'on':''}">All<b>${j.rows.length}</b></button>${j.statuses.filter(s=>j.counts[s]||STEPS.includes(s)).map(s=>`<button data-s="${s}" class="${REC.status===s?'on':''}">${s}<b>${j.counts[s]||0}</b></button>`).join('')}</div>
      <div class="panel"><div class="scroll"><table class="tbl rt"><thead><tr><th>Applicant</th><th>Teams</th><th>Applied</th><th>Status</th><th>Interview</th><th>Score</th></tr></thead><tbody>
      ${rows.map(r=>`<tr class="click" data-id="${r.id}"><td><b>${esc(r.name)}</b><div class="muted">${esc(r.institution||'')}${r.grade?' · '+esc(r.grade):''}</div></td><td>${esc(dn(r.departments))}</td><td>${fmt(String(r.created_at).slice(0,10))}</td>
        <td>${badge(r.status)}</td><td>${r.interview_at?esc(r.interview_at.replace('T',' ')):'<span class="muted">—</span>'}${r.meet_link?' <span title="Google Meet">🎥</span>':''}</td>
        <td>${r.score_avg?'<b>'+esc(r.score_avg)+'%</b>':'<span class="muted">—</span>'} <small class="muted">${r.score_count?r.score_count+' review'+(r.score_count>1?'s':''):''}</small>${r.my_scored?' ✓':''}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No applicants here yet. Share the form link to start.</td></tr>'}
      </tbody></table></div></div>`;
    $('#view .pipe').onclick=e=>{const b=e.target.closest('[data-s]');if(b){REC.status=b.dataset.s;draw();}};
    $('#view tbody').onclick=e=>{const tr=e.target.closest('[data-id]');if(tr)recOpen(tr.dataset.id);};
  };
  draw();
};
async function recOpen(id,tab){
  const d=await api('recDetail',{id}),a=d.applicant,L=REC.data;
  const dn=ids=>String(ids||'').split(',').filter(Boolean).map(x=>(L.departments.find(z=>z.id===x)||{}).name||x).join(', ');
  const si=STEPS.indexOf(a.status);
  const steps=`<div class="steps">${STEPS.map((s,i)=>`<span class="${i<si?'done':i===si?'now':''}">${s}</span>`).join('')}${['Not selected','Withdrawn'].includes(a.status)?`<span class="now">${a.status}</span>`:''}</div>`;
  const T=tab||(a.status==='Applied'?'app':['Shortlisted'].includes(a.status)?'int':['Interview scheduled','Interviewed'].includes(a.status)?'marks':'dec');
  const tabs=[['app','Application'],['int','Interview'],['marks','Marks'],['dec','Decision']];
  const body={
    app:`<dl class="kv"><dt>Email</dt><dd><a href="mailto:${esc(a.email)}">${esc(a.email)}</a></dd><dt>Phone</dt><dd>${esc(a.phone)}</dd><dt>Age</dt><dd>${esc(a.age)}</dd>
      <dt>School / college</dt><dd>${esc(a.institution)} ${a.grade?'· '+esc(a.grade):''}</dd><dt>City</dt><dd>${esc(a.city)}</dd><dt>Teams wanted</dt><dd>${esc(dn(a.departments))}</dd>
      <dt>Licenses</dt><dd>${esc(String(a.licenses||'').replace(/,/g,', '))||'—'}</dd><dt>Portfolio</dt><dd>${a.portfolio?`<a href="${esc(a.portfolio)}" target="_blank" rel="noopener">${esc(a.portfolio)}</a>`:'—'}</dd><dt>Applied</dt><dd>${esc(String(a.created_at).replace('T',' ').slice(0,16))} · ${esc(a.id)}</dd></dl>
      <h4>Why they want to join</h4><div class="log">${esc(a.why)}</div>${a.experience?`<h4>Experience</h4><div class="log">${esc(a.experience)}</div>`:''}${a.plan?`<h4>What they would bring</h4><div class="log">${esc(a.plan)}</div>`:''}`,
    int:a.status==='Applied'||a.status==='Not selected'?`<p>Shortlisting emails ${esc(a.name.split(' ')[0])} that they are shortlisted and that an interview invitation will follow.</p><label>Add a note to the email (optional)<textarea id="rNote"></textarea></label>`
      :!['Shortlisted','Interview scheduled','Interviewed'].includes(a.status)?(a.interview_at?`<div class="meet">🎥 <div><b>Interviewed</b> ${esc(String(a.interview_at).replace('T',' at '))} IST</div></div>`:'<p class="muted">No interview on record.</p>')
      :`${a.meet_link?`<div class="meet">🎥 <div><b>${esc(String(a.interview_at).replace('T',' at '))} IST</b> · ${esc(a.interview_minutes)} min<br><a href="${esc(a.meet_link)}" target="_blank" rel="noopener">${esc(a.meet_link)}</a></div></div>`:a.interview_at?`<div class="banner">Scheduled for ${esc(String(a.interview_at).replace('T',' at '))} IST. No Meet link: turn on the Google Calendar API service in Apps Script to add Meet links automatically.</div>`:''}
      <div class="grid2"><label>Date<input type="date" id="rD" value="${esc(String(a.interview_at||'').slice(0,10))}" min="${today()}"></label><label>Time (IST)<input type="time" id="rT" value="${esc(String(a.interview_at||'').slice(11,16)||'17:00')}"></label>
      <label>Length (minutes)<input type="number" id="rM" value="${esc(a.interview_minutes||L.minutes)}" min="10" max="180"></label></div>
      <label>Interviewers (they get the calendar invite with the Meet link)</label><div class="ppick">${L.people.map(p=>`<label class="chk"><input type="checkbox" value="${esc(p.email)}" ${String(a.interviewers||ME.email).split(',').includes(p.email)?'checked':''}> ${esc(p.name)}</label>`).join('')}</div>
      <label>Also invite (other Gmail addresses, comma separated)<input id="rX" placeholder="name@gmail.com"></label>
      <label>Note for the candidate (optional)<textarea id="rNote" placeholder="e.g. Please keep a 1-minute introduction ready."></textarea></label>`,
    marks:`${!['Shortlisted','Interview scheduled','Interviewed'].includes(a.status)?'<p class="muted">Marks open once the candidate is shortlisted.</p>':
      `<p class="muted">Your marks, out of 10 for each. Each reviewer marks separately; the score is the average.</p>${d.criteria.map(c=>{const v=d.mine?d.mine.marks[c]:5;return `<div class="crit"><span>${esc(c)}</span><input type="range" min="0" max="10" step="0.5" value="${v}" data-c="${esc(c)}" oninput="this.nextElementSibling.textContent=this.value"><output>${v}</output></div>`;}).join('')}
      <label>Notes<textarea id="rSN">${esc(d.mine?d.mine.note:'')}</textarea></label>`}
      ${d.scores.length?`<h4>All reviews ${a.score_avg?'· average <b>'+esc(a.score_avg)+'%</b>':''}</h4><div class="scroll"><table class="tbl"><thead><tr><th>Reviewer</th>${d.criteria.map(c=>`<th>${esc(c)}</th>`).join('')}<th>Total</th><th>Notes</th></tr></thead><tbody>
      ${d.scores.map(s=>`<tr><td>${esc((L.people.find(p=>p.email===s.reviewer)||{}).name||s.reviewer)}</td>${d.criteria.map(c=>`<td>${esc(s.marks[c]??'')}</td>`).join('')}<td><b>${esc(s.total)}</b>/${d.criteria.length*10}</td><td>${esc(s.note)}</td></tr>`).join('')}</tbody></table></div>`:''}`,
    dec:a.status==='Onboarded'?`<div class="meet">✅ <div><b>Charter signed</b> on ${esc(String(a.charter_signed_at).replace('T',' ').slice(0,16))} IST (version ${esc(a.charter_version)}).<br>Member of ${esc(dn(a.assigned_department))} as ${esc(a.assigned_role||'Member')}. Portal login sent to ${esc(a.member_email)}.</div></div>`
      :a.status==='Selected'?`<div class="banner">Selected for ${esc(dn(a.assigned_department))} as ${esc(a.assigned_role||'Member')}. Waiting for them to sign the Charter. The link lasts 14 days.</div>`
      :!d.canDecide?`<p class="muted">Final selection is made by the Organizer (Charter 8.2.4). Your marks and notes go to them.</p>`
      :`<p>The candidate will get an email to read and sign the <b>TEDxThaltej Charter</b>. Once they sign, they are added to the team and get their Team Portal login.</p>
        <div class="grid2"><label>Team<select id="rDept">${L.departments.map(x=>`<option value="${x.id}" ${String(a.departments).split(',')[0]===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label>Role title<input id="rRole" value="Member"></label></div><label>Private note (kept in the record)<textarea id="rDN">${esc(a.decision_note||'')}</textarea></label>`,
  };
  modal(a.name,`${steps}<div class="tabsx">${tabs.map(([k,n])=>`<button data-tab="${k}" class="${k===T?'on':''}">${n}</button>`).join('')}</div>${body[T]}`,[
    T==='int'&&(a.status==='Applied'||a.status==='Not selected')&&['Shortlist and email',async()=>{await api('recShortlist',{id,note:$('#rNote').value});toast('Shortlisted. Email sent.');recOpen(id,'int');VIEWS.recruit();}],
    T==='int'&&['Shortlisted','Interview scheduled','Interviewed'].includes(a.status)&&[a.interview_at?'Reschedule and send update':'Schedule and send invites',async()=>{
      const iv=[...document.querySelectorAll('.ppick input:checked')].map(x=>x.value).concat($('#rX').value.split(',').map(s=>s.trim()).filter(Boolean));
      const r=await api('recSchedule',{id,date:$('#rD').value,time:$('#rT').value,minutes:$('#rM').value,interviewers:iv,note:$('#rNote').value});
      toast(r.meet_link?'Invites sent with a Google Meet link':'Invites sent');recOpen(id,'int');VIEWS.recruit();}],
    T==='marks'&&['Shortlisted','Interview scheduled','Interviewed'].includes(a.status)&&['Save my marks',async()=>{const marks={};document.querySelectorAll('.crit input').forEach(i=>marks[i.dataset.c]=+i.value);
      await api('recScore',{id,marks,note:$('#rSN').value});toast('Marks saved');recOpen(id,'marks');VIEWS.recruit();}],
    T==='dec'&&d.canDecide&&!['Selected','Onboarded'].includes(a.status)&&['Not selected',async()=>{if(!confirm('Send '+a.name+' a kind “not this time” email?'))return;await api('recDecide',{id,decision:'Not selected',note:$('#rDN').value});toast('Done. Email sent.');closeM();VIEWS.recruit();},'light'],
    T==='dec'&&d.canDecide&&!['Selected','Onboarded'].includes(a.status)&&['Select → send Charter',async()=>{await api('recDecide',{id,decision:'Selected',department_id:$('#rDept').value,role:$('#rRole').value,note:$('#rDN').value});toast('Selected. Charter link emailed.');recOpen(id,'dec');VIEWS.recruit();},'ok'],
    T==='dec'&&d.canDecide&&a.status==='Selected'&&['Resend Charter link',async()=>{await api('recResend',{id});toast('New link sent');},'light'],
    T==='dec'&&a.status==='Onboarded'&&['Download signed Charter (PDF)',async()=>{const r=await api('recPdf',{id});if(typeof dlPdf==='function')dlPdf(r);else toast('Saved in Drive');},'light'],
  ]);
  $('#mBox').classList.add('wide');
  document.querySelectorAll('#mBox [data-tab]').forEach(b=>b.onclick=()=>recOpen(id,b.dataset.tab));
}

/* ───────── preview data (only when no backend URL is set) ───────── */
window.MOCK_PLUS=function(b,me,D){
  const a=b.action,now=()=>new Date().toISOString().slice(0,19);
  if(!D._im){
    const P=[{email:me.email,name:me.name,role:'super',department_id:''},{email:'sanskriti@example.com',name:'Sanskriti Patidar',role:'lead',department_id:'DP1'},
      {email:'hirva@example.com',name:'Hirva',role:'lead',department_id:'DP2'},{email:'kalash@example.com',name:'Kalash',role:'lead',department_id:'DP4'},{email:'member1@example.com',name:'Sample Member',role:'member',department_id:'DP4'}];
    D._im={P,M:[
      {id:'M1',thread_id:'T1',from_email:'sanskriti@example.com',from_name:'Sanskriti Patidar',to:[me.email],to_label:'Fenil Pritesh Shah',subject:'AIS: 12 new referrals this week',body:'Hi Fenil,\n\nWe received 12 referrals this week. Three look ready for curation. Can we meet on Thursday?\n\nSanskriti',created_at:'2026-11-11T09:12:00'},
      {id:'M2',thread_id:'T2',from_email:'kalash@example.com',from_name:'Kalash',to:[me.email,'member1@example.com'],to_label:'Social Media team',subject:'Zenith teaser reel — first cut',body:'First cut is up: https://example.com/reel\nFeedback by Friday please!',created_at:'2026-11-10T18:40:00'},
      {id:'M3',thread_id:'T3',from_email:me.email,from_name:me.name,to:['hirva@example.com','sanskriti@example.com','kalash@example.com'],to_label:'Core Team',subject:'Core Team meeting — Sunday 11 am',body:'Agenda: speakers, partners, AIS.\nPlease bring updates.',created_at:'2026-11-09T11:00:00'}],
      B:{T1:{f:'inbox',r:0,s:0},T2:{f:'inbox',r:1,s:1},T3:{f:'sent',r:1,s:0}}};
  }
  const I=D._im,cnt=()=>({inbox:Object.keys(I.B).filter(k=>I.B[k].f==='inbox'&&!I.B[k].r).length,starred:Object.keys(I.B).filter(k=>I.B[k].s).length});
  if(a==='imBoot') return {ok:true,me:me.email,people:I.P,counts:cnt(),groups:[{id:'all',name:'Everyone',count:I.P.length},{id:'core',name:'Core Team (Directors & Heads)',count:4}].concat(D.departments.map(d=>({id:'dept:'+d.id,name:d.name+' team',count:I.P.filter(p=>p.department_id===d.id).length})))};
  if(a==='imCounts') return {ok:true,counts:cnt()};
  if(a==='imList'){const f=b.folder,q=String(b.q||'').toLowerCase();
    const rows=Object.keys(I.B).filter(t=>f==='starred'?I.B[t].s:I.B[t].f===f).map(t=>{const ms=I.M.filter(m=>m.thread_id===t),l=ms[ms.length-1];
      return {thread_id:t,subject:ms[0].subject,from:l.from_name,from_email:l.from_email,to_label:l.to_label,snippet:l.body.replace(/\s+/g,' ').slice(0,140),at:l.created_at,unread:!I.B[t].r,starred:!!I.B[t].s,count:ms.length};})
      .filter(r=>!q||(r.subject+r.from+r.snippet).toLowerCase().includes(q)).sort((x,y)=>y.at.localeCompare(x.at));return {ok:true,rows,counts:cnt()};}
  if(a==='imThread'){const t=b.thread_id,ms=I.M.filter(m=>m.thread_id===t);I.B[t].r=1;const ps={};ms.forEach(m=>{ps[m.from_email]=1;m.to.forEach(e=>ps[e]=1);});
    return {ok:true,thread_id:t,subject:ms[0].subject,starred:!!I.B[t].s,folder:I.B[t].f,counts:cnt(),participants:Object.keys(ps).map(e=>({email:e,name:(I.P.find(p=>p.email===e)||{}).name||e})),
      messages:ms.map(m=>({id:m.id,from:m.from_name,from_email:m.from_email,to:m.to,to_label:m.to_label,body:m.body,at:m.created_at}))};}
  if(a==='imSend'){const t=b.thread_id||('T'+(I.M.length+1));const first=I.M.find(m=>m.thread_id===t);
    if(!b.body)return {ok:false,error:'Write a message first.'};if(!first&&!b.subject)return {ok:false,error:'Add a subject.'};
    I.M.push({id:'M'+(I.M.length+1),thread_id:t,from_email:me.email,from_name:me.name,to:(b.to||[]).filter(x=>x.includes('@')),to_label:b.thread_id?'Reply':(b.to||[]).map(x=>x==='all'?'Everyone':x==='core'?'Core Team':x.startsWith('dept:')?((D.departments.find(d=>'dept:'+d.id===x)||{}).name+' team'):((I.P.find(p=>p.email===x)||{}).name||x)).join(', '),subject:first?first.subject:b.subject,body:b.body,created_at:now()});
    if(!I.B[t])I.B[t]={f:'sent',r:1,s:0};return {ok:true,thread_id:t};}
  if(a==='imAct'){const x=I.B[b.thread_id];({read:()=>x.r=1,unread:()=>x.r=0,star:()=>x.s=1,unstar:()=>x.s=0,archive:()=>x.f='archive',trash:()=>x.f='trash',inbox:()=>x.f='inbox'})[b.op]();return {ok:true,counts:cnt()};}
  // recruitment
  if(!D._rec) D._rec={rows:[
    {id:'AP-1',cycle:'2026-27',created_at:'2026-11-08T10:00:00',name:'Riya Patel',email:'riya@example.com',phone:'+91 98765 43210',age:'16',institution:'Udgam School',grade:'Class 11',city:'Ahmedabad',departments:'DP2,DP4',licenses:'TEDxThaltej Youth',why:'I have watched TEDx talks since Class 8 and I want to help young people in Ahmedabad find the courage to share their ideas.',experience:'School magazine editor; organised our science fair.',plan:'Speaker research and reels.',portfolio:'',status:'Interview scheduled',interview_at:'2026-11-15T17:30',interview_minutes:'20',interviewers:me.email,meet_link:'https://meet.google.com/abc-defg-hij',score_avg:''},
    {id:'AP-2',cycle:'2026-27',created_at:'2026-11-10T16:20:00',name:'Aarav Mehta',email:'aarav@example.com',phone:'+91 90000 11111',age:'17',institution:'Zydus School',grade:'Class 12',city:'Ahmedabad',departments:'DP5',licenses:'TEDxThaltej Youth,TEDxThaltej Salon',why:'Design is my thing. I want to make posters that people stop and look at, for an event I believe in.',experience:'Freelance posters for two school fests.',plan:'',portfolio:'https://behance.net/example',status:'Applied'},
    {id:'AP-3',cycle:'2026-27',created_at:'2026-11-02T12:00:00',name:'Meera Shah',email:'meera@example.com',phone:'+91 90000 22222',age:'18',institution:'Ahmedabad University',grade:'1st year',city:'Ahmedabad',departments:'DP1',licenses:'TEDxThaltej Youth',why:'AIS is exactly the kind of listening project I want to be part of.',status:'Onboarded',assigned_department:'DP1',assigned_role:'Idea Scout',charter_signed_at:'2026-11-06T19:02:11',charter_version:'2026.11',member_email:'meera@example.com',score_avg:'84'}],scores:{AP3:[]}};
  const R=D._rec,crit=['Communication','Understanding of TEDx','Initiative','Role fit','Commitment'];
  if(a==='recList'){const counts={};['Applied','Shortlisted','Interview scheduled','Interviewed','Selected','Not selected','Onboarded','Withdrawn'].forEach(s=>counts[s]=R.rows.filter(r=>r.status===s).length);
    return {ok:true,rows:R.rows.slice().reverse(),counts,statuses:Object.keys(counts),criteria:crit,cycle:'2026-27',open:true,minutes:20,canDecide:true,joinUrl:'https://tedxthaltejyouth.in/join',
      departments:D.departments.map(d=>({id:d.id,name:d.name})),people:I.P};}
  const ap=R.rows.find(r=>r.id===b.id);
  if(a==='recDetail'){const sc=(R.scores[b.id]||[]);return {ok:true,applicant:ap,scores:sc,mine:sc.find(s=>s.reviewer===me.email)||null,criteria:crit,canDecide:true};}
  if(a==='recShortlist'){ap.status='Shortlisted';return {ok:true};}
  if(a==='recSchedule'){if(!b.date||!b.time)return {ok:false,error:'Choose a date and a time.'};Object.assign(ap,{status:'Interview scheduled',interview_at:b.date+'T'+b.time,interview_minutes:String(b.minutes||20),interviewers:(b.interviewers||[]).join(','),meet_link:'https://meet.google.com/xyz-preview-link'});return {ok:true,meet_link:ap.meet_link};}
  if(a==='recScore'){const sc=R.scores[b.id]=(R.scores[b.id]||[]).filter(s=>s.reviewer!==me.email);const total=Object.values(b.marks).reduce((x,y)=>x+y,0);
    sc.push({reviewer:me.email,marks:b.marks,total:String(total),note:b.note,created_at:now()});ap.score_avg=String(Math.round(sc.reduce((x,s)=>x+ +s.total,0)/sc.length/50*1000)/10);if(ap.status==='Interview scheduled')ap.status='Interviewed';return {ok:true};}
  if(a==='recDecide'){if(b.decision==='Selected')Object.assign(ap,{status:'Selected',assigned_department:b.department_id,assigned_role:b.role});else ap.status='Not selected';return {ok:true};}
  if(a==='recResend'||a==='recPdf') return {ok:true,name:'preview.pdf',base64:''};
  return null;
};

/* ───────── home-screen app ───────── */
const head=document.head;
[['link',{rel:'manifest',href:'/portal/manifest.webmanifest'}],['meta',{name:'theme-color',content:'#101B3D'}],['meta',{name:'apple-mobile-web-app-capable',content:'yes'}],
 ['meta',{name:'mobile-web-app-capable',content:'yes'}],['meta',{name:'apple-mobile-web-app-status-bar-style',content:'default'}],['meta',{name:'apple-mobile-web-app-title',content:'TEDxTY Team'}],
 ['link',{rel:'apple-touch-icon',href:'/portal/icon-180.png'}]].forEach(([t,a])=>{const e=document.createElement(t);Object.assign(e,a);for(const k in a)e.setAttribute(k,a[k]);head.appendChild(e);});
if('serviceWorker' in navigator&&location.protocol==='https:') navigator.serviceWorker.register('/portal/sw.js').catch(()=>{});

/* mobile tab bar + deep links (#mail, #recruit) */
const tb=document.createElement('nav');tb.className='tabbar';
tb.innerHTML=[['dashboard','◎','Home'],['mail','✉','Mail'],['mytasks','✓','Tasks'],['menu','☰','More']].map(([k,i,n])=>`<button data-t="${k}"><i>${i}</i>${n}${k==='mail'?'<span class="dot" style="display:none"></span>':''}</button>`).join('');
tb.onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;if(b.dataset.t==='menu'){$('#side').classList.toggle('open');return;}go(b.dataset.t);};
$('#vApp').appendChild(tb);
const _go=go;
window.go=go=function(id){_go(id);tb.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===id));
  if(location.hash.slice(1)!==id)history.replaceState(null,'','#'+id);};
const h=location.hash.slice(1);if(h&&SECTIONS.some(s=>s.id===h))CUR=h;
const _boot=boot;window.boot=boot=async function(){await _boot();poll();};
})();
