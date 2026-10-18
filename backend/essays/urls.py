from django.urls import path

from . import views

urlpatterns = [
    path("questions/<int:pk>/draft", views.question_draft, name="question-draft"),
    path("questions/<int:pk>/essays", views.submit_essay, name="submit-essay"),
]
