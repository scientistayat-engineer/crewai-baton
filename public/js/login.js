/* Login page: tabs, password toggle, strength meter, sign in and sign up */

const $=s=>document.querySelector(s);
function tab(t){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.t==t));$("#in").classList.toggle("on",t=="in");$("#up").classList.toggle("on",t=="up");$("#err").style.display="none";
 $("#sw").innerHTML=t=="in"?'New here? <a data-t="up">Create an account</a>':'Already have an account? <a data-t="in">Sign in</a>'}
document.addEventListener("click",e=>{const t=e.target.closest("[data-t]");if(t)tab(t.dataset.t)});
document.querySelectorAll(".eye").forEach(b=>b.onclick=()=>{const i=b.previousElementSibling,s=i.type=="password";i.type=s?"text":"password";b.textContent=s?"HIDE":"SHOW"});
$("#p2").oninput=e=>{const v=e.target.value;let s=0;if(v.length>=8)s++;if(v.length>=12)s++;if(/[A-Z]/.test(v)&&/[a-z]/.test(v))s++;if(/\d/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;
 const L=[["#ff4d5e","Too weak"],["#ff4d5e","Weak"],["#ffb020","Fair"],["#ffb020","Good"],["#00e5ff","Strong"],["#00e5ff","Excellent"]][v?s:0];$("#mt").style.width=(v?s*20:0)+"%";$("#mt").style.background=L[0];$("#mh").textContent=v?L[1]:"Use 8+ characters with letters, numbers and symbols."};
function fail(m){const e=$("#err");e.textContent=m;e.style.display="block"}
async function send(path,body,btn){$("#err").style.display="none";const t=btn.textContent;btn.disabled=true;btn.textContent="AUTHENTICATING...";
 try{const r=await fetch("/api/auth/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.detail||"Something went wrong");
  $("#okn").textContent="Welcome, "+d.name;$("#ok").classList.add("on");setTimeout(()=>{if(!window.__PREVIEW)location.href="/"},1400)}
 catch(x){fail(x.message)}btn.disabled=false;btn.textContent=t}
$("#in").onsubmit=e=>{e.preventDefault();const em=$("#e1").value.trim(),pw=$("#p1").value;if(!em||!pw)return fail("Enter your email and password");send("login",{email:em,password:pw},e.target.querySelector(".go"))};
$("#up").onsubmit=e=>{e.preventDefault();const em=$("#e2").value.trim(),pw=$("#p2").value;if(!$("#n2").value.trim())return fail("Enter your name");if(!/^\S+@\S+\.\S+$/.test(em))return fail("Enter a valid email address");if(pw.length<8)return fail("Password must be at least 8 characters");send("signup",{name:$("#n2").value.trim(),email:em,password:pw},e.target.querySelector(".go"))};

/* ---------- Google sign-in (uses Firebase) and "already signed in" redirect ---------- */
if (!window.__PREVIEW) fetch("/api/auth/me").then(r => { if (r.ok) location.replace("/"); }).catch(() => {});
const GC = window.BATON_FIREBASE, gReady = !!window.__PREVIEW || !!(GC && GC.apiKey && !GC.apiKey.startsWith("YOUR"));
const imp = u => (window.__imp || (x => import(x)))(u);
const G_ICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const gbox = document.createElement("div");
gbox.innerHTML = '<div class="or"><span>or</span></div><button type="button" class="gbtn" id="gbtn">' + G_ICON + '<span>' + (gReady ? "Continue with Google" : "Continue with Google (set up Firebase first)") + '</span></button>';
document.querySelector(".hud").insertBefore(gbox, $("#err"));
if (!gReady) $("#gbtn").title = "Add your Firebase config in js/firebase-config.js to enable Google sign-in";
$("#gbtn").onclick = async () => {
  if (!gReady) return fail("Google sign-in needs your Firebase config in js/firebase-config.js");
  const btn = $("#gbtn"); btn.disabled = true; $("#err").style.display = "none";
    window.addEventListener("focus", () => setTimeout(() => { btn.disabled = false; }, 1500), { once: true }); // popup closed: unlock the button
  try {
    let name;
    if (window.__PREVIEW) { await new Promise(r => setTimeout(r, 700)); name = "Demo (Google)"; }
    else {
      const U = m => `https://www.gstatic.com/firebasejs/10.14.1/firebase-${m}.js`;
      const [a, au] = await Promise.all([imp(U("app")), imp(U("auth"))]);
      const auth = au.getAuth(a.initializeApp(GC));
      const user = (await au.signInWithPopup(auth, new au.GoogleAuthProvider())).user;
      name = user.displayName || user.email;
      if (!window.BATON_CLOUD) {
        const r = await fetch("/api/auth/firebase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: await user.getIdToken() }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Google sign-in failed");
        name = d.name;
      }
    }
    $("#okn").textContent = "Welcome, " + name; $("#ok").classList.add("on");
    setTimeout(() => { if (!window.__PREVIEW) location.href = "/"; }, 1400);
  } catch (e) {
    fail(e.code === "auth/popup-closed-by-user" ? "Google sign-in was cancelled" : e.code === "auth/unauthorized-domain" ? "Add this domain in Firebase, Authentication, Settings, Authorized domains" : (e.message || "Google sign-in failed"));
  }
  btn.disabled = false;
};
