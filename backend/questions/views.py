from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.decorators import api_view
from rest_framework.exceptions import Throttled
from rest_framework.response import Response

from common.choices import MaterialStatus
from common.throttles import AIRateThrottle
from materials.models import Material

from .generation import generate_questions_for
from .models import Question
from .serializers import QuestionSerializer


def _own_material(user, pk):
    return get_object_or_404(Material.objects.filter(user=user), pk=pk)


def _enforce_ai_throttle(request):
    throttle = AIRateThrottle()
    if not throttle.allow_request(request, None):
        raise Throttled(wait=throttle.wait())


@api_view(["GET", "POST"])
def material_questions(request, pk):
    material = _own_material(request.user, pk)

    if request.method == "GET":
        return Response(QuestionSerializer(material.questions.all(), many=True).data)

    # POST = ask the tutor for more questions (AI, rate limited).
    _enforce_ai_throttle(request)
    if material.status != MaterialStatus.READY:
        raise serializers.ValidationError(
            "This material is still processing. Try again once it's ready."
        )
    if not material.extracted_text.strip():
        raise serializers.ValidationError(
            "We couldn't read any text from this material, so we can't make questions."
        )
    created = generate_questions_for(material, extra=True)
    return Response(
        QuestionSerializer(created, many=True).data, status=status.HTTP_201_CREATED
    )


@api_view(["GET"])
def question_detail(request, pk):
    question = get_object_or_404(
        Question.objects.filter(material__user=request.user), pk=pk
    )
    return Response(QuestionSerializer(question).data)


@api_view(["GET"])
def next_unanswered(request, pk):
    material = _own_material(request.user, pk)
    question = (
        material.questions.filter(essays__isnull=True).order_by("index", "id").first()
    )
    return Response(QuestionSerializer(question).data if question else None)
