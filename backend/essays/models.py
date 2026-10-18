from django.conf import settings
from django.db import models

from questions.models import Question


def word_count(text):
    return len((text or "").split())


class Draft(models.Model):
    """The single working copy per question (autosaved by the composer)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="drafts"
    )
    question = models.OneToOneField(
        Question, on_delete=models.CASCADE, related_name="draft"
    )
    content = models.TextField(blank=True)
    word_count = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.word_count = word_count(self.content)
        super().save(*args, **kwargs)


class Essay(models.Model):
    """An immutable snapshot created on each submit (the revision history)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="essays"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="essays"
    )
    content = models.TextField()
    word_count = models.PositiveIntegerField(default=0)
    revision_number = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["question", "revision_number"],
                name="uniq_essay_revision_per_question",
            )
        ]

    def save(self, *args, **kwargs):
        self.word_count = word_count(self.content)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Essay v{self.revision_number} on Q{self.question_id}"
