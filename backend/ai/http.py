"""Small HTTP helper: one place for timeouts, retries and backoff."""
import logging
import time

import httpx
from django.conf import settings

from .errors import AIGenerationError

logger = logging.getLogger(__name__)

RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def post_json(url, headers, payload):
    """POST JSON and return the decoded response. Never logs bodies or keys."""
    attempts = max(0, settings.AI_MAX_RETRIES) + 1
    last_error = "unknown"
    for attempt in range(attempts):
        try:
            with httpx.Client(timeout=settings.AI_TIMEOUT) as client:
                response = client.post(url, headers=headers, json=payload)
            if response.status_code in RETRYABLE_STATUS:
                last_error = f"status {response.status_code}"
            elif response.status_code >= 400:
                logger.warning("AI request rejected (%s)", response.status_code)
                raise AIGenerationError()
            else:
                return response.json()
        except AIGenerationError:
            raise
        except httpx.HTTPError as exc:
            last_error = exc.__class__.__name__
        if attempt < attempts - 1:
            time.sleep(min(4.0, 0.5 * (2**attempt)))
    logger.warning("AI request failed after %s attempts: %s", attempts, last_error)
    raise AIGenerationError()
