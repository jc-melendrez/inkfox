"""Anthropic Messages API provider."""
from django.conf import settings

from . import prompts, schema
from .http import post_json
from .json_parse import parse_json

API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-3-5-haiku-latest"


def _complete(system, user_prompt):
    payload = {
        "model": settings.AI_MODEL or DEFAULT_MODEL,
        "max_tokens": 1500,
        "system": system,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    headers = {
        "x-api-key": settings.AI_API_KEY,
        "anthropic-version": "2023-06-01",
    }
    data = post_json(API_URL, headers, payload)
    blocks = data.get("content") or []
    return "".join(
        block.get("text", "") for block in blocks if isinstance(block, dict)
    )


def generate_questions(material_text, method, existing_questions):
    text = _complete(
        prompts.QUESTION_SYSTEM,
        prompts.question_prompt(material_text, method, existing_questions),
    )
    return schema.validate_questions(parse_json(text))


def evaluate_essay(essay_text, method, question_text):
    text = _complete(
        prompts.FEEDBACK_SYSTEM,
        prompts.feedback_prompt(essay_text, method, question_text),
    )
    return schema.validate_feedback(parse_json(text), method)
