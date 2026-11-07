import os, json, time, uuid, threading, sqlite3, hashlib, secrets, hmac
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
import llm_patch  # noqa: F401  (must load before crewai calls litellm)
from crewai import Agent, Task, Crew, Process, LLM
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import StreamingResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

try:
    from langsmith import traceable
except ImportError:  # LangSmith is optional locally
    def traceable(**_kw):
        return lambda f: f

KEY = os.getenv("GROQ_API_KEY")
if not KEY:
    raise RuntimeError("Add GROQ_API_KEY to your .env file")
MODEL = os.getenv("GROQ_MODEL", "groq/openai/gpt-oss-20b")
BASE = Path(__file__).parent
REPORTS = BASE / "reports"
REPORTS.mkdir(exist_ok=True)
JOBS: dict = {}
SIZE = {"quick": "about 400 words", "standard": "about 900 words", "deep": "about 1600 words"}

app = FastAPI(title="Baton")


class RunReq(BaseModel):
    topic: str
    depth: str = "standard"
    tone: str = "professional"


def emit(job, type_, **kw):
    job["events"].append({"type": type_, **kw})


def build(job, req: RunReq):
    llm = LLM(model=MODEL, api_key=KEY, temperature=0.3, timeout=120, max_retries=3)

    def agent(role, goal, story):
        return Agent(role=role, goal=goal, backstory=story, llm=llm, verbose=False)

    def cb(i):
        def _cb(out):
            raw = str(getattr(out, "raw", out) or "")
            emit(job, "stage", index=i, state="done", words=len(raw.split()), preview=" ".join(raw.split())[:260])
            if i < 2:
                emit(job, "stage", index=i + 1, state="working")
        return _cb

    r = agent("Researcher", "Collect accurate, well organised facts.", "A careful researcher who never invents facts or sources.")
    a = agent("Analyst", "Find the insights, risks and opportunities.", "A critical analyst who only uses the research provided.")
    w = agent("Editor", "Write a clear final report.", f"A {req.tone} writer who structures reports in Markdown.")
    t1 = Task(description=f"Research the topic: {req.topic}. Cover introduction, key concepts, current developments, applications, benefits, challenges and future opportunities. Do not invent facts or references.",
              expected_output="Structured research notes.", agent=r, callback=cb(0))
    t2 = Task(description="Analyse the research: key insights, strengths, weaknesses, risks, opportunities, recommendations. No unsupported claims.",
              expected_output="A concise analysis.", agent=a, context=[t1], callback=cb(1))
    t3 = Task(description=f"Write the final report on {req.topic}, {SIZE.get(req.depth, SIZE['standard'])}, tone: {req.tone}. Use Markdown with: Executive summary, Introduction, Findings, Analysis, Benefits and challenges, Recommendations, Conclusion.",
              expected_output="A complete Markdown report.", agent=w, context=[t1, t2], callback=cb(2))
    crew = Crew(agents=[r, a, w], tasks=[t1, t2, t3], process=Process.sequential, verbose=False)
    return crew, t3


def run(job, req: RunReq):
    try:
        emit(job, "stage", index=0, state="working")
        crew, last = build(job, req)
        result = traceable(name="baton-crew-run", run_type="chain")(crew.kickoff)()
        md = getattr(getattr(last, "output", None), "raw", None) or str(result)
        rid = job["id"]
        meta = {"id": rid, "topic": req.topic, "depth": req.depth, "tone": req.tone,
                "created": datetime.now().strftime("%d %b %Y, %H:%M"), "ts": time.time(), "markdown": md}
        (REPORTS / f"{rid}.json").write_text(json.dumps(meta), encoding="utf-8")
        emit(job, "done", report_id=rid)
    except Exception as e:  # surface the real reason in the UI
        emit(job, "error", message=str(e)[:400])


@app.post("/api/run")
def start(req: RunReq):
    if not req.topic.strip():
        raise HTTPException(400, "Enter a topic first")
    jid = uuid.uuid4().hex[:10]
    job = {"id": jid, "events": []}
    JOBS[jid] = job
    threading.Thread(target=run, args=(job, req), daemon=True).start()
    return {"id": jid}


@app.get("/api/stream/{jid}")
def stream(jid: str):
    job = JOBS.get(jid)
    if not job:
        raise HTTPException(404, "Unknown run")

    def gen():
        i = 0
        while True:
            while i < len(job["events"]):
                ev = job["events"][i]
                i += 1
                yield f"data: {json.dumps(ev)}\n\n"
                if ev["type"] in ("done", "error"):
                    return
            time.sleep(0.4)

    return StreamingResponse(gen(), media_type="text/event-stream")


def load(rid: str):
    p = REPORTS / f"{Path(rid).name}.json"
    if not p.exists():
        raise HTTPException(404, "Report not found")
    return json.loads(p.read_text(encoding="utf-8"))


@app.get("/api/history")
def history():
    items = [json.loads(p.read_text(encoding="utf-8")) for p in REPORTS.glob("*.json")]
    items.sort(key=lambda x: x["ts"], reverse=True)
    return [{k: v for k, v in i.items() if k != "markdown"} for i in items]


@app.get("/api/report/{rid}")
def report(rid: str):
    return load(rid)


@app.get("/api/report/{rid}/download")
def download(rid: str):
    d = load(rid)
    return PlainTextResponse(d["markdown"], headers={"Content-Disposition": f'attachment; filename="report-{rid}.md"'})


@app.delete("/api/report/{rid}")
def delete(rid: str):
    (REPORTS / f"{Path(rid).name}.json").unlink(missing_ok=True)
    return {"ok": True}



# ---------- accounts ----------
DB = BASE / "users.db"
SESS: dict = {}


def db():
    c = sqlite3.connect(DB)
    c.execute("create table if not exists users(email text primary key, name text, salt text, hash text)")
    return c


def pw_hash(pw: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()


class Auth(BaseModel):
    email: str
    password: str
    name: str = ""


def start_session(res: Response, email: str, name: str):
    tok = secrets.token_urlsafe(32)
    SESS[tok] = {"email": email, "name": name}
    res.set_cookie("baton_session", tok, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 7)


@app.post("/api/auth/signup")
def signup(a: Auth, res: Response):
    email = a.email.strip().lower()
    if "@" not in email or len(a.password) < 8:
        raise HTTPException(400, "Use a valid email and a password of at least 8 characters")
    salt = secrets.token_hex(16)
    with db() as c:
        try:
            c.execute("insert into users values(?,?,?,?)", (email, a.name.strip() or email.split("@")[0], salt, pw_hash(a.password, salt)))
        except sqlite3.IntegrityError:
            raise HTTPException(409, "An account with this email already exists")
    name = a.name.strip() or email.split("@")[0]
    start_session(res, email, name)
    return {"name": name, "email": email}


@app.post("/api/auth/login")
def login(a: Auth, res: Response):
    email = a.email.strip().lower()
    row = db().execute("select name, salt, hash from users where email=?", (email,)).fetchone()
    if not row or not hmac.compare_digest(row[2], pw_hash(a.password, row[1])):
        raise HTTPException(401, "Incorrect email or password")
    start_session(res, email, row[0])
    return {"name": row[0], "email": email}


@app.get("/api/auth/me")
def me(req: Request):
    u = SESS.get(req.cookies.get("baton_session", ""))
    if not u:
        raise HTTPException(401, "Not signed in")
    return u


@app.post("/api/auth/logout")
def logout(req: Request, res: Response):
    SESS.pop(req.cookies.get("baton_session", ""), None)
    res.delete_cookie("baton_session")
    return {"ok": True}

@app.post("/api/auth/firebase")
def firebase_login(body: dict, res: Response):
    """Google sign-in: the browser signs in with Firebase, we verify the ID token and start a local session."""
    pid = os.getenv("FIREBASE_PROJECT_ID")
    if not pid:
        raise HTTPException(400, "Add FIREBASE_PROJECT_ID to your .env file")
    try:
        from google.auth.transport import requests as greq
        from google.oauth2 import id_token
        info = id_token.verify_firebase_token(body.get("idToken", ""), greq.Request(), audience=pid)
    except Exception:
        raise HTTPException(401, "Google sign-in could not be verified")
    email = (info.get("email") or "").lower()
    name = info.get("name") or email.split("@")[0]
    start_session(res, email, name)
    return {"name": name, "email": email}


app.mount("/", StaticFiles(directory=BASE / "public", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
