"""Scoped rate limiters. Enable per-view; no global throttling so that polling
(e.g. material processing status) isn't penalised."""
from rest_framework.throttling import SimpleRateThrottle


class _ScopedThrottle(SimpleRateThrottle):
    scope = None
    per_user = False

    def get_cache_key(self, request, view):
        if self.per_user and request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginRateThrottle(_ScopedThrottle):
    scope = "login"


class SignupRateThrottle(_ScopedThrottle):
    scope = "signup"


class AIRateThrottle(_ScopedThrottle):
    scope = "ai"
    per_user = True
