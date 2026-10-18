"""Extract plain text from an uploaded material. Never trusts the file name."""
import math
from pathlib import Path

MAX_EXTRACTED_CHARS = 200_000

WORDS_PER_PAGE = 500


def _estimate_pages(word_count):
    return max(1, math.ceil(word_count / WORDS_PER_PAGE))


def _read_txt(path):
    raw = Path(path).read_bytes()
    text = raw.decode("utf-8", errors="replace")
    return text, _estimate_pages(len(text.split()))


def _read_pdf(path):
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages = [page.extract_text() or "" for page in reader.pages]
    text = "\n\n".join(pages).strip()
    return text, max(1, len(reader.pages))


def _read_docx(path):
    import docx

    document = docx.Document(str(path))
    text = "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
    return text, _estimate_pages(len(text.split()))


READERS = {"TXT": _read_txt, "PDF": _read_pdf, "DOCX": _read_docx}


def extract_text(path, file_type):
    """Return (text, pages). Raises on unreadable content."""
    reader = READERS.get(file_type)
    if reader is None:
        raise ValueError(f"Unsupported file type: {file_type}")
    text, pages = reader(path)
    return text[:MAX_EXTRACTED_CHARS].strip(), pages
