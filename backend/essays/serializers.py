from rest_framework import serializers

from .models import Draft


class DraftSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    question_id = serializers.CharField(read_only=True)

    class Meta:
        model = Draft
        fields = ["id", "question_id", "content", "word_count", "updated_at"]
