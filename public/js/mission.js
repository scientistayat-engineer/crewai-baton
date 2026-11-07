/* Mission control: reactor, launch, live stream, report viewer, archive */

const $=s=>document.querySelector(s);let depth="standard",cur=null,md="";
const C=200,Y=160,pt=(r,a)=>[C+r*Math.cos(a*Math.PI/180),Y+r*Math.sin(a*Math.PI/180)];
const arc=(r,a,b)=>{const p=pt(r,a),q=pt(r,b);return `M${p[0]} ${p[1]}A${r} ${r} 0 0 1 ${q[0]} ${q[1]}`};
const NAMES=["Researcher","Analyst","Editor"],START=[-80,40,160],MID=[-30,90,210];
$("#rx").innerHTML=`<circle class="rg r1" cx="200" cy="160" r="150"/><circle class="rg r2" cx="200" cy="160" r="136"/><circle class="rg r3" cx="200" cy="160" r="62"/>`+
 START.map((s,i)=>`<path class="seg" id="g${i}" d="${arc(100,s,s+100)}"/>`).join("")+
 `<circle class="core" cx="200" cy="160" r="46"/><text id="pct" x="200" y="164">0%</text><text class="cs" x="200" y="182">crew progress</text>`+
 MID.map((m,i)=>{const p=pt(128,m),a=p[0]>C+10?"start":p[0]<C-10?"end":"middle",dy=i==1?8:0;return `<text class="nm" x="${p[0]}" y="${p[1]+dy}" text-anchor="${a}">${NAMES[i]}</text><text class="st" id="t${i}" x="${p[0]}" y="${p[1]+14+dy}" text-anchor="${a}">Waiting</text>`}).join("");
document.querySelectorAll("#depth button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#depth button").forEach(x=>x.classList.remove("on"));b.classList.add("on");depth=b.dataset.v});
const W=["Researcher is gathering facts","Analyst is weighing the findings","Editor is writing the report"],D=["Research notes ready","Analysis ready","Report filed"],done=[0,0,0];
const say=m=>$("#log").textContent=m;
function stage(i,state){$("#g"+i).setAttribute("class","seg "+state);$("#t"+i).textContent={working:"Working",done:"Done",idle:"Waiting"}[state];done[i]=state=="done"?1:0;
 $("#pct").textContent=Math.round(done.reduce((a,b)=>a+b)/3*100)+"%";if(state=="working")say(W[i]);if(state=="done")say(D[i])}
function reset(){[0,1,2].forEach(i=>stage(i,"idle"));$("#err").style.display="none";say("Crew on standby. Launch it to start the relay.")}
function show(d){md=d.markdown;cur=d.id;$("#doc").innerHTML=DOMPurify.sanitize(marked.parse(md));$("#rep").style.display="block";$("#rep").scrollIntoView({behavior:"smooth"})}
$("#go").onclick=async()=>{const topic=$("#topic").value.trim();if(!topic){$("#topic").focus();return}
 reset();$("#rep").style.display="none";$("#go").disabled=true;$("#go").textContent="Crew is working";
 try{const r=await fetch("/api/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,depth,tone:$("#tone").value})});
  if(!r.ok)throw new Error((await r.json()).detail||"Could not start");const {id}=await r.json();
  const es=new EventSource("/api/stream/"+id);
  es.onmessage=async e=>{const ev=JSON.parse(e.data);
   if(ev.type=="stage")stage(ev.index,ev.state,ev);
   if(ev.type=="done"){es.close();stage(2,"done");show(await (await fetch("/api/report/"+ev.report_id)).json());fin();hist()}
   if(ev.type=="error"){es.close();fail(ev.message)}};
  es.onerror=()=>{es.close();fail("Lost connection to the server. Check that python main.py is still running.")}
 }catch(x){fail(x.message)}};
function fin(){$("#go").disabled=false;$("#go").textContent="Launch crew"}
function fail(m){fin();$("#err").textContent="The run stopped: "+m;$("#err").style.display="block"}
$("#copy").onclick=async()=>{await navigator.clipboard.writeText(md);$("#copy").textContent="Copied";setTimeout(()=>$("#copy").textContent="Copy text",1500)};
$("#dl").onclick=()=>window.BATON_DL?BATON_DL(md,cur):location.href=`/api/report/${cur}/download`;
async function hist(){const h=await (await fetch("/api/history")).json();const box=$("#hist");box.innerHTML=h.length?"":'<div class="empty">Nothing here yet. Finished reports are saved automatically.</div>';
 h.forEach(i=>{const d=document.createElement("div");d.className="item";d.innerHTML=`<div><b></b><span>${i.created}</span></div><button title="Delete report" aria-label="Delete report">×</button>`;
  d.querySelector("b").textContent=i.topic;
  d.onclick=async()=>{show(await (await fetch("/api/report/"+i.id)).json())};
  d.querySelector("button").onclick=async e=>{e.stopPropagation();await fetch("/api/report/"+i.id,{method:"DELETE"});hist()};box.append(d)})}
hist();


$("#print").onclick=()=>print();
