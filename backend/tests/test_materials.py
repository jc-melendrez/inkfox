import io
import shutil
import tempfile
from unittest.mock import patch

import docx
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

from accounts.models import User
from common.choices import MaterialStatus
from materials.models import Material
from materials.processing import process_material
from questions.models import Question

PASSWORD = "correct-horse-9"


def make_user(email="sam@university.edu"):
    return User.objects.create_user(
        email=email, password=PASSWORD, name="Sam Rivera"
    )


def upload(name, content, content_type="application/octet-stream"):
    return SimpleUploadedFile(name, content, content_type=content_type)


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class MaterialTestCase(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media_root = tempfile.mkdtemp()
        cls.media_override = override_settings(MEDIA_ROOT=cls.media_root)
        cls.media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.media_override.disable()
        shutil.rmtree(cls.media_root, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")


class UploadTests(MaterialTestCase):
    def test_upload_txt_starts_processing(self):
        with patch("materials.views.start_processing"):
            response = self.client.post(
                "/api/materials",
                {"file": upload("notes.txt", b"Cell biology is the study of cells.")},
                format="multipart",
            )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["title"], "notes")
        self.assertEqual(body["fileType"], "TXT")
        self.assertEqual(body["status"], "processing")
        self.assertEqual(body["questionCount"], 0)

    def test_upload_rejects_bad_extension(self):
        response = self.client.post(
            "/api/materials",
            {"file": upload("malware.exe", b"MZ\x90\x00")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

    def test_upload_rejects_fake_pdf(self):
        response = self.client.post(
            "/api/materials",
            {"file": upload("fake.pdf", b"this is not a pdf at all")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

    def test_upload_rejects_oversized_file(self):
        big = b"a" * (11 * 1024 * 1024)
        response = self.client.post(
            "/api/materials", {"file": upload("big.txt", big)}, format="multipart"
        )
        self.assertEqual(response.status_code, 400)

    def test_upload_accepts_pdf_magic(self):
        with patch("materials.views.start_processing"):
            response = self.client.post(
                "/api/materials",
                {"file": upload("doc.pdf", b"%PDF-1.4\n...")},
                format="multipart",
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["fileType"], "PDF")

    def test_upload_requires_a_file(self):
        response = self.client.post("/api/materials", {}, format="multipart")
        self.assertEqual(response.status_code, 400)


class ProcessingTests(MaterialTestCase):
    def _create(self, name, content, file_type="TXT"):
        return Material.objects.create(
            user=self.user,
            title=name,
            file_type=file_type,
            file=upload(f"{name}.{file_type.lower()}", content),
        )

    def test_process_txt_material_sets_ready(self):
        material = self._create("notes", b"Cells are the smallest unit of life.")
        process_material(material.id)
        material.refresh_from_db()
        self.assertEqual(material.status, MaterialStatus.READY)
        self.assertEqual(material.processing_progress, 100)
        self.assertIn("smallest unit of life", material.extracted_text)

    def test_process_docx_material_extracts_text(self):
        buffer = io.BytesIO()
        document = docx.Document()
        document.add_paragraph("Hello from a docx document.")
        document.save(buffer)
        material = Material.objects.create(
            user=self.user,
            title="doc",
            file_type="DOCX",
            file=upload("doc.docx", buffer.getvalue()),
        )
        process_material(material.id)
        material.refresh_from_db()
        self.assertEqual(material.status, MaterialStatus.READY)
        self.assertIn("Hello from a docx document", material.extracted_text)


class SampleTests(MaterialTestCase):
    def test_sample_creates_ready_material_with_questions(self):
        response = self.client.post("/api/materials/sample")
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], "ready")
        self.assertEqual(body["questionCount"], 5)
        self.assertEqual(Question.objects.filter(material__user=self.user).count(), 5)


class OwnershipTests(MaterialTestCase):
    def setUp(self):
        super().setUp()
        self.other = make_user("other@university.edu")
        self.other_material = Material.objects.create(
            user=self.other, title="Not yours", file_type="TXT"
        )

    def test_list_only_returns_own_materials(self):
        Material.objects.create(user=self.user, title="Mine", file_type="TXT")
        response = self.client.get("/api/materials")
        self.assertEqual(response.status_code, 200)
        titles = [row["title"] for row in response.json()]
        self.assertEqual(titles, ["Mine"])

    def test_cannot_read_another_users_material(self):
        response = self.client.get(f"/api/materials/{self.other_material.id}")
        self.assertEqual(response.status_code, 404)

    def test_cannot_delete_another_users_material(self):
        response = self.client.delete(f"/api/materials/{self.other_material.id}")
        self.assertEqual(response.status_code, 404)
        self.assertTrue(Material.objects.filter(pk=self.other_material.pk).exists())

    def test_cannot_cancel_another_users_material(self):
        response = self.client.post(
            f"/api/materials/{self.other_material.id}/cancel"
        )
        self.assertEqual(response.status_code, 404)

    def test_materials_require_auth(self):
        self.client.credentials()
        self.assertEqual(self.client.get("/api/materials").status_code, 401)


class DeleteAndCancelTests(MaterialTestCase):
    def test_cancel_removes_processing_material(self):
        material = Material.objects.create(
            user=self.user,
            title="Processing",
            file_type="TXT",
            status=MaterialStatus.PROCESSING,
        )
        response = self.client.post(f"/api/materials/{material.id}/cancel")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Material.objects.filter(pk=material.pk).exists())

    def test_delete_removes_material(self):
        material = Material.objects.create(
            user=self.user, title="Done", file_type="TXT", status=MaterialStatus.READY
        )
        response = self.client.delete(f"/api/materials/{material.id}")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Material.objects.filter(pk=material.pk).exists())
