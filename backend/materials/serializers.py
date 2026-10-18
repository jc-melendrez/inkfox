from rest_framework import serializers

from .models import Material


class MaterialSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    uploaded_at = serializers.DateTimeField(read_only=True)
    question_count = serializers.SerializerMethodField()
    questions_done = serializers.SerializerMethodField()
    processing_progress = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = [
            "id",
            "title",
            "file_type",
            "pages",
            "uploaded_at",
            "question_count",
            "questions_done",
            "status",
            "processing_progress",
        ]

    def get_question_count(self, material):
        return len(material.questions.all())

    def get_questions_done(self, material):
        return sum(1 for question in material.questions.all() if question.essays.all())

    def get_processing_progress(self, material):
        return material.processing_progress
