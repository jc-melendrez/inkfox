from .models import Feedback

SCORE_WEIGHT = {"strong": 1.0, "needs_work": 0.5, "missing": 0.0}


def score_for_parts(parts):
    if not parts:
        return 0
    total = sum(SCORE_WEIGHT.get(part.get("status"), 0.0) for part in parts)
    return round(total / len(parts) * 100)


def create_from_data(essay, data):
    """Persist a Feedback row from already-validated AI output (no AI call)."""
    return Feedback.objects.create(
        essay=essay,
        user=essay.user,
        draft_number=essay.revision_number,
        method=essay.question.method,
        headline=data["headline"],
        parts_landed=data["parts_landed"],
        parts_total=data["parts_total"],
        parts=data["parts"],
        strengths=data["strengths"],
        improvements=data["improvements"],
        score=score_for_parts(data["parts"]),
    )
