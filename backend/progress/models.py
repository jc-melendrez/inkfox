from django.conf import settings
from django.db import models

from common.choices import MethodOrOther


class MethodProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="method_progress"
    )
    method = models.CharField(max_length=8, choices=MethodOrOther.choices)
    label = models.CharField(max_length=40)
    level = models.PositiveSmallIntegerField(default=0)
    level_label = models.CharField(max_length=40, default="Not started")
    percent = models.PositiveSmallIntegerField(default=0)
    started = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "method"], name="uniq_method_progress_per_user"
            )
        ]

    def __str__(self):
        return f"{self.method} {self.percent}%"
