"""Create a demo account with sample materials, essays, feedback and progress.

Idempotent: re-running resets the demo user's content. Works with AI disabled.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Milestone, Settings, User
from common.choices import MILESTONES
from common.sample_data import SAMPLE_ESSAY, SAMPLE_MATERIALS, build_sample_feedback
from essays.models import Draft, Essay
from feedback.models import Feedback
from materials.models import Material
from progress.models import MethodProgress
from questions.models import Question

DEMO_EMAIL = "sam.rivera@university.edu"
DEMO_PASSWORD = "DemoPass123"
DEMO_NAME = "Sam Rivera"
DEMO_ROLE = "University student"

# Chronological essay scores -> the 8-point trend shown on the Progress screen.
ESSAY_PLAN = [
    ("WW2 Causes Reading", [48, 52, 50, 58]),
    ("Cell Biology Notes", [61, 59, 66, 70]),
]

DRAFT_TEXT = (
    "Mitochondria give cells the energy they need to live. The textbook says one "
    "cell makes millions of ATP per second. This is important because energy is used."
)

PROGRESS_DEFAULTS = {
    "PEEL": (3, "Practicing", 62, True),
    "TEEL": (1, "Getting started", 30, True),
    "Other": (0, "Not started", 0, False),
}
EARNED_MILESTONES = {"first_essay", "streak_3", "streak_7", "essays_10", "peel_pro"}


class Command(BaseCommand):
    help = "Create/refresh the demo user and their sample content."

    @transaction.atomic
    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            email=DEMO_EMAIL, defaults={"name": DEMO_NAME, "role": DEMO_ROLE}
        )
        user.name = DEMO_NAME
        user.role = DEMO_ROLE
        user.onboarded = True
        user.set_password(DEMO_PASSWORD)
        user.save()

        Settings.objects.get_or_create(user=user)
        if not user.milestones.exists():
            Milestone.objects.bulk_create(
                [
                    Milestone(user=user, key=key, label=label, order=index)
                    for index, (key, label) in enumerate(MILESTONES)
                ]
            )
        for method, label in (("PEEL", "PEEL"), ("TEEL", "TEEL"), ("Other", "Other methods")):
            MethodProgress.objects.get_or_create(user=user, method=method, defaults={"label": label})

        Material.objects.filter(user=user).delete()

        materials = {}
        for spec in SAMPLE_MATERIALS:
            material = Material.objects.create(
                user=user,
                title=spec["title"],
                file_type=spec["file_type"],
                pages=spec["pages"],
                status="ready",
                processing_progress=100,
                extracted_text=spec["passage"],
            )
            materials[spec["title"]] = material
            total = len(spec["questions"])
            for index, text in enumerate(spec["questions"], start=1):
                Question.objects.create(
                    material=material,
                    index=index,
                    total=total,
                    text=text,
                    source_passage=spec["passage"],
                    method=spec["method"],
                )

        for title, scores in ESSAY_PLAN:
            questions = list(Question.objects.filter(material=materials[title]))
            for question, score in zip(questions, scores):
                essay = Essay.objects.create(
                    user=user, question=question, content=SAMPLE_ESSAY
                )
                data = build_sample_feedback(question.method, SAMPLE_ESSAY, score)
                Feedback.objects.create(
                    essay=essay,
                    user=user,
                    draft_number=1,
                    method=data["method"],
                    headline=data["headline"],
                    parts_landed=data["parts_landed"],
                    parts_total=data["parts_total"],
                    parts=data["parts"],
                    strengths=data["strengths"],
                    improvements=data["improvements"],
                    score=score,
                )

        q5 = Question.objects.get(material=materials["Cell Biology Notes"], index=5)
        Draft.objects.update_or_create(
            user=user, question=q5, defaults={"content": DRAFT_TEXT}
        )

        for method_progress in MethodProgress.objects.filter(user=user):
            level, label, percent, started = PROGRESS_DEFAULTS.get(
                method_progress.method, (0, "Not started", 0, False)
            )
            method_progress.level = level
            method_progress.level_label = label
            method_progress.percent = percent
            method_progress.started = started
            method_progress.save()

        for milestone in user.milestones.all():
            milestone.earned = milestone.key in EARNED_MILESTONES
            milestone.save(update_fields=["earned"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo ready ({'created' if created else 'refreshed'}).\n"
                f"  Email: {DEMO_EMAIL}\n"
                f"  Password: {DEMO_PASSWORD}"
            )
        )
