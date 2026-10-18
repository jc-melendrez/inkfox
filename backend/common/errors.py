"""Uniform JSON error responses: {"message": str, "errors": {field: [..]}}.

Every failure the API returns goes through here so the frontend's ApiError can
show a friendly, actionable message and never a stack trace.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

FRIENDLY_DEFAULTS = {
    400: "Please check the highlighted fields and try again.",
    401: "Please sign in to continue.",
    403: "You don't have access to that.",
    404: "We couldn't find what you were looking for.",
    405: "That action isn't supported here.",
    429: "You're doing that a bit too quickly. Please wait a moment and try again.",
    500: "Something went wrong on our end. Please try again.",
    501: "That feature isn't available on this server yet.",
    503: "The service is busy right now. Please try again in a moment.",
}


def _as_message(detail):
    """Turn a DRF/Django detail payload into (message, errors dict)."""
    if isinstance(detail, dict):
        errors = {}
        first = None
        for key, value in detail.items():
            text = _as_message(value)[0]
            errors[key] = text if isinstance(text, list) else [text]
            if first is None:
                first = errors[key][0]
        return first, errors
    if isinstance(detail, (list, tuple)):
        messages = [_as_message(item)[0] for item in detail]
        return messages[0] if messages else "", None
    return str(detail), None


def exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        detail = getattr(exc, "message_dict", None) or exc.messages
        exc = drf_exceptions.ValidationError(detail)

    response = drf_exception_handler(exc, context)
    if response is None:
        # Unhandled exception -> let Django turn it into a 500, but keep it tidy.
        return None

    message, errors = _as_message(response.data)
    if not message:
        message = FRIENDLY_DEFAULTS.get(response.status_code, "Request failed.")

    payload = {"message": message}
    if errors:
        payload["errors"] = errors
    response.data = payload
    return response
