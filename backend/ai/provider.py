"""Provider-agnostic AI interface. Views/services call ONLY these functions."""
from django.conf import settings

from .errors import AIUnavailable

SUPPORTED = ("anthropic", "openai_compatible")


def is_configured():
    provider = (settings.AI_PROVIDER or "").lower()
    if provider not in SUPPORTED:
        return False
    if not settings.AI_API_KEY:
        return False
    if provider == "openai_compatible" and not (settings.AI_BASE_URL and settings.AI_MODEL):
        return False
    return True


def _implementation():
    if not is_configured():
        raise AIUnavailable()
    if settings.AI_PROVIDER == "anthropic":
        from . import anthropic as impl
    else:
        from . import openai_compatible as impl
    return impl


def generate_questions(material_text, method, existing_questions):
    return _implementation().generate_questions(material_text, method, existing_questions)


def evaluate_essay(essay_text, method, question_text, instructions=""):
    return _implementation().evaluate_essay(essay_text, method, question_text, instructions)
