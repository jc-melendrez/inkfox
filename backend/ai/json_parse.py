"""Pull a JSON value out of model text, tolerating code fences and chatter."""
import json


def parse_json(text):
    if not isinstance(text, str):
        return text
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        # drop an optional leading language hint such as "json"
        first_newline = cleaned.find("\n")
        if first_newline != -1 and " " not in cleaned[:first_newline]:
            cleaned = cleaned[first_newline + 1 :]
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    for open_char, close_char in (("[", "]"), ("{", "}")):
        start = cleaned.find(open_char)
        end = cleaned.rfind(close_char)
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError("No JSON found in AI response.")
