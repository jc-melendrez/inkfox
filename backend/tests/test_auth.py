from datetime import timedelta

from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

from accounts.models import User

PASSWORD = "correct-horse-9"
SIGNUP = {
    "name": "Sam Rivera",
    "email": "sam@university.edu",
    "password": PASSWORD,
    "role": "University student",
}


@override_settings(
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"]
)
class AuthTestCase(APITestCase):
    def setUp(self):
        cache.clear()  # reset throttle counters between tests
        self.client = APIClient()

    def signup(self, **overrides):
        payload = {**SIGNUP, **overrides}
        return self.client.post("/api/auth/signup", payload, format="json")

    def auth(self, token):
        return {"HTTP_AUTHORIZATION": f"Token {token}"}

    def make_user(self, **overrides):
        payload = {**SIGNUP, **overrides}
        return User.objects.create_user(
            email=payload["email"],
            password=payload["password"],
            name=payload["name"],
            role=payload["role"],
        )


class SignupTests(AuthTestCase):
    def test_signup_returns_user_and_token(self):
        response = self.signup()
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["email"], "sam@university.edu")
        self.assertEqual(body["role"], "University student")
        self.assertFalse(body["onboarded"])
        self.assertIsInstance(body["id"], str)  # ids are strings on the wire
        self.assertIn("X-Auth-Token", response.headers)
        token = response.headers["X-Auth-Token"]
        self.assertTrue(Token.objects.filter(key=token).exists())

    def test_signup_duplicate_email_rejected(self):
        self.signup()
        response = self.signup()
        self.assertEqual(response.status_code, 400)
        self.assertIn("message", response.json())

    def test_signup_short_password_rejected(self):
        response = self.signup(password="short")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json()["errors"])

    def test_signup_invalid_email_rejected(self):
        response = self.signup(email="not-an-email")
        self.assertEqual(response.status_code, 400)

    def test_signup_normalises_name_and_email(self):
        response = self.signup(name="  Sam   Rivera ", email="SAM@University.EDU")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["name"], "Sam Rivera")
        self.assertEqual(response.json()["email"], "sam@university.edu")


class LoginTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.make_user()

    def test_login_success_returns_token(self):
        response = self.client.post(
            "/api/auth/login",
            {"email": "sam@university.edu", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "sam@university.edu")
        self.assertIn("X-Auth-Token", response.headers)

    def test_login_wrong_password_rejected(self):
        response = self.client.post(
            "/api/auth/login",
            {"email": "sam@university.edu", "password": "wrong-password"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("message", response.json())

    def test_login_is_case_insensitive_on_email(self):
        response = self.client.post(
            "/api/auth/login",
            {"email": "SAM@university.edu", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 200)


class TokenLifecycleTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user()
        self.token = Token.objects.create(user=self.user)

    def test_me_without_token_is_null(self):
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json())

    def test_me_with_token_returns_user(self):
        response = self.client.get("/api/auth/me", **self.auth(self.token.key))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], self.user.email)

    def test_expired_token_is_rejected(self):
        Token.objects.filter(pk=self.token.pk).update(
            created=timezone.now() - timedelta(days=8)
        )
        response = self.client.get("/api/auth/me", **self.auth(self.token.key))
        self.assertEqual(response.status_code, 401)

    def test_logout_deletes_token(self):
        response = self.client.post("/api/auth/logout", **self.auth(self.token.key))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_protected_endpoint_requires_token(self):
        response = self.client.get("/api/profile/export")
        self.assertEqual(response.status_code, 401)


class ProfileTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user()
        self.token = Token.objects.create(user=self.user)

    def test_update_profile_changes_fields(self):
        response = self.client.put(
            "/api/profile",
            {"name": "  Sam  R ", "email": "new@university.edu", "role": "Teacher"},
            format="json",
            **self.auth(self.token.key),
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["name"], "Sam R")
        self.assertEqual(body["email"], "new@university.edu")
        self.assertEqual(body["role"], "Teacher")

    def test_update_profile_rejects_duplicate_email(self):
        self.make_user(email="taken@university.edu", name="Other")
        response = self.client.put(
            "/api/profile",
            {"email": "taken@university.edu"},
            format="json",
            **self.auth(self.token.key),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json()["errors"])

    def test_update_profile_rejects_blank_name(self):
        response = self.client.put(
            "/api/profile", {"name": "   "}, format="json", **self.auth(self.token.key)
        )
        self.assertEqual(response.status_code, 400)

    def test_change_password_rotates_token(self):
        response = self.client.post(
            "/api/profile/password",
            {"current": PASSWORD, "new": "brand-new-pass-1"},
            format="json",
            **self.auth(self.token.key),
        )
        self.assertEqual(response.status_code, 204)
        new_token = response.headers["X-Auth-Token"]
        self.assertNotEqual(new_token, self.token.key)
        # old token no longer works
        self.assertEqual(
            self.client.get("/api/auth/me", **self.auth(self.token.key)).status_code,
            401,
        )
        self.assertEqual(
            self.client.get("/api/auth/me", **self.auth(new_token)).status_code, 200
        )

    def test_change_password_wrong_current_rejected(self):
        response = self.client.post(
            "/api/profile/password",
            {"current": "nope", "new": "brand-new-pass-1"},
            format="json",
            **self.auth(self.token.key),
        )
        self.assertEqual(response.status_code, 400)

    def test_change_password_short_new_rejected(self):
        response = self.client.post(
            "/api/profile/password",
            {"current": PASSWORD, "new": "short"},
            format="json",
            **self.auth(self.token.key),
        )
        self.assertEqual(response.status_code, 400)


class AccountLifecycleTests(AuthTestCase):
    def test_password_reset_always_204(self):
        response = self.client.post(
            "/api/auth/password/reset", {"email": "nobody@example.com"}, format="json"
        )
        self.assertEqual(response.status_code, 204)

    def test_password_reset_bad_email_400(self):
        response = self.client.post(
            "/api/auth/password/reset", {"email": "nope"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_google_login_not_enabled(self):
        response = self.client.post("/api/auth/google", format="json")
        self.assertEqual(response.status_code, 501)
        self.assertIn("message", response.json())

    def test_delete_account_removes_user(self):
        user = self.make_user()
        token = Token.objects.create(user=user)
        response = self.client.delete("/api/account", **self.auth(token.key))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(pk=user.pk).exists())

    def test_export_returns_json_attachment(self):
        user = self.make_user()
        token = Token.objects.create(user=user)
        response = self.client.get("/api/profile/export", **self.auth(token.key))
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response.headers["Content-Disposition"])
        self.assertEqual(response.json()["profile"]["email"], user.email)


class RateLimitTests(AuthTestCase):
    def test_login_is_rate_limited(self):
        self.make_user()
        statuses = [
            self.client.post(
                "/api/auth/login",
                {"email": "sam@university.edu", "password": "wrong"},
                format="json",
            ).status_code
            for _ in range(12)
        ]
        self.assertIn(429, statuses)

    def test_signup_is_rate_limited(self):
        statuses = [
            self.signup(email=f"user{i}@university.edu").status_code
            for i in range(12)
        ]
        self.assertIn(429, statuses)
