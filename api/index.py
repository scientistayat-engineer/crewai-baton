"""Baton cloud API for Vercel. Each agent runs as its own short request, so every call stays well inside serverless limits."""
import os
from typing import Optional
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from langsmith import Client, traceable

app = FastAPI(title="Baton API")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "*").split(","), allow_methods=["*"], allow_headers=["*"])
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
ls = Client()
SIZE = {"quick": "about 400 words", "standard": "about 900 words", "deep": "about 1600 words"}


class StageReq(BaseModel):
    stage: int
    topic: str
    depth: str = "standard"
    tone: str = "professional"
    research: Optional[str] = None
    analysis: Optional[str] = None


def verify(auth: Optional[str]) -> str:
    """Check the Firebase ID token. If FIREBASE_PROJECT_ID is not set (local dev) auth is skipped."""
    if not PROJECT_ID:
        return "dev"
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(401, "Sign in first")
    try:
        from google.auth.transport import requests as greq
        from google.oauth2 import id_token
        return id_token.verify_firebase_token(auth[7:], greq.Request(), audience=PROJECT_ID)["uid"]
    except Exception:
        raise HTTPException(401, "Your session has expired. Please sign in again")


@traceable(run_type="llm", name="groq-completion", client=ls)
def llm(system: str, prompt: str) -> str:
    r = Groq(api_key=os.environ["GROQ_API_KEY"]).chat.completions.create(
        model=MODEL, temperature=0.3,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}])
    return r.choices[0].message.content or ""


@traceable(run_type="chain", client=ls)
def run_agent(role: str, system: str, prompt: str, topic: str = "") -> str:
    return llm(system, prompt)


def build(r: StageReq):
    t = r.topic.strip()
    if r.stage == 0:
        return ("Researcher", "You are a careful researcher who never invents facts or sources.",
                f"Research the topic: {t}. Cover introduction, key concepts, current developments, applications, benefits, challenges and future opportunities. Do not invent facts or references.")
    if r.stage == 1:
        return ("Analyst", "You are a critical analyst who only uses the research provided.",
                f"Research notes:\n{r.research}\n\nAnalyse them: key insights, strengths, weaknesses, risks, opportunities, recommendations. No unsupported claims.")
    return ("Editor", f"You are a {r.tone} writer who structures reports in Markdown.",
            f"Write the final report on {t}, {SIZE.get(r.depth, SIZE['standard'])}, tone: {r.tone}.\n\nResearch:\n{r.research}\n\nAnalysis:\n{r.analysis}\n\nUse Markdown with: Executive summary, Introduction, Findings, Analysis, Benefits and challenges, Recommendations, Conclusion.")


@app.post("/api/stage")
def stage(r: StageReq, authorization: Optional[str] = Header(None)):
    uid = verify(authorization)
    if r.stage not in (0, 1, 2) or not r.topic.strip():
        raise HTTPException(400, "Enter a topic and a valid stage")
    if (r.stage >= 1 and not r.research) or (r.stage == 2 and not r.analysis):
        raise HTTPException(400, "Missing output from the earlier agent")
    role, system, prompt = build(r)
    try:
        text = run_agent(role, system, prompt, topic=r.topic, langsmith_extra={"metadata": {"agent": role, "user": uid}, "tags": ["baton", role.lower()]})
    except Exception as e:
        raise HTTPException(502, f"The {role} could not finish: {str(e)[:200]}")
    finally:
        try:
            ls.flush()
        except Exception:
            pass
    return {"stage": r.stage, "agent": role, "text": text, "words": len(text.split()), "preview": " ".join(text.split())[:260]}


@app.get("/api/health")
def health():
    return {"ok": True, "model": MODEL, "auth": bool(PROJECT_ID), "langsmith": os.getenv("LANGSMITH_TRACING", "false")}
