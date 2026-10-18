from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from common.authentication import ExpiringTokenAuthentication
from common.throttles import LoginRateThrottle, SignupRateThrottle

from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    OnboardingSerializer,
    PasswordResetSerializer,
    ProfileUpdateSerializer,
    SettingsSerializer,
    SignupSerializer,
    UserSerializer,
)
from .models import Settings

TOKEN_HEADER = "X-Auth-Token"


def _issue_token(user):
    """One active session per user: replace any existing token (fresh 7-day TTL)."""
    Token.objects.filter(user=user).delete()
    return Token.objects.create(user=user)


def _user_response(user, status_code=status.HTTP_200_OK, token=None):
    response = Response(UserSerializer(user).data, status=status_code)
    if token is not None:
        response[TOKEN_HEADER] = token.key
    return response


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([SignupRateThrottle])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    token = _issue_token(user)
    return _user_response(user, status.HTTP_201_CREATED, token)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        request,
        username=serializer.validated_data["email"],
        password=serializer.validated_data["password"],
    )
    if user is None:
        return Response(
            {"message": "That email and password don't match. Please try again."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    token = _issue_token(user)
    return _user_response(user, token=token)


@api_view(["GET"])
@authentication_classes([ExpiringTokenAuthentication])
@permission_classes([AllowAny])
def me(request):
    """Current user, or JSON null when signed out (frontend maps both to null)."""
    if not request.user.is_authenticated:
        return Response(None)
    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def google_login(request):
    return Response(
        {"message": "Google sign-in isn't enabled on this server yet."},
        status=status.HTTP_501_NOT_IMPLEMENTED,
    )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def password_reset(request):
    serializer = PasswordResetSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    # Email delivery isn't configured; always 204 so accounts can't be enumerated.
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "PUT"])
def profile(request):
    """GET returns {user, stats, milestones}; PUT updates and returns the user."""
    if request.method == "PUT":
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)

    from progress import services

    user = request.user
    services.evaluate_milestones(user)
    return Response(
        {
            "user": UserSerializer(user).data,
            "stats": services.build_stats(user),
            "milestones": services.build_milestones(user),
        }
    )


@api_view(["GET", "PUT"])
def settings_view(request):
    settings_obj, _ = Settings.objects.get_or_create(user=request.user)
    if request.method == "PUT":
        serializer = SettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(SettingsSerializer(settings_obj).data)


@api_view(["POST"])
def complete_onboarding(request):
    serializer = OnboardingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = request.user
    user.onboarded = True
    fields = ["onboarded"]
    if "role" in serializer.validated_data:
        user.role = serializer.validated_data["role"]
        fields.append("role")
    user.save(update_fields=fields)
    if "method" in serializer.validated_data:
        settings_obj, _ = Settings.objects.get_or_create(user=user)
        settings_obj.default_method = serializer.validated_data["method"]
        settings_obj.save(update_fields=["default_method"])
    return Response(UserSerializer(user).data)


@api_view(["POST"])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = request.user
    if not user.check_password(serializer.validated_data["current"]):
        raise serializers.ValidationError(
            {"current": "That doesn't match your current password."}
        )
    new_password = serializer.validated_data["new"]
    try:
        validate_password(new_password, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"new": list(exc.messages)})
    user.set_password(new_password)
    user.save(update_fields=["password"])
    # Invalidate every existing session and hand this one a fresh token.
    token = _issue_token(user)
    response = Response(status=status.HTTP_204_NO_CONTENT)
    response[TOKEN_HEADER] = token.key
    return response


@api_view(["DELETE"])
def delete_account(request):
    request.user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def export_data(request):
    """Everything we hold on the user, as a downloadable JSON file."""
    from essays.serializers import DraftSerializer
    from feedback.serializers import FeedbackSerializer
    from materials.serializers import MaterialSerializer
    from progress import services
    from questions.models import Question
    from questions.serializers import QuestionSerializer

    user = request.user
    settings_obj, _ = Settings.objects.get_or_create(user=user)
    payload = {
        "exported_at": timezone.now().isoformat(),
        "profile": UserSerializer(user).data,
        "settings": SettingsSerializer(settings_obj).data,
        "stats": services.build_stats(user),
        "milestones": services.build_milestones(user),
        "materials": MaterialSerializer(user.materials.all(), many=True).data,
        "questions": QuestionSerializer(
            Question.objects.filter(material__user=user), many=True
        ).data,
        "drafts": DraftSerializer(user.drafts.all(), many=True).data,
        "essays": [
            {
                "id": str(essay.id),
                "question_id": str(essay.question_id),
                "content": essay.content,
                "word_count": essay.word_count,
                "revision_number": essay.revision_number,
                "created_at": essay.created_at.isoformat(),
            }
            for essay in user.essays.all()
        ],
        "feedback": FeedbackSerializer(user.feedback.all(), many=True).data,
    }
    response = Response(payload)
    response["Content-Disposition"] = 'attachment; filename="foxtutor-export.json"'
    return response
