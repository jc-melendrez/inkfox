from .models import Question, fingerprint_of


def create_questions(material, items, method):
    """Create questions for a material, skipping duplicates. Returns the new rows.

    `items` are dicts with "text" and optional "source_passage".
    """
    existing = list(material.questions.all())
    seen = {question.fingerprint for question in existing}
    next_index = max((question.index for question in existing), default=0) + 1
    default_passage = (material.extracted_text or "")[:400].strip()

    created = []
    for item in items:
        text = (item.get("text") if isinstance(item, dict) else item) or ""
        text = text.strip()
        if not text:
            continue
        fingerprint = fingerprint_of(text)
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        question = Question.objects.create(
            material=material,
            index=next_index,
            total=0,
            text=text,
            source_passage=(
                item.get("source_passage") if isinstance(item, dict) else None
            )
            or default_passage,
            method=method,
        )
        created.append(question)
        next_index += 1

    if created:
        material.questions.update(total=material.questions.count())
    return created
