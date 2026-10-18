"""Background processing for uploaded materials (no Celery needed).

A short-lived daemon thread extracts text and generates questions, updating
status/progress so the Library screen can poll it. If an upload must survive a
server restart or the app scales out, replace this with Celery/RQ.
"""
import logging
import threading

from django.conf import settings
from django.db import connection

from common.choices import MaterialStatus

from .extraction import extract_text
from .models import Material

logger = logging.getLogger(__name__)

NO_TEXT_REASON = (
    "We couldn't find readable text. It may be a scan or image-only slides. "
    "Try a PDF where you can select the text, or a DOCX/TXT."
)
READ_ERROR_REASON = "We couldn't read that file. Try re-exporting it and uploading again."

_MAX_LOG_CHARS = 200


class NoReadableText(Exception):
    """Raised when a supported file yields no usable text."""


def _safe_error(exc):
    """A short, single-line, path-free description for logs.

    Only the exception class plus a capped message are exposed. File contents
    and extracted text are never logged, and the stored path (a random id) is
    redacted regardless.
    """
    message = " ".join(str(exc).split()).replace(str(settings.MEDIA_ROOT), "<media>")
    message = message[:_MAX_LOG_CHARS]
    return f"{exc.__class__.__name__}: {message}" if message else exc.__class__.__name__


def start_processing(material_id):
    threading.Thread(
        target=process_material, args=(material_id,), daemon=True
    ).start()


def _set(material, **fields):
    for key, value in fields.items():
        setattr(material, key, value)
    material.save(update_fields=list(fields))


def _fail(material, reason, exc):
    logger.warning("Material %s processing failed: %s", material.id, _safe_error(exc))
    try:
        _set(
            material,
            status=MaterialStatus.FAILED,
            failure_reason=reason,
        )
    except Exception:
        pass


def process_material(material_id):
    try:
        material = Material.objects.get(pk=material_id)
    except Material.DoesNotExist:
        return
    try:
        _set(material, processing_progress=20)
        text, pages = extract_text(material.file.path, material.file_type)
        _set(
            material,
            extracted_text=text,
            pages=pages,
            processing_progress=55,
        )
        if not text:
            raise NoReadableText()

        # Question generation is optional: if AI is off or busy, the material
        # still becomes ready and questions can be requested later from the UI.
        try:
            from questions.generation import generate_questions_for

            generate_questions_for(material)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Question generation skipped for material %s: %s",
                material_id,
                exc.__class__.__name__,
            )

        _set(
            material,
            status=MaterialStatus.READY,
            processing_progress=100,
            failure_reason="",
        )
    except NoReadableText as exc:
        _fail(material, NO_TEXT_REASON, exc)
    except Exception as exc:  # noqa: BLE001 - any failure fails the material
        _fail(material, READ_ERROR_REASON, exc)
    finally:
        connection.close()
