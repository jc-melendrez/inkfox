from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from questions.models import Question

from .models import Feedback
from .serializers import FeedbackSerializer


def _own_question(user, pk):
    return get_object_or_404(Question.objects.filter(material__user=user), pk=pk)


@api_view(["GET"])
def question_feedback(request, pk):
    question = _own_question(request.user, pk)
    feedback = (
        Feedback.objects.filter(essay__question=question, user=request.user)
        .order_by("-created_at", "-id")
        .first()
    )
    return Response(FeedbackSerializer(feedback).data if feedback else None)


@api_view(["GET"])
def question_feedback_history(request, pk):
    question = _own_question(request.user, pk)
    feedbacks = Feedback.objects.filter(
        essay__question=question, user=request.user
    ).order_by("created_at", "id")
    return Response(FeedbackSerializer(feedbacks, many=True).data)
