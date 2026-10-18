"""Validate and repair AI output against the Question/Feedback contract.

Never trust the model: anything malformed is reshaped into something the UI can
render, and genuinely unusable output raises ValueError (the caller retries).
"""
from common.choices import METHOD_PARTS

from .json_parse import parse_json

ALLOWED_STATUS = {"strong", "needs_work", "missing"}
MAX_QUESTIONS = 10


def _text(value, limit=400):
    return (value or "").strip()[:limit] if isinstance(value, str) else ""


def _string_list(value, limit=4, item_limit=200):
    if not isinstance(value, list):
        return []
    out = []
    for item in value:
        text = _text(item, item_limit)
        if text:
            out.append(text)
        if len(out) >= limit:
            break
    return out


def validate_questions(payload):
    if isinstance(payload, dict):
        payload = payload.get("questions") or payload.get("items") or []
    if not isinstance(payload, list):
        raise ValueError("AI did not return a list of questions.")
    questions = []
    for item in payload:
        text = item.get("text") if isinstance(item, dict) else item
        text = _text(text, 300)
        if 8 <= len(text):
            questions.append(text)
        if len(questions) >= MAX_QUESTIONS:
            break
    if not questions:
        raise ValueError("AI returned no usable questions.")
    return questions


def validate_feedback(payload, method):
    if isinstance(payload, str):
        payload = parse_json(payload)
    if not isinstance(payload, dict):
        raise ValueError("AI did not return a feedback object.")

    method_parts = METHOD_PARTS.get(method, METHOD_PARTS["PEEL"])
    raw_parts = payload.get("parts") if isinstance(payload.get("parts"), list) else []

    parts = []
    for index, (key, label) in enumerate(method_parts):
        source = raw_parts[index] if index < len(raw_parts) and isinstance(raw_parts[index], dict) else {}
        text = _text(source.get("text"))
        status = source.get("status")
        if status not in ALLOWED_STATUS:
            status = "missing" if not text else "needs_work"
        part = {"key": key, "label": label, "text": text, "status": status}
        note = _text(source.get("note"), 200)
        if note:
            part["note"] = note
        parts.append(part)

    improvements = []
    raw_improvements = payload.get("improvements") if isinstance(payload.get("improvements"), list) else []
    for item in raw_improvements[:4]:
        if isinstance(item, dict):
            message = _text(item.get("message"), 240)
            if message:
                key = _text(item.get("part_key") or item.get("key"), 4) or parts[0]["key"]
                improvements.append(
                    {
                        "part_key": key,
                        "label": _text(item.get("label"), 40) or "Next step",
                        "message": message,
                    }
                )
        elif isinstance(item, str) and item.strip():
            improvements.append(
                {"part_key": parts[0]["key"], "label": "Next step", "message": _text(item, 240)}
            )

    landed = sum(1 for part in parts if part["status"] != "missing")
    headline = _text(payload.get("headline"), 160) or _default_headline(landed, len(parts))
    strengths = _string_list(payload.get("strengths"))
    if not strengths:
        strengths = ["You made a clear attempt at answering the question."]

    return {
        "headline": headline,
        "parts": parts,
        "parts_landed": landed,
        "parts_total": len(parts),
        "strengths": strengths,
        "improvements": improvements,
    }


def _default_headline(landed, total):
    if landed >= total:
        return "Great work — you covered every part!"
    if landed == 0:
        return "Let's build the answer together."
    return "Nice start — a few parts to build out."
