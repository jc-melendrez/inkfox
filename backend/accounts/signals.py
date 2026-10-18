"""Create a new user's Settings, Milestones and MethodProgress rows."""
from django.db.models.signals import post_save
from django.dispatch import receiver

from common.choices import MILESTONES

from .models import Milestone, Settings, User

# label / level_label are pre-set so the UI can render "not started" rows.
DEFAULT_METHODS = [
    {"method": "PEEL", "label": "PEEL"},
    {"method": "TEEL", "label": "TEEL"},
    {"method": "Other", "label": "Other methods"},
]


@receiver(post_save, sender=User)
def create_user_defaults(sender, instance, created, **kwargs):
    if not created:
        return
    Settings.objects.get_or_create(user=instance)
    Milestone.objects.bulk_create(
        [
            Milestone(user=instance, key=key, label=label, order=index)
            for index, (key, label) in enumerate(MILESTONES)
        ],
        ignore_conflicts=True,
    )
    # Imported lazily to avoid an accounts <-> progress import cycle.
    from progress.models import MethodProgress

    MethodProgress.objects.bulk_create(
        [
            MethodProgress(user=instance, order=index, **data)
            for index, data in enumerate(DEFAULT_METHODS)
        ],
        ignore_conflicts=True,
    )
