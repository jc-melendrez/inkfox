from django.urls import path

from . import views

urlpatterns = [
    path("auth/signup", views.signup, name="signup"),
    path("auth/login", views.login, name="login"),
    path("auth/me", views.me, name="me"),
    path("auth/logout", views.logout, name="logout"),
    path("auth/google", views.google_login, name="google-login"),
    path("auth/password/reset", views.password_reset, name="password-reset"),
    path("onboarding/complete", views.complete_onboarding, name="complete-onboarding"),
    path("account", views.delete_account, name="delete-account"),
    path("profile", views.profile, name="profile"),
    path("profile/password", views.change_password, name="change-password"),
    path("profile/export", views.export_data, name="export-data"),
    path("settings", views.settings_view, name="settings"),
]
