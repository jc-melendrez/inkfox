from django.conf import settings
from django.db import models

from common.choices import Method
from essays.models import Essay


class Feedback(models.Model):
    essay = models.OneToOneField(
        Essay, on_delete=models.CASCADE, related_name="feedback"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="feedback"
    )
    draft_number = models.PositiveIntegerField(default=1)
    method = models.CharField(max_length=8, choices=Method.choices)
    headline = models.CharField(max_length=200)
    parts_landed = models.PositiveSmallIntegerField(default=0)
    parts_total = models.PositiveSmallIntegerField(default=0)
    # Lists of dicts; keys are snake_case and the camelCase renderer handles the wire.
    parts = models.JSONField(default=list)
    strengths = models.JSONField(default=list)
    improvements = models.JSONField(default=list)
    score = models.PositiveSmallIntegerField(default=0)  # 0-100, feeds the trend
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return self.headline
