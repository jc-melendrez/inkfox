from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response

from ai import provider
from common.throttles import AIRateThrottle
from feedback import services as feedback_services
from feedback.serializers import FeedbackSerializer
from progress.services import refresh_method_mastery
from questions.models import Question

from .models import Draft, Essay
from .serializers import DraftSerializer

MAX_ESSAY_CHARS = 20_000
MAX_REVISION_ATTEMPTS = 5


def _own_question(user, pk):
    return get_object_or_404(Question.objects.filter(material__user=user), pk=pk)


def _clean_content(request):
    content = request.data.get("content", "")
    if not isinstance(content, str):
        raise serializers.ValidationError({"content": "Please write your answer as text."})
    return content


def _store_feedback(user, question, content, data):
    """Create the next revision and its feedback, then refresh method mastery.

    The revision number is unique per question; if two submits race and pick the
    same number, the unique constraint rejects the loser and we retry.
    """
    for _ in range(MAX_REVISION_ATTEMPTS):
        try:
            with transaction.atomic():
                revision = Essay.objects.filter(question=question, user=user).count() + 1
                essay = Essay.objects.create(
                    user=user,
                    question=question,
                    content=content,
                    revision_number=revision,
                )
                feedback = feedback_services.create_from_data(essay, data)
                refresh_method_mastery(user, question.method)
            return feedback
        except IntegrityError:
            continue
    raise serializers.ValidationError(
        "We could not save your answer just now. Please try again."
    )


@api_view(["GET", "PUT"])
def question_draft(request, pk):
    question = _own_question(request.user, pk)

    if request.method == "GET":
        draft = getattr(question, "draft", None)
        return Response(DraftSerializer(draft).data if draft else None)

    content = _clean_content(request)
    if len(content) > MAX_ESSAY_CHARS:
        raise serializers.ValidationError(
            {"content": "That's very long. Try trimming it a little."}
        )
    draft, _ = Draft.objects.update_or_create(
        user=request.user, question=question, defaults={"content": content}
    )
    return Response(DraftSerializer(draft).data)


@api_view(["POST"])
@throttle_classes([AIRateThrottle])
def submit_essay(request, pk):
    question = _own_question(request.user, pk)
    content = _clean_content(request).strip()
    if not content:
        raise serializers.ValidationError(
            {"content": "Write your answer before submitting."}
        )
    if len(content) > MAX_ESSAY_CHARS:
        raise serializers.ValidationError(
            {"content": "That's very long. Try trimming it a little."}
        )

    # Ask the tutor first; if AI is off/busy nothing is saved and it can be retried.
    data = provider.evaluate_essay(content, question.method, question.text)
    feedback = _store_feedback(request.user, question, content, data)
    return Response(FeedbackSerializer(feedback).data, status=status.HTTP_201_CREATED)
