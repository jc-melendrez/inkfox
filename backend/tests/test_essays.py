from unittest.mock import patch

from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

from accounts.models import User
from essays.models import Draft, Essay
from feedback.models import Feedback
from feedback.services import score_for_parts
from materials.models import Material
from questions.models import Question

FEEDBACK_DATA = {
    "headline": "Nice work!",
    "parts": [
        {"key": "P", "label": "Point", "text": "Cells need energy.", "status": "strong"},
        {"key": "E", "label": "Evidence", "text": "ATP is made.", "status": "strong"},
        {"key": "E", "label": "Explain", "text": "It powers the cell.", "status": "needs_work"},
        {"key": "L", "label": "Link", "text": "", "status": "missing"},
    ],
    "parts_landed": 3,
    "parts_total": 4,
    "strengths": ["Clear point"],
    "improvements": [{"part_key": "L", "label": "Link", "message": "Add a link sentence."}],
}


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class EssayTestCase(APITestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="sam@university.edu", password="secret-pass-1", name="Sam"
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.material = Material.objects.create(
            user=self.user, title="Notes", file_type="TXT", status="ready"
        )
        self.question = Question.objects.create(
            material=self.material, index=1, total=1, text="Why do cells need energy?", method="PEEL"
        )


class DraftTests(EssayTestCase):
    def test_draft_is_null_initially(self):
        response = self.client.get(f"/api/questions/{self.question.id}/draft")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json())

    def test_save_and_read_draft(self):
        response = self.client.put(
            f"/api/questions/{self.question.id}/draft",
            {"content": "Cells need energy to live and grow."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["questionId"], str(self.question.id))
        self.assertEqual(body["wordCount"], 7)

        read = self.client.get(f"/api/questions/{self.question.id}/draft")
        self.assertEqual(read.json()["content"], "Cells need energy to live and grow.")

    def test_draft_upsert_does_not_duplicate(self):
        for text in ("first", "second version"):
            self.client.put(
                f"/api/questions/{self.question.id}/draft", {"content": text}, format="json"
            )
        self.assertEqual(Draft.objects.filter(user=self.user).count(), 1)

    def test_cannot_access_another_users_draft(self):
        other = User.objects.create_user(
            email="other@university.edu", password="secret-pass-1", name="Other"
        )
        other_material = Material.objects.create(
            user=other, title="Theirs", file_type="TXT", status="ready"
        )
        other_question = Question.objects.create(
            material=other_material, index=1, total=1, text="Q?", method="PEEL"
        )
        response = self.client.get(f"/api/questions/{other_question.id}/draft")
        self.assertEqual(response.status_code, 404)


class SubmitTests(EssayTestCase):
    @patch("ai.provider.evaluate_essay")
    def test_submit_creates_essay_and_feedback(self, mock_evaluate):
        mock_evaluate.return_value = FEEDBACK_DATA
        response = self.client.post(
            f"/api/questions/{self.question.id}/essays",
            {"content": "Cells need energy. ATP is made. It powers the cell."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["headline"], "Nice work!")
        self.assertEqual(body["partsLanded"], 3)
        self.assertEqual(body["questionId"], str(self.question.id))
        self.assertEqual(body["improvements"][0]["partKey"], "L")
        self.assertEqual(Essay.objects.filter(user=self.user).count(), 1)
        self.assertEqual(Feedback.objects.filter(user=self.user).count(), 1)

    @patch("ai.provider.evaluate_essay")
    def test_submissions_increment_revision(self, mock_evaluate):
        mock_evaluate.return_value = FEEDBACK_DATA
        for _ in range(2):
            self.client.post(
                f"/api/questions/{self.question.id}/essays",
                {"content": "Some answer text here."},
                format="json",
            )
        revisions = list(
            Essay.objects.filter(question=self.question)
            .order_by("created_at", "id")
            .values_list("revision_number", flat=True)
        )
        self.assertEqual(revisions, [1, 2])
        self.assertEqual(Feedback.objects.filter(user=self.user).count(), 2)

    def test_submit_without_ai_returns_friendly_503(self):
        response = self.client.post(
            f"/api/questions/{self.question.id}/essays",
            {"content": "Cells need energy to live."},
            format="json",
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn("message", response.json())
        self.assertEqual(Essay.objects.count(), 0)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_submit_empty_content_rejected(self):
        response = self.client.post(
            f"/api/questions/{self.question.id}/essays", {"content": "   "}, format="json"
        )
        self.assertEqual(response.status_code, 400)


class FeedbackReadTests(EssayTestCase):
    def _submit(self, content="Cells need energy to live."):
        with patch("ai.provider.evaluate_essay", return_value=FEEDBACK_DATA):
            return self.client.post(
                f"/api/questions/{self.question.id}/essays",
                {"content": content},
                format="json",
            )

    def test_feedback_null_before_submit(self):
        response = self.client.get(f"/api/questions/{self.question.id}/feedback")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json())

    def test_latest_and_history(self):
        self._submit("first answer")
        self._submit("second answer")
        latest = self.client.get(f"/api/questions/{self.question.id}/feedback")
        self.assertEqual(latest.status_code, 200)
        self.assertIsNotNone(latest.json()["id"])

        history = self.client.get(f"/api/questions/{self.question.id}/feedback/history")
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.json()), 2)

    def test_cannot_read_another_users_feedback(self):
        other = User.objects.create_user(
            email="other@university.edu", password="secret-pass-1", name="Other"
        )
        other_material = Material.objects.create(
            user=other, title="Theirs", file_type="TXT", status="ready"
        )
        other_question = Question.objects.create(
            material=other_material, index=1, total=1, text="Q?", method="PEEL"
        )
        response = self.client.get(f"/api/questions/{other_question.id}/feedback")
        self.assertEqual(response.status_code, 404)


class ScoreTests(EssayTestCase):
    def test_score_weights(self):
        self.assertEqual(score_for_parts(FEEDBACK_DATA["parts"]), 62)
        self.assertEqual(score_for_parts([]), 0)


class RevisionConstraintTests(EssayTestCase):
    def test_duplicate_revision_number_is_rejected(self):
        Essay.objects.create(
            user=self.user, question=self.question, content="first", revision_number=1
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Essay.objects.create(
                    user=self.user,
                    question=self.question,
                    content="second",
                    revision_number=1,
                )
