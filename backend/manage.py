#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # The test suite runs without a .env; give it an ephemeral dev config so the
    # DEBUG/SECRET_KEY guard in settings.py still protects real runs.
    if "test" in sys.argv:
        os.environ.setdefault("DEBUG", "True")
        os.environ.setdefault("SECRET_KEY", "django-insecure-test-only-not-for-deploy")

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
