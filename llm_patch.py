"""Strips CrewAI's internal `cache_breakpoint` key, which Groq rejects."""
import litellm

_orig = litellm.completion


def _patched(*args, **kwargs):
    msgs = kwargs.get("messages")
    if msgs:
        kwargs["messages"] = [
            {k: v for k, v in m.items() if k != "cache_breakpoint"} if isinstance(m, dict) else m
            for m in msgs
        ]
    return _orig(*args, **kwargs)


litellm.completion = _patched
