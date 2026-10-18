from django.core.management import call_command
from django.test import TestCase, override_settings

from accounts.models import Milestone, Settings, User
from common.choices import MILESTONES
from essays.models import Draft, Essay
from feedback.models import Feedback
from materials.models import Material
from progress.models import MethodProgress
from questions.models import Question


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class UserDefaultsTests(TestCase):
    def test_new_user_gets_settings_milestones_and_progress(self):
        user = User.objects.create_user(
            email="new@example.com", password="secret-pass-1", name="New User"
        )
        self.assertTrue(Settings.objects.filter(user=user).exists())
        self.assertEqual(user.milestones.count(), len(MILESTONES))
        self.assertEqual(MethodProgress.objects.filter(user=user).count(), 3)

    def test_questions_are_deduplicated_per_material(self):
        user = User.objects.create_user(
            email="dup@example.com", password="secret-pass-1", name="Dup"
        )
        material = Material.objects.create(user=user, title="M", file_type="TXT")
        Question.objects.create(material=material, index=1, total=1, text="Same text?", method="PEEL")
        with self.assertRaises(Exception):
            Question.objects.create(
                material=material, index=2, total=1, text="  same   TEXT? ", method="PEEL"
            )


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class SeedDemoTests(TestCase):
    def test_seed_demo_creates_expected_content(self):
        call_command("seed_demo")
        user = User.objects.get(email="sam.rivera@university.edu")
        self.assertTrue(user.onboarded)
        self.assertEqual(user.materials.count(), 3)
        self.assertEqual(Essay.objects.filter(user=user).count(), 8)
        self.assertEqual(Feedback.objects.filter(user=user).count(), 8)
        self.assertEqual(Draft.objects.filter(user=user).count(), 1)
        self.assertEqual(
            list(
                Feedback.objects.filter(user=user)
                .order_by("created_at", "id")
                .values_list("score", flat=True)
            ),
            [48, 52, 50, 58, 61, 59, 66, 70],
        )

    def test_seed_demo_is_idempotent(self):
        call_command("seed_demo")
        call_command("seed_demo")
        user = User.objects.get(email="sam.rivera@university.edu")
        self.assertEqual(user.materials.count(), 3)
        self.assertEqual(Essay.objects.filter(user=user).count(), 8)
