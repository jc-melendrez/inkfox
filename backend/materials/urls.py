from django.urls import path

from . import views

urlpatterns = [
    path("materials", views.materials, name="materials"),
    path("materials/sample", views.material_sample, name="material-sample"),
    path("materials/<int:pk>", views.material_detail, name="material-detail"),
    path(
        "materials/<int:pk>/processing",
        views.material_processing,
        name="material-processing",
    ),
    path("materials/<int:pk>/cancel", views.material_cancel, name="material-cancel"),
]
