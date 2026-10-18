from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from common.choices import MaterialStatus
from common.sample_data import BIOLOGY_QUESTIONS, PASSAGE_CELL
from questions.services import create_questions

from .models import Material
from .processing import start_processing
from .serializers import MaterialSerializer
from .validation import validate_upload

SAMPLE_QUESTION_COUNT = 5


def _own_materials(user):
    return Material.objects.filter(user=user).prefetch_related("questions__essays")


@api_view(["GET", "POST"])
def materials(request):
    if request.method == "GET":
        return Response(MaterialSerializer(_own_materials(request.user), many=True).data)

    upload = request.FILES.get("file")
    if upload is None:
        raise serializers.ValidationError(
            {"file": "Please choose a file to upload."}
        )
    file_type, title = validate_upload(upload)
    material = Material.objects.create(
        user=request.user,
        title=title,
        file_type=file_type,
        size_bytes=upload.size,
        file=upload,
    )
    start_processing(material.id)
    return Response(
        MaterialSerializer(material).data, status=status.HTTP_201_CREATED
    )


@api_view(["GET", "DELETE"])
def material_detail(request, pk):
    material = get_object_or_404(_own_materials(request.user), pk=pk)
    if request.method == "DELETE":
        if material.file:
            material.file.delete(save=False)
        material.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    return Response(MaterialSerializer(material).data)


@api_view(["GET"])
def material_processing(request, pk):
    material = get_object_or_404(_own_materials(request.user), pk=pk)
    return Response(MaterialSerializer(material).data)


@api_view(["POST"])
def material_cancel(request, pk):
    material = get_object_or_404(_own_materials(request.user), pk=pk)
    if material.status == MaterialStatus.PROCESSING:
        if material.file:
            material.file.delete(save=False)
        material.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
def material_sample(request):
    settings_obj = getattr(request.user, "settings", None)
    method = settings_obj.default_method if settings_obj else "PEEL"
    material = Material.objects.create(
        user=request.user,
        title="Sample passage",
        file_type="TXT",
        pages=1,
        status=MaterialStatus.READY,
        processing_progress=100,
        extracted_text=PASSAGE_CELL,
    )
    create_questions(
        material,
        [
            {"text": text, "source_passage": PASSAGE_CELL}
            for text in BIOLOGY_QUESTIONS[:SAMPLE_QUESTION_COUNT]
        ],
        method,
    )
    return Response(
        MaterialSerializer(material).data, status=status.HTTP_201_CREATED
    )
