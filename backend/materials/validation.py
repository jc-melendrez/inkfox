"""Validate an uploaded material before it is stored.

Checks extension, size and magic bytes so a renamed executable is rejected.
Returns the detected FileType and a safe title; never uses the raw path.
"""
from pathlib import Path

from django.conf import settings
from rest_framework import serializers

EXTENSION_TO_TYPE = {".pdf": "PDF", ".docx": "DOCX", ".txt": "TXT"}

POWERPOINT_EXTENSIONS = {".ppt", ".pptx"}

SIZE_MESSAGE = "That file is larger than 10 MB. Try a smaller one."
TYPE_MESSAGE = "We can only read PDF, DOCX or TXT files. Please choose one of those."
POWERPOINT_MESSAGE = (
    "PowerPoint files aren't supported yet. Save your slides as a DOCX, TXT, "
    "or a PDF that has selectable text."
)
CONTENT_MESSAGE = "That file doesn't look like a valid {type}. Please check it and try again."


def _mojibake_free_txt(head):
    return b"\x00" not in head


def validate_upload(upload):
    name = upload.name or ""
    suffix = Path(name).suffix.lower()

    if suffix in POWERPOINT_EXTENSIONS:
        raise serializers.ValidationError(POWERPOINT_MESSAGE)
    if suffix not in EXTENSION_TO_TYPE:
        raise serializers.ValidationError(TYPE_MESSAGE)
    if upload.size > settings.MAX_MATERIAL_SIZE:
        raise serializers.ValidationError(SIZE_MESSAGE)

    file_type = EXTENSION_TO_TYPE[suffix]
    head = upload.read(8)
    upload.seek(0)
    if not _magic_matches(file_type, upload, head):
        raise serializers.ValidationError(
            CONTENT_MESSAGE.format(type=file_type)
        )

    title = Path(name).stem.strip() or "Untitled material"
    return file_type, title[:200]


def _magic_matches(file_type, upload, head):
    if file_type == "PDF":
        return head.startswith(b"%PDF-")
    if file_type == "DOCX":
        return head.startswith(b"PK\x03\x04")
    sample = upload.read(2048)
    upload.seek(0)
    return _mojibake_free_txt(sample)
