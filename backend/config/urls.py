from django.contrib import admin
from django.urls import include, path

from common.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", health, name="health"),
    path("api/", include("accounts.urls")),
    path("api/", include("materials.urls")),
    path("api/", include("questions.urls")),
    path("api/", include("essays.urls")),
    path("api/", include("feedback.urls")),
    path("api/", include("progress.urls")),
]
