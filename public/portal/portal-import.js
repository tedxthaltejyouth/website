/* Team Portal: import old recruitment form responses (Google Sheet link, .xlsx or .csv) into Recruitment. */
(function(){
/* ── tiny readers: CSV and .xlsx (zip + XML, read in the browser; nothing is uploaded until you press Import) ── */
function parseCSV(t){const rows=[];let row=[],f='',q=false;t=t.replace(/^﻿/,'');
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c==='"')q=true;else if(c===','){row.push(f);f='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f='';}else f+=c;}
  if(f||row.length){row.push(f);rows.push(row);}return rows.filter(r=>r.some(x=>String(x).trim()));}
async function unzip(buf){const v=new DataView(buf),u=new Uint8Array(buf),files={};let e=buf.byteLength-22;
  while(e>=0&&v.getUint32(e,true)!==0x06054b50)e--; if(e<0)throw new Error('Not an .xlsx file');
  let p=v.getUint32(e+16,true);const n=v.getUint16(e+10,true);
  for(let k=0;k<n;k++){const meth=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),off=v.getUint32(p+42,true);
    const name=new TextDecoder().decode(u.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;
    files[name]=async()=>{const ln=v.getUint16(off+26,true),lx=v.getUint16(off+28,true),data=u.subarray(off+30+ln+lx,off+30+ln+lx+cs);
      if(meth===0)return new TextDecoder().decode(data);
      const s=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return await new Response(s).text();};}
  return files;}
async function parseXLSX(buf){const z=await unzip(buf),X=s=>new DOMParser().parseFromString(s,'application/xml');
  const ss=z['xl/sharedStrings.xml']?[...X(await z['xl/sharedStrings.xml']()).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
  const name=Object.keys(z).filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];if(!name)throw new Error('No sheet found in the file');
  const rows=[];[...X(await z[name]()).getElementsByTagName('row')].forEach(r=>{const out=[];
    [...r.getElementsByTagName('c')].forEach(c=>{const ref=c.getAttribute('r')||'',col=ref.replace(/\d+/g,'').split('').reduce((a,ch)=>a*26+ch.charCodeAt(0)-64,0)-1,t=c.getAttribute('t');
      const vv=c.getElementsByTagName('v')[0],is=c.getElementsByTagName('is')[0];let val=vv?vv.textContent:is?is.textContent:'';
      if(t==='s')val=ss[+val]||'';else if(!t&&/^\d+(\.\d+)?$/.test(val)&&+val>40000&&+val<60000&&/time|date/i.test((rows[0]||[])[col]||''))val=new Date(Math.round((+val-25569)*864e5)).toISOString().replace('T',' ').slice(0,19);
      else if(!t&&/^-?\d+(\.\d+)?(E[+-]?\d+)?$/i.test(val)&&Number.isInteger(+val)&&Math.abs(+val)<1e15)val=String(Math.round(+val));
      out[col>=0?col:out.length]=val;});
    rows.push(Array.from(out,x=>x==null?'':x));});
  return rows.filter(r=>r.some(x=>String(x).trim()));}

/* ── guess which applicant field each form question belongs to ── */
const FIELDS=[['skip','— Don’t import'],['name','Name'],['email','Email'],['phone','Phone'],['age','Age'],['institution','School / college'],['grade','Grade / year'],['city','City'],['departments','Team(s) applied for'],['created_at','Date applied'],
  ['why','Why they want to join'],['experience','About them, skills, experience'],['plan','Other answers'],['portfolio','Links (portfolio, Instagram, LinkedIn)']];
function guess(h,used){h=String(h).toLowerCase();
  if(/timestamp|submitted|date/.test(h))return 'created_at';
  if(/e-?mail/.test(h))return used.email?'skip':'email';
  if(/full name|^name|your name/.test(h))return 'name';
  if(/phone|mobile|whatsapp|contact number/.test(h))return 'phone';
  if(/^age|how old/.test(h))return 'age';
  if(/school|college|institution|university/.test(h))return 'institution';
  if(/grade|class|standard|year of study/.test(h))return 'grade';
  if(/city|location|where do you live/.test(h))return 'city';
  if(/which department|which team|apply for|department\(s\)/.test(h))return 'departments';
  if(/why .*(join|tedx)/.test(h))return 'why';
  if(/tell us about yourself|skills|experience|worked on|qualities/.test(h))return 'experience';
  if(/link|instagram|linkedin|portfolio|website/.test(h))return 'portfolio';
  return 'plan';}

window.recImportOpen=function(){
  let H=[],R=[],src='';
  modal('Import applications',`<p class="gx-note">Bring in applications from an old Google Form. Each response becomes an applicant in this cycle, with status <b>Applied</b>. Nobody is emailed unless you choose to.</p>
    <div class="grid2"><label style="grid-column:1/-1">Google Sheet link (the form’s responses sheet)<div style="display:flex;gap:6px"><input id="riU" placeholder="https://docs.google.com/spreadsheets/d/…" style="flex:1"><button class="btn light" id="riL" type="button">Load</button></div></label>
    <label style="grid-column:1/-1">…or a file you downloaded (.xlsx or .csv)<input id="riF" type="file" accept=".xlsx,.csv,text/csv"></label></div>
    <p class="gx-note">For the link: share the sheet (Viewer) with the Google account that runs the website.</p><div id="riMap"></div>`,[]);
  $('#mBox').classList.add('wide');
  const show=()=>{const used={};const M=H.map(h=>{const g=guess(h,used);used[g]=1;return g;});
    $('#riMap').innerHTML=`<div class="banner" style="margin-top:8px"><b>${R.length}</b> responses found${src?' in '+esc(src):''}. Check where each question goes.</div>
      <div style="max-height:46vh;overflow:auto;border:1px solid var(--line);border-radius:12px"><table class="t"><thead><tr><th>Form question</th><th>Example answer</th><th>Goes to</th></tr></thead><tbody>
      ${H.map((h,i)=>`<tr><td style="max-width:280px"><b>${esc(h)}</b></td><td class="muted" style="max-width:260px;font-size:12px">${esc(String((R.find(r=>String(r[i]||'').trim())||[])[i]||'').slice(0,80))}</td>
        <td><select data-c="${i}" style="width:auto">${FIELDS.map(f=>`<option value="${f[0]}" ${M[i]===f[0]?'selected':''}>${f[1]}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
      <p class="gx-note" style="margin-top:6px">Several questions can go to the same box; each answer keeps its question as a heading. Team names are matched to your departments.</p>
      <label class="chk" style="margin-top:6px"><input type="checkbox" id="riN"> Email each applicant that their application is now in our system</label>
      <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn red" id="riGo" type="button">Import ${R.length} applications</button></div>`;
    $('#riGo').onclick=async function(){const map={};$('#riMap').querySelectorAll('select[data-c]').forEach(s=>{if(s.value!=='skip')map[s.dataset.c]=s.value;});
      this.disabled=true;this.textContent='Importing…';
      try{const r=await api('recImport',{headers:H,rows:R,map,notify:$('#riN').checked,source:src||'Google Form'});
        const unk=Object.keys(r.unknown_depts||{});
        modal('Import finished',`<p style="font-size:16px"><b>${r.added}</b> applications imported.</p>
          ${r.skipped.length?`<p style="margin-top:8px"><b>${r.skipped.length} skipped:</b></p><ul style="margin-left:18px;font-size:13px">${r.skipped.slice(0,30).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}
          ${unk.length?`<div class="banner" style="margin-top:10px">These team names didn’t match a department, so those applicants have no team set: <b>${unk.map(esc).join(', ')}</b>. Add the departments (Team → Departments) or set the team on each applicant.</div>`:''}`,
          [['Done',()=>{closeM();go('recruit');}]]);}
      catch(e){toast(e.message,1);this.disabled=false;this.textContent='Import '+R.length+' applications';}};};
  const take=(rows,name)=>{if(rows.length<2)return toast('No responses found in that file',1);H=rows[0].map(String);R=rows.slice(1).map(r=>H.map((_,i)=>String(r[i]==null?'':r[i])));src=name;show();};
  $('#riL').onclick=async()=>{try{const j=await api('recImportPreview',{url:$('#riU').value});H=j.headers;R=j.rows;src=j.title;show();}catch(e){toast(e.message,1);}};
  $('#riF').onchange=async e=>{const f=e.target.files[0];if(!f)return;
    try{const rows=/\.xlsx$/i.test(f.name)?await parseXLSX(await f.arrayBuffer()):parseCSV(await f.text());take(rows,f.name);}catch(err){toast('Couldn’t read that file: '+err.message,1);}};
};
window.__txImport={parseCSV,parseXLSX,guess};

const _r=VIEWS.recruit;
VIEWS.recruit=async function(){await _r.apply(this,arguments);
  if(ME.role==='super'||((ME.scopes||[]).includes('recruit')&&ME.role!=='viewer')){const b=document.createElement('button');b.className='btn light';b.textContent='⇪ Import applications';b.onclick=recImportOpen;$('#tools').prepend(b);}};

const prev=window.MOCK_PLUS;
window.MOCK_PLUS=function(b,me,D){
  if(b.action==='recImport'){const n=b.rows.length;return {ok:true,added:n-1,skipped:['Row 9: aarav@example.com already applied this cycle'],unknown_depts:{Hosting:3}};}
  if(b.action==='recImportPreview')return {ok:false,error:'Sheet links work only on the live site.'};
  return prev?prev(b,me,D):null;
};
})();
