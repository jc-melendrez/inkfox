import hashlib
import re

from django.db import models

from common.choices import Method
from materials.models import Material


def normalize_text(value):
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def fingerprint_of(text):
    return hashlib.sha256(normalize_text(text).encode("utf-8")).hexdigest()


class Question(models.Model):
    material = models.ForeignKey(
        Material, on_delete=models.CASCADE, related_name="questions"
    )
    index = models.PositiveIntegerField()
    total = models.PositiveIntegerField()
    text = models.TextField()
    source_passage = models.TextField(blank=True)
    method = models.CharField(max_length=8, choices=Method.choices)
    fingerprint = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["index", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["material", "index"], name="uniq_question_index_per_material"
            ),
            models.UniqueConstraint(
                fields=["material", "fingerprint"],
                name="uniq_question_text_per_material",
            ),
        ]

    def save(self, *args, **kwargs):
        self.fingerprint = fingerprint_of(self.text)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Q{self.index}: {self.text[:40]}"
