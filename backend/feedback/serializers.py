from rest_framework import serializers

from .models import Feedback


class FeedbackSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    question_id = serializers.SerializerMethodField()
    instructions = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = [
            "id",
            "question_id",
            "draft_number",
            "method",
            "headline",
            "parts_landed",
            "parts_total",
            "parts",
            "strengths",
            "improvements",
            "instructions",
        ]

    def get_question_id(self, feedback):
        return str(feedback.essay.question_id)

    def get_instructions(self, feedback):
        return feedback.essay.instructions
