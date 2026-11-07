/* Cloud mode: Firebase Auth + Firestore in the browser, agents via the Vercel API.
   If firebase-config.js is not filled in, this file does nothing and the app uses the local server. */
(() => {
  const C = window.BATON_FIREBASE;
  const onLocal = ["localhost", "127.0.0.1"].includes(location.hostname), mode = window.BATON_MODE || "auto";
  const cloud = mode === "cloud" || (mode === "auto" && !onLocal);
  if (!cloud || !C || !C.apiKey || C.apiKey.startsWith("YOUR")) return;
  window.BATON_CLOUD = true;
  const API = window.BATON_API || "", V = "10.14.1", U = m => `https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
  const imp = u => (window.__imp || (x => import(x)))(u);
  const rf = window.fetch, J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
  let P, run = null;
  const fb = () => P || (P = (async () => {
    const [a, au, fs] = await Promise.all([imp(U("app")), imp(U("auth")), imp(U("firestore"))]);
    const app = a.initializeApp(C), auth = au.getAuth(app), db = fs.getFirestore(app);
    const user = await new Promise(r => { const off = au.onAuthStateChanged(auth, u => { off(); r(u); }); });
    return { au, fs, auth, db, user };
  })());
  const MSG = { "auth/invalid-credential": "Incorrect email or password", "auth/wrong-password": "Incorrect email or password", "auth/user-not-found": "Incorrect email or password",
    "auth/email-already-in-use": "An account with this email already exists", "auth/weak-password": "Password must be at least 6 characters", "auth/invalid-email": "Enter a valid email address", "auth/too-many-requests": "Too many attempts. Try again later" };

  async function go(r, user) {
    const E = (t, x) => r.events.push({ type: t, ...x });
    let research, analysis, text;
    try {
      for (let i = 0; i < 3; i++) {
        E("stage", { index: i, state: "working" });
        const tok = await user.getIdToken();
        const res = await rf(API + "/api/stage", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
          body: JSON.stringify({ stage: i, topic: r.topic, depth: r.depth, tone: r.tone, research, analysis }) });
        const d = await res.json();
        if (!res.ok) throw new Error(d.detail || "Request failed");
        if (i == 0) research = d.text; if (i == 1) analysis = d.text; if (i == 2) text = d.text;
        E("stage", { index: i, state: "done", words: d.words, preview: d.preview });
      }
      const { fs, db } = await fb();
      await fs.setDoc(fs.doc(db, "users", user.uid, "reports", r.id), { id: r.id, topic: r.topic, depth: r.depth, tone: r.tone,
        created: new Date().toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), ts: Date.now(), markdown: text });
      E("done", { report_id: r.id });
    } catch (e) { E("error", { message: e.message }); }
  }

  window.fetch = async (u, o = {}) => {
    if (typeof u !== "string" || !u.startsWith("/api/") || u.startsWith("/api/stage") || u.startsWith("/api/health")) return rf(u, o);
    const { au, fs, auth, db, user } = await fb();
    const body = o.body ? JSON.parse(o.body) : {};
    if (u === "/api/auth/login" || u === "/api/auth/signup") {
      try {
        const cred = u.endsWith("login") ? await au.signInWithEmailAndPassword(auth, body.email, body.password) : await au.createUserWithEmailAndPassword(auth, body.email, body.password);
        if (u.endsWith("signup") && body.name) await au.updateProfile(cred.user, { displayName: body.name });
        return J({ name: body.name || cred.user.displayName || cred.user.email.split("@")[0], email: body.email });
      } catch (e) { return J({ detail: MSG[e.code] || "Something went wrong. Try again" }, 400); }
    }
    if (u === "/api/auth/me") return user ? J({ name: user.displayName || user.email }) : J({ detail: "Not signed in" }, 401);
    if (u === "/api/auth/logout") { await au.signOut(auth); return J({ ok: 1 }); }
    if (!user) { if (u === "/api/history") return J([]); location.href = "/login.html"; return J({ detail: "Sign in first" }, 401); }
    const col = fs.collection(db, "users", user.uid, "reports");
    if (u === "/api/run") { run = { ...body, id: Math.random().toString(36).slice(2, 12), events: [] }; go(run, user); return J({ id: run.id }); }
    if (u === "/api/history") { const s = await fs.getDocs(fs.query(col, fs.orderBy("ts", "desc"))); return J(s.docs.map(d => { const { markdown, ...r } = d.data(); return r; })); }
    const m = u.match(/^\/api\/report\/([^/]+)$/);
    if (m) {
      const ref = fs.doc(col, m[1]);
      if (o.method === "DELETE") { await fs.deleteDoc(ref); return J({ ok: 1 }); }
      const s = await fs.getDoc(ref); return s.exists() ? J(s.data()) : J({ detail: "Report not found" }, 404);
    }
    return J({ detail: "Not found" }, 404);
  };

  window.EventSource = class {
    constructor() {
      const r = run; let i = 0;
      const t = setInterval(() => {
        while (r && i < r.events.length) {
          const ev = r.events[i++];
          this.onmessage && this.onmessage({ data: JSON.stringify(ev) });
          if (ev.type == "done" || ev.type == "error") { clearInterval(t); return; }
        }
      }, 300);
    }
    close() {}
  };
  window.BATON_DL = (md, id) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" })); a.download = `report-${id}.md`; a.click(); };
})();
