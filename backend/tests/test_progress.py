from unittest.mock import patch

from django.core.cache import cache
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

from accounts.models import User
from essays.models import Draft, Essay
from feedback.models import Feedback
from materials.models import Material
from progress.models import MethodProgress
from questions.models import Question

FEEDBACK_DATA = {
    "headline": "Solid effort",
    "parts": [
        {"key": "P", "label": "Point", "text": "Cells need energy.", "status": "strong"},
        {"key": "E", "label": "Evidence", "text": "", "status": "missing"},
    ],
    "parts_landed": 1,
    "parts_total": 4,
    "strengths": ["Clear point"],
    "improvements": [],
}

ALL_STRONG_DATA = {
    "headline": "Every part landed",
    "parts": [
        {"key": "P", "label": "Point", "text": "a", "status": "strong"},
        {"key": "E", "label": "Evidence", "text": "b", "status": "strong"},
        {"key": "E", "label": "Explain", "text": "c", "status": "strong"},
        {"key": "L", "label": "Link", "text": "d", "status": "strong"},
    ],
    "parts_landed": 4,
    "parts_total": 4,
    "strengths": ["All parts clear"],
    "improvements": [],
}


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class ProgressTestCase(APITestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="sam@university.edu", password="secret-pass-1", name="Sam"
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.material = Material.objects.create(
            user=self.user, title="Biology", file_type="TXT", status="ready"
        )
        self.question = Question.objects.create(
            material=self.material, index=1, total=1, text="Why do cells need energy?", method="PEEL"
        )


class SettingsTests(ProgressTestCase):
    def test_defaults(self):
        response = self.client.get("/api/settings")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["defaultMethod"], "PEEL")
        self.assertFalse(body["pressureTimer"])
        self.assertEqual(body["timerMinutes"], 30)
        self.assertEqual(body["textSize"], "medium")

    def test_partial_update(self):
        response = self.client.put(
            "/api/settings",
            {"pressureTimer": True, "timerMinutes": 15},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["pressureTimer"])
        self.assertEqual(body["timerMinutes"], 15)
        self.assertEqual(body["defaultMethod"], "PEEL")


class OnboardingTests(ProgressTestCase):
    def test_complete_onboarding_sets_role_and_method(self):
        response = self.client.post(
            "/api/onboarding/complete",
            {"role": "University student", "method": "TEEL"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["onboarded"])
        self.assertEqual(response.json()["role"], "University student")
        settings = self.client.get("/api/settings").json()
        self.assertEqual(settings["defaultMethod"], "TEEL")


class ProfileTests(ProgressTestCase):
    def test_profile_shape(self):
        response = self.client.get("/api/profile")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["user"]["email"], "sam@university.edu")
        self.assertEqual(body["stats"], {"dayStreak": 0, "essaysWritten": 0, "methodsTried": 0})
        keys = [milestone["id"] for milestone in body["milestones"]]
        self.assertEqual(len(keys), 6)
        self.assertFalse(any(m["earned"] for m in body["milestones"]))

    def test_profile_update_still_returns_user(self):
        response = self.client.put("/api/profile", {"name": "Samantha"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Samantha")


class ProgressReadTests(ProgressTestCase):
    def test_progress_methods_and_by_material(self):
        body = self.client.get("/api/progress").json()
        self.assertEqual([m["method"] for m in body["methods"]], ["PEEL", "TEEL", "Other"])
        self.assertEqual(body["trend"], [])
        self.assertEqual(len(body["byMaterial"]), 1)
        self.assertEqual(body["byMaterial"][0]["done"], 0)
        self.assertEqual(body["byMaterial"][0]["total"], 1)
        self.assertIsNone(body["resume"])

    def test_resume_after_draft(self):
        Draft.objects.create(user=self.user, question=self.question, content="start")
        body = self.client.get("/api/progress/resume").json()
        self.assertIsNotNone(body)
        self.assertEqual(body["questionId"], str(self.question.id))
        self.assertEqual(body["materialTitle"], "Biology")
        self.assertEqual(body["method"], "PEEL")


class SessionTests(ProgressTestCase):
    def test_complete_session_summary(self):
        response = self.client.post(f"/api/materials/{self.material.id}/session/complete")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["materialId"], str(self.material.id))
        self.assertEqual(body["essaysCompleted"], 0)
        self.assertEqual(body["method"], "PEEL")
        self.assertEqual(body["masteryFrom"], 0)
        self.assertEqual(body["masteryTo"], 0)
        self.assertEqual(body["bestMoment"], "Finishing the session")

    def test_complete_session_unknown_material(self):
        response = self.client.post("/api/materials/9999/session/complete")
        self.assertEqual(response.status_code, 404)


class MilestoneTests(ProgressTestCase):
    def test_first_essay_milestone_earned_after_submit(self):
        with patch("ai.provider.evaluate_essay", return_value=FEEDBACK_DATA):
            self.client.post(
                f"/api/questions/{self.question.id}/essays",
                {"content": "Cells need energy to live."},
                format="json",
            )
        body = self.client.get("/api/profile").json()
        earned = {m["label"]: m["earned"] for m in body["milestones"]}
        self.assertTrue(earned["First essay"])
        self.assertEqual(body["stats"]["essaysWritten"], 1)
        self.assertEqual(body["stats"]["methodsTried"], 1)
        self.assertEqual(body["stats"]["dayStreak"], 1)

    def test_trend_lists_scores_in_order(self):
        with patch("ai.provider.evaluate_essay", return_value=FEEDBACK_DATA):
            for _ in range(2):
                self.client.post(
                    f"/api/questions/{self.question.id}/essays",
                    {"content": "Cells need energy to live."},
                    format="json",
                )
        self.assertEqual(Essay.objects.filter(user=self.user).count(), 2)
        self.assertEqual(Feedback.objects.filter(user=self.user).count(), 2)
        trend = self.client.get("/api/progress").json()["trend"]
        self.assertEqual([point["label"] for point in trend], ["1", "2"])


class MethodMasteryTests(ProgressTestCase):
    def _submit(self, data):
        with patch("ai.provider.evaluate_essay", return_value=data):
            self.client.post(
                f"/api/questions/{self.question.id}/essays",
                {"content": "answer text here"},
                format="json",
            )

    def test_mastery_starts_empty(self):
        progress = MethodProgress.objects.get(user=self.user, method="PEEL")
        self.assertEqual(progress.percent, 0)
        self.assertFalse(progress.started)

    def test_submit_updates_mastery_from_latest_revision(self):
        self._submit(FEEDBACK_DATA)  # 1 strong + 1 missing -> 50
        progress = MethodProgress.objects.get(user=self.user, method="PEEL")
        self.assertEqual(progress.percent, 50)
        self.assertEqual(progress.level, 3)
        self.assertEqual(progress.level_label, "Practicing")
        self.assertTrue(progress.started)

    def test_latest_revision_wins(self):
        self._submit(FEEDBACK_DATA)  # revision 1 -> 50
        self._submit(ALL_STRONG_DATA)  # revision 2 -> 100
        progress = MethodProgress.objects.get(user=self.user, method="PEEL")
        self.assertEqual(progress.percent, 100)
        self.assertEqual(progress.level, 5)
        self.assertEqual(progress.level_label, "Confident")

    def test_progress_endpoint_reflects_mastery(self):
        self._submit(ALL_STRONG_DATA)
        body = self.client.get("/api/progress").json()
        peel = next(m for m in body["methods"] if m["method"] == "PEEL")
        self.assertEqual(peel["percent"], 100)


class ExportTests(ProgressTestCase):
    def test_export_contains_everything(self):
        response = self.client.get("/api/profile/export")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        for key in ("profile", "settings", "materials", "questions", "drafts", "essays", "feedback", "stats", "milestones"):
            self.assertIn(key, body)
