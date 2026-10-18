"""Aggregate read models for Progress, Home resume, Sessions and Profile."""
from datetime import timedelta

from django.db.models import Count, Max, Q
from django.utils import timezone

from common.choices import MaterialStatus
from essays.models import Draft, Essay
from feedback.models import Feedback
from materials.models import Material
from progress.models import MethodProgress

TREND_POINTS = 8
MILESTONE_RULES = {
    "first_essay": lambda ctx: ctx["essays"] >= 1,
    "streak_3": lambda ctx: ctx["streak"] >= 3,
    "streak_7": lambda ctx: ctx["streak"] >= 7,
    "essays_10": lambda ctx: ctx["essays"] >= 10,
    "peel_pro": lambda ctx: ctx["peel"] >= 5,
    "teel_explorer": lambda ctx: ctx["teel"] >= 1,
}


def _essay_dates(user):
    return {
        timezone.localtime(created).date()
        for created in Essay.objects.filter(user=user).values_list("created_at", flat=True)
    }


def _streak(user):
    dates = _essay_dates(user)
    if not dates:
        return 0
    streak = 0
    day = max(dates)
    while day in dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


def _level_for(percent):
    if percent >= 70:
        label = "Confident"
    elif percent >= 40:
        label = "Practicing"
    elif percent >= 20:
        label = "Building"
    else:
        label = "Getting started"
    return min(5, percent // 20 + 1), label


def refresh_method_mastery(user, method):
    """Mastery = the average of each question's latest-revision score for a method.

    Recomputing from scratch (rather than nudging a counter) keeps it correct no
    matter how many revisions a learner submits or in what order.
    """
    latest_essay_ids = (
        Essay.objects.filter(user=user, question__method=method)
        .values("question_id")
        .annotate(latest=Max("id"))
        .values_list("latest", flat=True)
    )
    scores = list(
        Feedback.objects.filter(essay_id__in=list(latest_essay_ids)).values_list(
            "score", flat=True
        )
    )
    if scores:
        percent = round(sum(scores) / len(scores))
        level, level_label = _level_for(percent)
    else:
        percent, level, level_label = 0, 0, "Not started"
    MethodProgress.objects.filter(user=user, method=method).update(
        percent=percent,
        level=level,
        level_label=level_label,
        started=bool(scores),
    )


def evaluate_milestones(user):
    """Mark milestones earned. Additive: an earned milestone never resets."""
    counts = Essay.objects.filter(user=user).values("question__method").annotate(n=Count("id"))
    by_method = {row["question__method"]: row["n"] for row in counts}
    context = {
        "essays": Essay.objects.filter(user=user).count(),
        "streak": _streak(user),
        "peel": by_method.get("PEEL", 0),
        "teel": by_method.get("TEEL", 0),
    }
    to_earn = [
        milestone
        for milestone in user.milestones.all()
        if not milestone.earned and MILESTONE_RULES.get(milestone.key, lambda _: False)(context)
    ]
    if to_earn:
        for milestone in to_earn:
            milestone.earned = True
        user.milestones.bulk_update(to_earn, ["earned"])


def build_stats(user):
    essays = Essay.objects.filter(user=user)
    methods = set(essays.values_list("question__method", flat=True))
    return {
        "day_streak": _streak(user),
        "essays_written": essays.count(),
        "methods_tried": len(methods),
    }


def build_milestones(user):
    return [
        {"id": str(milestone.id), "label": milestone.label, "earned": milestone.earned}
        for milestone in user.milestones.all()
    ]


def _method_progress(user):
    return [
        {
            "method": row.method,
            "label": row.label,
            "level": row.level,
            "level_label": row.level_label,
            "percent": row.percent,
            "started": row.started,
        }
        for row in MethodProgress.objects.filter(user=user)
    ]


def build_trend(user):
    scores = list(
        Feedback.objects.filter(user=user)
        .order_by("-created_at", "-id")
        .values_list("score", flat=True)[:TREND_POINTS]
    )
    scores.reverse()
    return [{"label": str(index + 1), "value": score} for index, score in enumerate(scores)]


def build_by_material(user):
    materials = (
        Material.objects.filter(user=user, status=MaterialStatus.READY)
        .annotate(
            total=Count("questions", distinct=True),
            done=Count(
                "questions",
                filter=Q(questions__essays__isnull=False),
                distinct=True,
            ),
        )
        .order_by("-uploaded_at", "-id")
    )
    return [
        {
            "material_id": str(material.id),
            "title": material.title,
            "done": material.done,
            "total": material.total,
        }
        for material in materials
    ]


def build_resume(user):
    draft = (
        Draft.objects.filter(user=user)
        .select_related("question__material")
        .order_by("-updated_at", "-id")
        .first()
    )
    if draft is None:
        return None
    question = draft.question
    material = question.material
    return {
        "material_id": str(material.id),
        "material_title": material.title,
        "question_id": str(question.id),
        "question_text": question.text,
        "question_index": question.index,
        "total": question.total,
        "method": question.method,
        "saved_at": draft.updated_at.isoformat(),
    }


def build_progress(user):
    evaluate_milestones(user)
    return {
        "methods": _method_progress(user),
        "trend": build_trend(user),
        "by_material": build_by_material(user),
        "resume": build_resume(user),
    }


def build_session_summary(user, material):
    questions = list(material.questions.all())
    done_ids = set(
        Essay.objects.filter(question__material=material, user=user).values_list(
            "question_id", flat=True
        )
    )
    essays_completed = sum(1 for question in questions if question.id in done_ids)

    settings_obj = getattr(user, "settings", None)
    method = questions[0].method if questions else (
        settings_obj.default_method if settings_obj else "PEEL"
    )

    progress = MethodProgress.objects.filter(user=user, method=method).first()
    mastery_to = progress.percent if progress else 0
    mastery_from = max(0, mastery_to - 7)

    scores = [point["value"] for point in build_trend(user)]
    avg_score_delta = scores[-1] - scores[-2] if len(scores) >= 2 else 0

    best_label = None
    best_index = None
    feedbacks = (
        Feedback.objects.filter(user=user, essay__question__material=material)
        .select_related("essay__question")
        .order_by("essay__question__index", "id")
    )
    for feedback in feedbacks:
        for part in feedback.parts or []:
            if part.get("status") == "strong":
                best_label = part.get("label")
                best_index = feedback.essay.question.index
    best_moment = (
        f"{best_label} in Question {best_index}"
        if best_label
        else "Finishing the session"
    )

    return {
        "material_id": str(material.id),
        "essays_completed": essays_completed,
        "avg_score_delta": avg_score_delta,
        "method": method,
        "mastery_from": mastery_from,
        "mastery_to": mastery_to,
        "best_moment": best_moment,
    }
