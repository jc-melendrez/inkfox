from django.urls import path

from . import views

urlpatterns = [
    path("progress", views.get_progress, name="get-progress"),
    path("progress/resume", views.get_resume, name="get-resume"),
    path(
        "materials/<int:pk>/session/complete",
        views.complete_session,
        name="complete-session",
    ),
]
