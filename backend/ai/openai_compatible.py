"""OpenAI-compatible provider (Groq, OpenRouter, OpenAI, ...)."""
from django.conf import settings

from . import prompts, schema
from .http import post_json
from .json_parse import parse_json


def _complete(system, user_prompt):
    base_url = settings.AI_BASE_URL.rstrip("/")
    payload = {
        "model": settings.AI_MODEL,
        "temperature": 0.4,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
    }
    headers = {"Authorization": f"Bearer {settings.AI_API_KEY}"}
    data = post_json(f"{base_url}/chat/completions", headers, payload)
    choices = data.get("choices") or []
    if not choices:
        return ""
    return (choices[0].get("message") or {}).get("content", "")


def generate_questions(material_text, method, existing_questions):
    text = _complete(
        prompts.QUESTION_SYSTEM,
        prompts.question_prompt(material_text, method, existing_questions),
    )
    return schema.validate_questions(parse_json(text))


def evaluate_essay(essay_text, method, question_text, instructions=""):
    text = _complete(
        prompts.FEEDBACK_SYSTEM,
        prompts.feedback_prompt(essay_text, method, question_text, instructions),
    )
    return schema.validate_feedback(parse_json(text), method)
