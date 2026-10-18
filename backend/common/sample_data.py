"""Built-in sample material + offline question/feedback text.

Used by `manage.py seed_demo` and the `POST /api/materials/sample` endpoint so
the whole app is demoable with no AI provider configured.
"""
import re

from common.choices import METHOD_PARTS

PASSAGE_CELL = (
    "A cell is the smallest unit of life. The mitochondria are often called the "
    "powerhouse of the cell because they release energy stored in glucose as ATP "
    "through respiration. ATP powers almost every activity a cell performs, from "
    "building proteins to moving molecules across the membrane."
)
PASSAGE_WW2 = (
    "World War Two grew out of the harsh terms of the Treaty of Versailles, the "
    "worldwide economic depression of the 1930s, the rise of fascist leaders such "
    "as Hitler and Mussolini, and the failure of the League of Nations to stop "
    "aggression. The invasion of Poland in 1939 triggered declarations of war "
    "across Europe."
)
PASSAGE_MEMO = (
    "Our campaign aims to grow repeat purchases among existing customers. The "
    "proposed budget shifts spend from broad advertising toward email and loyalty "
    "rewards. Success will be measured by a 10% rise in returning customers over "
    "one quarter."
)

BIOLOGY_QUESTIONS = [
    "What is the main job of the cell membrane?",
    "How do ribosomes help a cell make proteins?",
    "Why is the nucleus important for cell activity?",
    "What role does the cytoplasm play inside a cell?",
    "Why do cells need mitochondria to survive?",
    "How does the cell wall differ from the cell membrane?",
    "What happens to a cell during osmosis?",
    "Why are enzymes important for cell reactions?",
    "How do cells reproduce through mitosis?",
    "Why is cell specialisation useful in multicellular organisms?",
]

WW2_QUESTIONS = [
    "What were the main causes of World War Two?",
    "How did the Treaty of Versailles create resentment?",
    "Why did the League of Nations fail to prevent war?",
    "How did the Great Depression help fascist leaders rise?",
    "Why did the invasion of Poland trigger a wider war?",
    "What role did alliances play in spreading the conflict?",
    "How did propaganda shape public support for the war?",
    "Why did the United States join the war in 1941?",
    "How did wartime economies change daily life?",
    "Why is it useful to separate long-term and short-term causes?",
]

MARKETING_QUESTIONS = [
    "What is the main goal of the campaign?",
    "How should the budget be spent and why?",
    "Which metric proves the campaign worked?",
    "What might make a loyal customer stop returning?",
    "Why is email a good channel for repeat purchases?",
]

SAMPLE_MATERIALS = [
    {
        "title": "Cell Biology Notes",
        "file_type": "PDF",
        "pages": 12,
        "method": "PEEL",
        "passage": PASSAGE_CELL,
        "questions": BIOLOGY_QUESTIONS,
    },
    {
        "title": "WW2 Causes Reading",
        "file_type": "DOCX",
        "pages": 6,
        "method": "PEEL",
        "passage": PASSAGE_WW2,
        "questions": WW2_QUESTIONS,
    },
    {
        "title": "Marketing Memo",
        "file_type": "TXT",
        "pages": 2,
        "method": "TEEL",
        "passage": PASSAGE_MEMO,
        "questions": MARKETING_QUESTIONS,
    },
]

SAMPLE_ESSAY = (
    "The text argues this point clearly. It gives evidence from the passage to "
    "support it. This matters because it changes how we understand the topic, and "
    "that is why it links back to the question."
)


def build_sample_feedback(method, content, score):
    """A pre-written, encouraging Feedback payload (used when AI is off)."""
    parts_meta = METHOD_PARTS[method]
    sentences = [s for s in re.split(r"(?<=[.!?])\s+", (content or "").strip()) if s]
    total = len(parts_meta)
    landed = max(1, min(total, round(score / 100 * total)))
    parts, strengths, improvements = [], [], []
    for index, (key, label) in enumerate(parts_meta):
        text = sentences[index] if index < len(sentences) else ""
        if index < landed:
            status = "strong"
        elif text:
            status = "needs_work"
        else:
            status = "missing"
        part = {"key": key, "label": label, "text": text, "status": status}
        if status == "missing":
            part["note"] = f"No {label.lower()} yet."
        parts.append(part)
        if status == "strong":
            strengths.append(f"{label} is clear and on task")
        else:
            improvements.append(
                {
                    "part_key": key,
                    "label": label,
                    "message": f"Add or sharpen your {label.lower()}.",
                }
            )
    headline = (
        "Nice work — strong structure!" if score >= 60 else "Good start — a couple of parts to build out."
    )
    return {
        "method": method,
        "headline": headline,
        "parts_landed": landed,
        "parts_total": total,
        "parts": parts,
        "strengths": strengths,
        "improvements": improvements,
        "score": score,
    }
