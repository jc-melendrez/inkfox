"""Domain enums shared across apps (values match src/api/types.ts)."""
from django.db import models


class Method(models.TextChoices):
    PEEL = "PEEL", "PEEL"
    TEEL = "TEEL", "TEEL"


class MethodOrOther(models.TextChoices):
    PEEL = "PEEL", "PEEL"
    TEEL = "TEEL", "TEEL"
    OTHER = "Other", "Other methods"


class FileType(models.TextChoices):
    PDF = "PDF", "PDF"
    DOCX = "DOCX", "DOCX"
    TXT = "TXT", "TXT"


class MaterialStatus(models.TextChoices):
    PROCESSING = "processing", "processing"
    READY = "ready", "ready"
    FAILED = "failed", "failed"


class PartStatus(models.TextChoices):
    STRONG = "strong", "strong"
    NEEDS_WORK = "needs_work", "needs_work"
    MISSING = "missing", "missing"


class TextSize(models.TextChoices):
    SMALL = "small", "small"
    MEDIUM = "medium", "medium"
    LARGE = "large", "large"


# Milestone definitions, in display order (labels match the Phase 1 mock).
MILESTONES = [
    ("first_essay", "First essay"),
    ("streak_3", "3-day streak"),
    ("streak_7", "7-day streak"),
    ("essays_10", "10 essays written"),
    ("peel_pro", "PEEL Pro"),
    ("teel_explorer", "TEEL Explorer"),
]

# Method part keys/names (mirrors src/lib/methods.ts). Used for prompts and
# feedback validation/fallbacks.
METHOD_PARTS = {
    "PEEL": [
        ("P", "Point"),
        ("E", "Evidence"),
        ("E", "Explain"),
        ("L", "Link"),
    ],
    "TEEL": [
        ("T", "Topic sentence"),
        ("E", "Evidence"),
        ("E", "Explain"),
        ("L", "Link"),
    ],
}
