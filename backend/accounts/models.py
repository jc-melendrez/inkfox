from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
from django.db import models

from common.choices import Method, TextSize


class UserRole(models.TextChoices):
    HIGH_SCHOOL = "High school student", "High school student"
    UNIVERSITY = "University student", "University student"
    LIFELONG = "Lifelong learner", "Lifelong learner"
    TEACHER = "Teacher", "Teacher"


class UserManager(BaseUserManager):
    """Email is the identifier, so username is gone from create_user/create_superuser."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Email is the login identifier (frontend uses email + password)."""

    username = None
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)
    role = models.CharField(
        max_length=32, choices=UserRole.choices, default=UserRole.HIGH_SCHOOL
    )
    onboarded = models.BooleanField(default=False)
    avatar_url = models.URLField(blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    def __str__(self):
        return self.email


class Settings(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="settings"
    )
    default_method = models.CharField(
        max_length=8, choices=Method.choices, default=Method.PEEL
    )
    pressure_timer = models.BooleanField(default=False)
    timer_minutes = models.PositiveSmallIntegerField(default=30)
    daily_reminder = models.BooleanField(default=True)
    weekly_summary = models.BooleanField(default=False)
    text_size = models.CharField(
        max_length=8, choices=TextSize.choices, default=TextSize.MEDIUM
    )

    def __str__(self):
        return f"Settings({self.user_id})"


class Milestone(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="milestones"
    )
    key = models.CharField(max_length=40)
    label = models.CharField(max_length=80)
    earned = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "key"], name="uniq_milestone_per_user"
            )
        ]

    def __str__(self):
        return self.label

