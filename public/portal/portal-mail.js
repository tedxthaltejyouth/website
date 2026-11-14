/* Team Portal: Official email. Members write an email to send as TEDxThaltej Youth from an address on the official
   domain (fenil.shah@tedxthaltejyouth.in), with attachments. The Organizer approves it, then it goes out by ZeptoMail. */
(function(){
const at=id=>SECTIONS.findIndex(s=>s.id===id);
SECTIONS.splice(at('mail')+1,0,{id:'outbound',name:'Official email',ico:'✈',grp:'Overview',always:true});
const h=location.hash.slice(1);if(h==='outbound')CUR=h;
const css=`.b-Draft{background:#f1f1f1;color:#666}.b-Pending.approval{background:#101B3D;color:#fff}.b-Changes.requested{background:#fdeaea;color:var(--bad)}.b-Sent{background:#e6f6ec;color:var(--ok)}.b-Rejected{background:#f1f1f1;color:#999}.b-Failed{background:#fdeaea;color:var(--bad)}
.ob-from{display:flex;align-items:stretch;border:1.5px solid var(--line);border-radius:12px;overflow:hidden;background:#fff}.ob-from input{border:0!important;border-radius:0!important;flex:1;min-width:0}.ob-from span{display:flex;align-items:center;padding:0 12px;background:#f4f2ee;font-weight:700;font-size:14px;white-space:nowrap}
.ob-att{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.ob-att span{background:#f4f2ee;border-radius:99px;padding:5px 10px;font-size:12px;font-weight:700;display:inline-flex;gap:6px;align-items:center}.ob-att button{border:0;background:none;cursor:pointer;font-weight:900}
.ob-prev{width:100%;height:56vh;border:1px solid var(--line);border-radius:12px;background:#fff}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const toData=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
const fdt=s=>s?String(s).replace('T',' ').slice(0,16):'';
const kb=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
let B=null;

VIEWS.outbound=async function(){
  B=await api('obBoot');
  addBtn('+ New official email',()=>compose());
  $('#view').innerHTML=`<div class="gx-hero"><div style="flex:1;min-width:240px"><h2>Official email</h2><p>Send an email as TEDxThaltej Youth: outreach to partners, schools, speakers or media. Choose an address like <b>${esc(B.suggested||'first.last')}@${esc(B.domain)}</b>, add attachments, and send it for approval. The Organizer checks it, then it goes out.</p></div></div>
    ${!B.zepto?'<div class="banner">ZeptoMail isn’t connected yet, so approved emails can’t go out. The Organizer connects it in Admin Health.</div>':''}
    ${B.google_email?'':'<div class="banner">Connect your Google account (Account → Sign-in & security) to CC yourself and get replies there.</div>'}
    <div class="panel">${B.rows.length?tableHTML(B.rows,[['updated_at','Updated',(v,_,r)=>fdt(r.sent_at||r.created_at)],['subject','Subject',(v,_,r)=>`<b>${esc(v)}</b><div class="muted">${esc(r.from_name)} &lt;${esc(r.from)}&gt;</div>`],['to','To',v=>esc(String(v).split(',').slice(0,2).join(', '))+(String(v).split(',').length>2?' +'+(String(v).split(',').length-2):'')],B.super?['by','By',esc]:null,['status','Status',badge]].filter(Boolean)):'<div class="empty" style="padding:30px;text-align:center">No official emails yet.</div>'}</div>`;
  $('#view').querySelectorAll('tr[data-i]').forEach(tr=>tr.onclick=()=>{const r=B.rows[tr.dataset.i];
    if(r.mine&&['Draft','Changes requested'].includes(r.status))return api('obGet',{id:r.id}).then(j=>compose(j.mail));
    if(B.super&&['Pending approval','Failed'].includes(r.status))return obReview(r.id,()=>VIEWS.outbound());
    view(r.id);});
};
async function compose(m){
  m=m||{};if(!B)B=await api('obBoot');
  const keep=(m.attachments||[]).map(a=>a.i),files=[];
  modal(m.id?'Edit official email':'New official email',`${m.note&&m.status==='Changes requested'?`<div class="banner bad"><b>Organizer:</b> ${esc(m.note)}</div>`:''}
    <div class="grid2"><label style="grid-column:1/-1">Send from<div class="ob-from"><input id="obL" value="${esc(m.from_local||B.suggested||'')}" placeholder="first.last" autocomplete="off"><span>@${esc(B.domain)}</span></div></label>
    <label style="grid-column:1/-1">Name shown to the receiver<select id="obN"><option value="org" ${m.name_mode!=='me'?'selected':''}>TEDxThaltej Youth</option><option value="me" ${m.name_mode==='me'?'selected':''}>${esc(ME.name)}, TEDxThaltej Youth</option></select></label>
    <label style="grid-column:1/-1">To<input id="obTo" value="${esc(String(m.to_list||'').split(',').join(', '))}" placeholder="name@company.com, other@school.edu"></label>
    <label>Cc <span class="muted" style="font-weight:400">(optional)</span><input id="obCc" value="${esc(String(m.cc_list||'').split(',').join(', '))}"></label>
    <label>Bcc <span class="muted" style="font-weight:400">(optional)</span><input id="obBcc" value="${esc(String(m.bcc_list||'').split(',').join(', '))}"></label>
    <label class="chk" style="grid-column:1/-1"><input type="checkbox" id="obMe" ${m.cc_self||(!m.id&&B.google_email)?'checked':''} ${B.google_email?'':'disabled'}> CC my Google email ${B.google_email?`<b>${esc(B.google_email)}</b>`:'(connect Google first)'}. Replies also come there.</label>
    <label style="grid-column:1/-1">Subject<input id="obS" maxlength="200" value="${esc(m.subject||'')}"></label>
    <label style="grid-column:1/-1">Message<textarea id="obB" rows="10" placeholder="Dear …,&#10;&#10;">${esc(m.body||'')}</textarea></label>
    <p class="gx-note" style="grid-column:1/-1;margin-top:-6px">Blank line = new paragraph · **bold** · [text](https://link) · lines starting with “- ” become a list.</p>
    <label style="grid-column:1/-1">Sign-off <span class="muted" style="font-weight:400">(optional)</span><textarea id="obSig" rows="3">${esc(m.signature||(ME.name+'\nTEDxThaltej Youth\ntedxthaltejyouth.in'))}</textarea></label>
    <label style="grid-column:1/-1">Attachments <span class="muted" style="font-weight:400">(up to 10 files, 10 MB in total)</span><input id="obF" type="file" multiple><div class="ob-att" id="obAtt"></div></label></div>`,
    [['Save draft',()=>save(false),'light left'],['Send for approval',()=>save(true)]]);
  $('#mBox').classList.add('wide');
  const paint=()=>{$('#obAtt').innerHTML=(m.attachments||[]).filter(a=>keep.includes(a.i)).map(a=>`<span>📎 ${esc(a.name)} · ${kb(a.size)}<button data-k="${a.i}" aria-label="Remove">✕</button></span>`).join('')+files.map((f,i)=>`<span>📎 ${esc(f.name)} · ${kb(f.size)}<button data-n="${i}" aria-label="Remove">✕</button></span>`).join('');
    $('#obAtt').querySelectorAll('[data-k]').forEach(b=>b.onclick=e=>{e.preventDefault();keep.splice(keep.indexOf(+b.dataset.k),1);paint();});
    $('#obAtt').querySelectorAll('[data-n]').forEach(b=>b.onclick=e=>{e.preventDefault();files.splice(+b.dataset.n,1);paint();});};
  $('#obF').onchange=e=>{[...e.target.files].forEach(f=>files.push(f));e.target.value='';paint();};paint();
  async function save(submit){
    const total=files.reduce((s,f)=>s+f.size,0)+(m.attachments||[]).filter(a=>keep.includes(a.i)).reduce((s,a)=>s+a.size,0);
    if(total>10*1048576)return toast('Attachments are over 10 MB. Share big files as a Drive link instead.',1);
    if(submit&&!confirm('Send this email to the Organizer for approval?'))return;
    const up=[];for(const f of files)up.push({name:f.name,dataUrl:await toData(f)});
    const r=await api('obSave',{id:m.id||'',from_local:$('#obL').value,name_mode:$('#obN').value,to:$('#obTo').value,cc:$('#obCc').value,bcc:$('#obBcc').value,cc_self:$('#obMe').checked,
      subject:$('#obS').value,body:$('#obB').value,signature:$('#obSig').value,keep,files:up,submit});
    toast(r.status==='Sent'?'Sent ✓':submit?'Sent to the Organizer for approval':'Draft saved');closeM();VIEWS.outbound();}
}
async function view(id){
  const m=(await api('obGet',{id})).mail;
  const acts=m.status==='Pending approval'&&m.by===ME.email?[['Withdraw to edit',async()=>{await api('obWithdraw',{id});toast('Back to draft');closeM();VIEWS.outbound();},'light']]:[];
  modal(m.subject,head(m)+`<iframe class="ob-prev" sandbox="" srcdoc="${esc(m.html)}"></iframe>`,acts);$('#mBox').classList.add('wide');bindAtt(m);
}
function head(m){return `<dl class="kv"><dt>Status</dt><dd>${badge(m.status)}</dd><dt>From</dt><dd><b>${esc(m.from_name)}</b> &lt;${esc(m.from_local)}@${esc(m.domain)}&gt;</dd><dt>To</dt><dd>${esc(String(m.to_list).split(',').join(', '))}</dd>
  ${m.cc_list||m.cc_self?`<dt>Cc</dt><dd>${esc([].concat(m.cc_list?String(m.cc_list).split(','):[],m.cc_self?[m.reply_to]:[]).join(', '))}</dd>`:''}${m.bcc_list?`<dt>Bcc</dt><dd>${esc(String(m.bcc_list).split(',').join(', '))}</dd>`:''}
  ${m.reply_to?`<dt>Replies go to</dt><dd>${esc(m.reply_to)}</dd>`:''}<dt>Written by</dt><dd>${esc(m.by_name)}</dd>${m.note?`<dt>Note</dt><dd>${esc(m.note)}</dd>`:''}${m.error?`<dt>Error</dt><dd style="color:var(--bad)">${esc(m.error)}</dd>`:''}</dl>
  ${m.attachments.length?`<div class="ob-att" style="margin:4px 0 10px">${m.attachments.map(a=>`<span>📎 <a href="#" data-a="${a.i}">${esc(a.name)}</a> · ${kb(a.size)}</span>`).join('')}</div>`:''}`;}
function bindAtt(m){$('#mBox').querySelectorAll('[data-a]').forEach(a=>a.onclick=async e=>{e.preventDefault();const f=await api('obFile',{id:m.id,i:a.dataset.a});const l=document.createElement('a');l.href='data:'+f.type+';base64,'+f.base64;l.download=f.name;l.click();});}
async function obReview(id,back){
  const m=(await api('obGet',{id})).mail;
  const note=d=>modal((d==='changes'?'Ask for changes · ':'Reject · ')+m.subject,`<label>Note for ${esc(m.by_name)}<textarea id="obNote" rows="4"></textarea></label>`,
    [['Back',()=>obReview(id,back),'light'],[d==='changes'?'Send back':'Reject',async()=>{await api('obDecide',{id,decision:d,note:$('#obNote').value});toast(d==='changes'?'Sent back':'Rejected');closeM();back();},d==='changes'?'':'bad']]);
  modal('Approve official email',head(m)+`<iframe class="ob-prev" sandbox="" srcdoc="${esc(m.html)}"></iframe><p class="gx-note" style="margin-top:8px">Approving sends it immediately through ZeptoMail from <b>${esc(m.from_local)}@${esc(m.domain)}</b>.</p>`,
    [['Reject…',()=>note('reject'),'bad left'],['Ask for changes…',()=>note('changes'),'light'],[m.status==='Failed'?'Try sending again':'✓ Approve and send',async()=>{if(!confirm('Send this email now?'))return;await api('obDecide',{id,decision:'approve'});toast('Sent ✓');closeM();back();},'ok']]);
  $('#mBox').classList.add('wide');bindAtt(m);
}
window.obReview=obReview;

const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  if(!D._ob){D._ob=[{id:'OM-2026-0003',by:'kalash@example.com',by_name:'Kalash',from_local:'kalash.p',domain:'tedxthaltejyouth.in',name_mode:'me',from_name:'Kalash Patel, TEDxThaltej Youth',to_list:'partnerships@acme.in,ceo@acme.in',cc_list:'',bcc_list:'',cc_self:true,reply_to:'kalash.p@gmail.com',
      subject:'Partnership proposal: TEDxThaltej Youth 2027',body:'Dear Acme team,\n\nTEDxThaltej Youth brings 100 young people together to share ideas worth spreading. We would love to have **Acme** as our Knowledge Partner.\n\nOur deck is attached. Could we meet next week?',signature:'Kalash Patel\nPartnerships, TEDxThaltej Youth',
      attachments:[{i:1,name:'TEDxThaltej Youth 2027 Partner Deck.pdf',size:2400000}],status:'Pending approval',created_at:'2026-11-13T15:20',updated_at:'2026-11-13T15:20'},
     {id:'OM-2026-0002',by:'demo@tedxthaltejyouth.in',by_name:'Fenil Pritesh Shah',from_local:'fenil.shah',domain:'tedxthaltejyouth.in',name_mode:'org',from_name:'TEDxThaltej Youth',to_list:'principal@school.edu',cc_list:'',bcc_list:'',subject:'Invitation: speaker nominations from your school',body:'Dear Principal,\n\nWe invite your students to nominate speakers.',attachments:[],status:'Sent',created_at:'2026-11-10T11:00',sent_at:'2026-11-10T11:02',updated_at:'2026-11-10T11:02'}];}
  const a=b.action,L=D._ob,html=m=>'<div style="font-family:Inter,Arial,sans-serif;background:#FFF4E2;padding:24px"><div style="background:#fff;border-radius:16px;padding:24px"><h2 style="font-family:Anton,Impact,sans-serif;text-transform:uppercase">'+esc(m.subject)+'</h2>'+String(m.body).split(/\n{2,}/).map(p=>'<p>'+esc(p).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')+'</p>').join('')+'<p style="color:#444">'+esc(m.signature||'').replace(/\n/g,'<br>')+'</p></div></div>';
  if(a==='obBoot')return {ok:true,domain:'tedxthaltejyouth.in',google_email:me.google_email||'fenil.preview@gmail.com',zepto:true,super:true,suggested:'fenil.shah',
    rows:L.map(m=>({id:m.id,subject:m.subject,from:m.from_local+'@'+m.domain,from_name:m.from_name,to:m.to_list,status:m.status,by:m.by_name,mine:m.by===me.email,created_at:m.created_at,sent_at:m.sent_at}))};
  if(a==='obGet'){const m=L.find(x=>x.id===b.id);return {ok:true,mail:Object.assign({},m,{html:html(m)})};}
  if(a==='obSave'){let m=b.id&&L.find(x=>x.id===b.id);if(!m){m={id:'OM-2026-000'+(L.length+1),by:me.email,by_name:me.name,domain:'tedxthaltejyouth.in',created_at:new Date().toISOString(),attachments:[]};L.unshift(m);}
    Object.assign(m,{from_local:b.from_local,name_mode:b.name_mode,from_name:b.name_mode==='me'?me.name+', TEDxThaltej Youth':'TEDxThaltej Youth',to_list:b.to,cc_list:b.cc,subject:b.subject,body:b.body,signature:b.signature,status:b.submit?'Sent':'Draft'});return {ok:true,id:m.id,status:m.status};}
  if(a==='obDecide'){const m=L.find(x=>x.id===b.id);m.status=b.decision==='approve'?'Sent':b.decision==='changes'?'Changes requested':'Rejected';return {ok:true,status:m.status};}
  if(a==='obWithdraw'){L.find(x=>x.id===b.id).status='Draft';return {ok:true};}
  if(a==='obFile')return {ok:false,error:'Not in preview'};
  if(a==='approvals'){const r=prev?prev(b,me,D):{ok:true,rows:[]};r.rows=L.filter(m=>m.status==='Pending approval').map(m=>({type:'email',id:m.id,title:m.subject,who:m.by_name,from:m.from_name+' <'+m.from_local+'@'+m.domain+'>',status:m.status,chain:['Organizer'],approvals:[],mine:true})).concat(r.rows||[]);return r;}
  return prev?prev(b,me,D):null;
};
})();
