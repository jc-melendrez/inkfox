from rest_framework import serializers

from .models import Question


class QuestionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    material_id = serializers.CharField(read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "material_id",
            "index",
            "total",
            "text",
            "source_passage",
            "method",
        ]
