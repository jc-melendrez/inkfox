from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

from accounts.models import User
from ai import provider, schema
from ai.json_parse import parse_json
from materials.models import Material
from questions.generation import generate_questions_for
from questions.models import Question


class JsonParseTests(TestCase):
    def test_plain_json(self):
        self.assertEqual(parse_json('["a", "b"]'), ["a", "b"])

    def test_fenced_json(self):
        self.assertEqual(parse_json('```json\n{"a": 1}\n```'), {"a": 1})

    def test_json_with_chatter(self):
        self.assertEqual(parse_json('Sure! Here it is: {"a": 1} hope that helps'), {"a": 1})

    def test_no_json_raises(self):
        with self.assertRaises(ValueError):
            parse_json("no json at all")


class QuestionSchemaTests(TestCase):
    def test_accepts_array_of_strings(self):
        self.assertEqual(schema.validate_questions(["Why is this so?", "How does it work?"]),
                         ["Why is this so?", "How does it work?"])

    def test_accepts_object_with_questions_key(self):
        self.assertEqual(schema.validate_questions({"questions": ["What is it?"]}), ["What is it?"])

    def test_drops_junk_and_rejects_empty(self):
        self.assertEqual(schema.validate_questions(["ok question here", 5, "", "short"]),
                         ["ok question here"])
        with self.assertRaises(ValueError):
            schema.validate_questions([])


class FeedbackSchemaTests(TestCase):
    def test_normalises_parts_to_method(self):
        result = schema.validate_feedback(
            {
                "headline": "Good",
                "parts": [{"text": "point", "status": "strong"}],
                "strengths": ["clear point"],
                "improvements": [{"part_key": "L", "label": "Link", "message": "add a link"}],
            },
            "PEEL",
        )
        self.assertEqual(len(result["parts"]), 4)
        self.assertEqual(result["parts"][0]["status"], "strong")
        self.assertEqual(result["parts"][1]["status"], "missing")
        self.assertEqual(result["parts_landed"], 1)
        self.assertEqual(result["parts_total"], 4)

    def test_repairs_unknown_status(self):
        result = schema.validate_feedback(
            {"headline": "", "parts": [{"text": "x", "status": "nonsense"}]}, "PEEL"
        )
        self.assertIn(result["parts"][0]["status"], {"strong", "needs_work", "missing"})
        self.assertTrue(result["headline"])

    def test_strengths_default_present(self):
        result = schema.validate_feedback({"parts": []}, "TEEL")
        self.assertTrue(result["strengths"])


class ProviderConfigTests(TestCase):
    @override_settings(AI_PROVIDER="none", AI_API_KEY="")
    def test_not_configured_by_default(self):
        self.assertFalse(provider.is_configured())
        with self.assertRaises(Exception):
            provider.generate_questions("text", "PEEL", [])

    @override_settings(AI_PROVIDER="openai_compatible", AI_API_KEY="key", AI_BASE_URL="", AI_MODEL="")
    def test_openai_requires_base_url_and_model(self):
        self.assertFalse(provider.is_configured())

    @override_settings(
        AI_PROVIDER="openai_compatible",
        AI_API_KEY="key",
        AI_BASE_URL="https://example.test/v1",
        AI_MODEL="model",
    )
    def test_openai_configured(self):
        self.assertTrue(provider.is_configured())


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class QuestionEndpointTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="sam@university.edu", password="secret-pass-1", name="Sam"
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.material = Material.objects.create(
            user=self.user,
            title="Notes",
            file_type="TXT",
            status="ready",
            extracted_text="Cells are the smallest unit of life and mitochondria make ATP.",
        )

    def test_generate_requires_ai_configured(self):
        response = self.client.post(f"/api/materials/{self.material.id}/questions")
        self.assertEqual(response.status_code, 503)
        self.assertIn("AI", response.json()["message"])

    @patch("ai.provider.generate_questions")
    def test_generate_creates_questions(self, mock_generate):
        mock_generate.return_value = ["What is a cell?", "Why do cells need ATP?"]
        response = self.client.post(f"/api/materials/{self.material.id}/questions")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.json()), 2)
        self.assertEqual(Question.objects.filter(material=self.material).count(), 2)
        # questions get sequential indexes and a shared total
        indexes = list(
            Question.objects.filter(material=self.material)
            .order_by("index")
            .values_list("index", "total")
        )
        self.assertEqual(indexes, [(1, 2), (2, 2)])

    @patch("ai.provider.generate_questions")
    def test_generate_skips_duplicates(self, mock_generate):
        mock_generate.return_value = ["What is a cell?", "What is a cell?"]
        response = self.client.post(f"/api/materials/{self.material.id}/questions")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Question.objects.filter(material=self.material).count(), 1)

    def test_list_questions(self):
        Question.objects.create(
            material=self.material, index=1, total=1, text="What is a cell?", method="PEEL"
        )
        response = self.client.get(f"/api/materials/{self.material.id}/questions")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["text"], "What is a cell?")
        self.assertEqual(response.json()[0]["materialId"], str(self.material.id))

    def test_next_unanswered_returns_null_when_done(self):
        Question.objects.create(
            material=self.material, index=1, total=1, text="What is a cell?", method="PEEL"
        )
        response = self.client.get(f"/api/materials/{self.material.id}/questions/next")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["text"], "What is a cell?")

    def test_cannot_see_another_users_questions(self):
        other = User.objects.create_user(
            email="other@university.edu", password="secret-pass-1", name="Other"
        )
        other_material = Material.objects.create(
            user=other, title="Theirs", file_type="TXT", status="ready"
        )
        response = self.client.get(f"/api/materials/{other_material.id}/questions")
        self.assertEqual(response.status_code, 404)


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class GenerationServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="svc@university.edu", password="secret-pass-1", name="Svc"
        )
        self.material = Material.objects.create(
            user=self.user,
            title="Notes",
            file_type="TXT",
            status="ready",
            extracted_text="Some readable material text for questions.",
        )

    @patch("ai.provider.generate_questions")
    def test_generates_and_skips_when_existing(self, mock_generate):
        mock_generate.return_value = ["Question one?"]
        created = generate_questions_for(self.material)
        self.assertEqual(len(created), 1)
        # non-extra call is a no-op once questions exist
        again = generate_questions_for(self.material)
        self.assertEqual(again, [])
