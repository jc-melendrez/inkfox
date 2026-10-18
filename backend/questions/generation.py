"""Generate practice questions for a material via the ai/ provider layer."""


def generate_questions_for(material, extra=False):
    """Create question rows for `material` and return the rows just created.

    `extra=False` (used by upload processing) is a no-op if questions already
    exist. Raises ai.errors.AIUnavailable / AIGenerationError when AI is off or
    busy — callers decide whether that is fatal.
    """
    from ai import provider

    existing = list(material.questions.all())
    if not extra and existing:
        return []

    settings_obj = getattr(material.user, "settings", None)
    method = settings_obj.default_method if settings_obj else "PEEL"

    texts = provider.generate_questions(
        material.extracted_text, method, [question.text for question in existing]
    )
    from .services import create_questions

    return create_questions(material, [{"text": text} for text in texts], method)
