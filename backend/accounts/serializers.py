from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from common.choices import Method

from .models import Settings, UserRole

User = get_user_model()

EMAIL_EXISTS = "An account with this email already exists. Try logging in instead."
NAME_REQUIRED = "Please add your name."
PASSWORD_TOO_SHORT = "Your password needs at least 8 characters."
EMAIL_INVALID = "That email looks incomplete. Check it and try again."
CREDENTIALS_INVALID = "That email and password don't match. Please try again."


def normalise_name(value):
    return " ".join(value.split())


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "onboarded", "avatar_url"]


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=UserRole.choices)

    def validate_name(self, value):
        name = normalise_name(value)
        if not name:
            raise serializers.ValidationError(NAME_REQUIRED)
        return name

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(EMAIL_EXISTS)
        return email

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError(PASSWORD_TOO_SHORT)
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            name=validated_data["name"],
            role=validated_data["role"],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        attrs["email"] = attrs["email"].strip().lower()
        attrs["password"] = attrs["password"]
        return attrs


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["name", "email", "role"]
        extra_kwargs = {
            "name": {"required": False},
            "email": {"required": False},
            "role": {"required": False},
        }

    def validate_name(self, value):
        name = normalise_name(value)
        if not name:
            raise serializers.ValidationError("Please keep a name on your profile.")
        return name

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("That email is already in use by another account.")
        return email


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(error_messages={"invalid": EMAIL_INVALID})


class ChangePasswordSerializer(serializers.Serializer):
    current = serializers.CharField(write_only=True)
    new = serializers.CharField(write_only=True)

    def validate_current(self, value):
        if not value.strip():
            raise serializers.ValidationError("Enter your current password.")
        return value

    def validate_new(self, value):
        if len(value) < 8:
            raise serializers.ValidationError(PASSWORD_TOO_SHORT)
        return value


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settings
        fields = [
            "default_method",
            "pressure_timer",
            "timer_minutes",
            "daily_reminder",
            "weekly_summary",
            "text_size",
        ]


class OnboardingSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=UserRole.choices, required=False)
    method = serializers.ChoiceField(choices=Method.choices, required=False)
