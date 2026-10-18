from django.urls import path

from . import views

urlpatterns = [
    path(
        "materials/<int:pk>/questions",
        views.material_questions,
        name="material-questions",
    ),
    path(
        "materials/<int:pk>/questions/next",
        views.next_unanswered,
        name="material-next-question",
    ),
    path("questions/<int:pk>", views.question_detail, name="question-detail"),
]
