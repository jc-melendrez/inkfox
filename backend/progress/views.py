from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from materials.models import Material

from . import services


@api_view(["GET"])
def get_progress(request):
    return Response(services.build_progress(request.user))


@api_view(["GET"])
def get_resume(request):
    return Response(services.build_resume(request.user))


@api_view(["POST"])
def complete_session(request, pk):
    material = get_object_or_404(Material.objects.filter(user=request.user), pk=pk)
    return Response(services.build_session_summary(request.user, material))
