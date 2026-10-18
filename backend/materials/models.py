from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.db import models

from common.choices import FileType, MaterialStatus

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def material_file_path(instance, filename):
    """Store under a random name; only ever keep an allowed extension."""
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        suffix = ""
    return f"materials/{instance.user_id}/{uuid4().hex}{suffix}"


class Material(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="materials"
    )
    title = models.CharField(max_length=200)
    file_type = models.CharField(max_length=8, choices=FileType.choices)
    file = models.FileField(upload_to=material_file_path, blank=True, null=True)
    pages = models.PositiveIntegerField(default=0)
    size_bytes = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=16, choices=MaterialStatus.choices, default=MaterialStatus.PROCESSING
    )
    processing_progress = models.PositiveSmallIntegerField(default=0)
    extracted_text = models.TextField(blank=True)
    failure_reason = models.CharField(max_length=200, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at", "-id"]

    def __str__(self):
        return self.title
