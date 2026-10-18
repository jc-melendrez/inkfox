"""Token auth with a hard expiry (default 7 days, see settings.TOKEN_TTL).

DRF's Token has no expiry of its own, so we keep using the stock token table and
reject tokens older than TOKEN_TTL. Expired tokens are deleted on first use.
"""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication


class ExpiringTokenAuthentication(TokenAuthentication):
    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        ttl = getattr(settings, "TOKEN_TTL", timedelta(days=7))
        if timezone.now() > token.created + ttl:
            token.delete()
            raise exceptions.AuthenticationFailed(
                "Your session has expired. Please sign in again."
            )
        return (user, token)
