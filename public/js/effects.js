/* Pulse rings, launch flash, report reveal, 3D card tilt, typing placeholder */
$("#rx").insertAdjacentHTML("afterbegin",'<circle class="pl" cx="200" cy="160" r="60"/><circle class="pl pl2" cx="200" cy="160" r="60"/>');
const _st2=stage;stage=function(i,s,ev){_st2(i,s,ev);$("#rx").classList.toggle("act",!!document.querySelector(".seg.working"))};
const _rs2=reset;reset=function(){_rs2();const f=document.createElement("div");f.className="flash";document.body.append(f);setTimeout(()=>f.remove(),1300)};
const _sh=show;show=function(d){_sh(d);document.querySelectorAll("#doc>*").forEach((e,i)=>{e.style.animation="rise .6s both";e.style.animationDelay=Math.min(i,30)*70+"ms"})};
document.querySelectorAll(".ag").forEach(c=>{c.onmousemove=e=>{const r=c.getBoundingClientRect(),a=(e.clientX-r.left)/r.width-.5,b=(e.clientY-r.top)/r.height-.5;c.style.transform=`rotateY(${a*10}deg) rotateX(${-b*10}deg) translateZ(6px)`};c.onmouseleave=()=>c.style.transform=""});
const EX=["How can small businesses use AI agents?","Future of quantum computing in healthcare","Impact of electric vehicles on a developing economy","Cybersecurity trends for startups"];let ei=0,ci=0;
(function ty(){const t=$("#topic");if(document.activeElement===t||t.value){setTimeout(ty,1500);return}const s=EX[ei];t.placeholder=s.slice(0,++ci)+"|";if(ci>=s.length){ci=0;ei=(ei+1)%EX.length;setTimeout(ty,2200)}else setTimeout(ty,45)})();
