"""AI failures raised as API exceptions (friendly, retryable, no stack traces)."""
from rest_framework import status
from rest_framework.exceptions import APIException


class AIUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "AI isn't set up on this server yet. Please try again later."
    default_code = "ai_unavailable"


class AIGenerationError(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "The tutor is busy right now. Please try again in a moment."
    default_code = "ai_error"
