from django.urls import path

from . import views

urlpatterns = [
    path(
        "questions/<int:pk>/feedback",
        views.question_feedback,
        name="question-feedback",
    ),
    path(
        "questions/<int:pk>/feedback/history",
        views.question_feedback_history,
        name="question-feedback-history",
    ),
]
