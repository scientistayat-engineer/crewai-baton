/* Agent cards, mission log and timers (wraps the mission functions) */
const AG=[["R-01","Researcher","Finds and organises the facts","Collecting background, current developments and applications.","<circle cx='10' cy='10' r='6'/><path d='M15 15l5 5'/>"],
["A-02","Analyst","Weighs insights, risks and options","Reviewing the research for strengths, risks and opportunities.","<path d='M5 19V11M12 19V5M19 19v-6'/>"],
["E-03","Editor","Writes the final report","Turning the findings into a clear, structured report.","<path d='M4 20l4-1 11-11-3-3L5 16z'/>"]];
$("#agents").innerHTML=AG.map((a,i)=>`<div class="hud ag" id="c${i}"><div class="ah"><div class="hex"><i><svg viewBox="0 0 24 24">${a[4]}</svg></i></div><div><div class="an">${a[1]}</div><div class="ac">${a[0]} · ${a[2]}</div></div><div class="chip" id="k${i}">STANDBY</div></div><div class="at">${a[3]}</div><div class="pb"><i></i></div><div class="am"><span>Time <b id="tm${i}">0s</b></span><span>Words <b id="wd${i}">0</b></span></div><div class="ap" id="pv${i}"></div></div>`).join("");
const clock=()=>new Date().toLocaleTimeString([],{hour12:false}),t0=[0,0,0];let tm=null,t00=0;
function logL(m,c){const li=document.createElement("li");li.innerHTML=`<time>${clock()}</time><span class="${c||""}"></span>`;li.querySelector("span").textContent=m;const ml=$("#ml");if(ml.firstChild&&ml.firstChild.textContent.includes("Waiting for your"))ml.innerHTML="";ml.append(li);ml.scrollTop=1e9}
const _st=stage;stage=function(i,s,ev){_st(i,s);$("#c"+i).className="hud ag "+(s=="idle"?"":s);$("#k"+i).textContent={idle:"STANDBY",working:"ACTIVE",done:"COMPLETE"}[s];
 if(s=="working"){t0[i]=Date.now();logL(NAMES[i]+" started: "+AG[i][3])}
 if(s=="done"){const sec=Math.max(1,Math.round((Date.now()-t0[i])/1000));$("#tm"+i).textContent=sec+"s";if(ev){$("#wd"+i).textContent=ev.words||0;$("#pv"+i).textContent=ev.preview?ev.preview+"...":""}logL(NAMES[i]+" finished in "+sec+"s"+(ev&&ev.words?", "+ev.words+" words":""))}};
const _rs=reset;reset=function(){_rs();[0,1,2].forEach(i=>{$("#tm"+i).textContent="0s";$("#wd"+i).textContent="0";$("#pv"+i).textContent=""});$("#ml").innerHTML="";logL("Mission accepted. Crew is starting.");t00=Date.now();clearInterval(tm);tm=setInterval(()=>{const s=Math.round((Date.now()-t00)/1000);$("#el").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")},1000)};
const _fn=fin;fin=function(){_fn();clearInterval(tm)};
const _fl=fail;fail=function(m){_fl(m);logL("Run stopped: "+m,"e")};
