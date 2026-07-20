"""
Загрузка статей базы знаний из Markdown-файлов (content/articles/*.md).

Формат: YAML-подобный frontmatter (простые key: value, без вложенности) +
тело с лёгким блочным синтаксисом, однозначно отображаемым на существующие
типы блоков фронтенда (::warning, ::tip, ::danger, ::events, нумерованный
список — "шаги", GFM-таблица, обычный абзац — "text"). CFO правит .md через
GitHub, редеплой бэкенда для этого не нужен — файлы читаются заново на
каждый запрос (см. list_articles/get_article), без кеша.
"""

import re
from pathlib import Path

ARTICLES_DIR = Path(__file__).resolve().parent.parent.parent / "content" / "articles"

# Разрешаем только простые идентификаторы: это имя файла на диске, и без
# такой проверки article_id из URL мог бы содержать "../" и читать
# произвольный файл за пределами content/articles (path traversal).
_ID_RE = re.compile(r"^[a-z0-9_-]+$")

_FENCE_START_RE = re.compile(r"^::(\w+)\s*$")
_TABLE_ROW_RE = re.compile(r"^\|(.+)\|\s*$")
_TABLE_SEP_RE = re.compile(r"^\|(\s*:?-+:?\s*\|)+\s*$")
_ORDERED_ITEM_RE = re.compile(r"^\d+\.\s+(.*)$")
_STEP_LABEL_RE = re.compile(r"^\*\*(.+?)\*\*\s*[—\-:]\s*(.*)$")


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        raise ValueError("файл должен начинаться с frontmatter (---)")
    end = text.find("\n---", 3)
    if end == -1:
        raise ValueError("не закрыт frontmatter (не хватает второго ---)")
    header = text[3:end]
    body = text[end + 4:].lstrip("\n")
    meta = {}
    for line in header.splitlines():
        line = line.strip()
        if not line:
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()
    return meta, body


def _build_fenced_block(kind: str, content_lines: list[str]) -> dict:
    if kind in ("warning", "tip"):
        return {"type": kind, "text": " ".join(l.strip() for l in content_lines if l.strip())}
    if kind == "danger":
        items = [l.strip().lstrip("-").strip() for l in content_lines if l.strip()]
        return {"type": "danger-list", "items": items}
    if kind == "events":
        items = []
        for l in content_lines:
            if not l.strip():
                continue
            parts = [p.strip() for p in l.split("|")]
            parts += ["", "", ""]
            items.append({"date": parts[0], "label": parts[1], "regime": parts[2]})
        return {"type": "events", "items": items}
    # Неизвестный тип блока (опечатка в CFO-правке) — не роняем статью,
    # показываем содержимое как обычный текст.
    return {"type": "text", "text": " ".join(l.strip() for l in content_lines if l.strip())}


def _build_table_block(table_lines: list[str]) -> dict:
    rows = [[c.strip() for c in _TABLE_ROW_RE.match(l).group(1).split("|")] for l in table_lines]
    headers = rows[0]
    body_rows = rows[1:]
    if len(table_lines) > 1 and _TABLE_SEP_RE.match(table_lines[1]):
        body_rows = rows[2:]
    return {"type": "table", "headers": headers, "rows": body_rows}


def _build_steps_block(item_lines: list[str]) -> dict:
    items = []
    for line in item_lines:
        rest = _ORDERED_ITEM_RE.match(line).group(1).strip()
        label_match = _STEP_LABEL_RE.match(rest)
        if label_match:
            items.append({"label": label_match.group(1).strip(), "text": label_match.group(2).strip()})
        else:
            items.append({"label": rest, "text": ""})
    return {"type": "steps", "items": items}


def _parse_blocks(body: str) -> list[dict]:
    lines = body.splitlines()
    blocks = []
    i = 0
    n = len(lines)

    while i < n:
        while i < n and lines[i].strip() == "":
            i += 1
        if i >= n:
            break
        line = lines[i]

        fence = _FENCE_START_RE.match(line)
        if fence:
            kind = fence.group(1)
            i += 1
            content_lines = []
            while i < n and lines[i].strip() != "::":
                content_lines.append(lines[i])
                i += 1
            i += 1  # пропускаем закрывающий "::"
            blocks.append(_build_fenced_block(kind, content_lines))
            continue

        if _TABLE_ROW_RE.match(line):
            table_lines = []
            while i < n and _TABLE_ROW_RE.match(lines[i]):
                table_lines.append(lines[i])
                i += 1
            blocks.append(_build_table_block(table_lines))
            continue

        if _ORDERED_ITEM_RE.match(line):
            item_lines = []
            while i < n and _ORDERED_ITEM_RE.match(lines[i]):
                item_lines.append(lines[i])
                i += 1
            blocks.append(_build_steps_block(item_lines))
            continue

        para_lines = []
        while (
            i < n
            and lines[i].strip() != ""
            and not _FENCE_START_RE.match(lines[i])
            and not _TABLE_ROW_RE.match(lines[i])
            and not _ORDERED_ITEM_RE.match(lines[i])
        ):
            para_lines.append(lines[i])
            i += 1
        blocks.append({"type": "text", "text": " ".join(l.strip() for l in para_lines)})

    return blocks


_REQUIRED_META_FIELDS = ("id", "category", "category_label", "title", "icon", "short")


def _load_article_file(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(text)
    missing = [f for f in _REQUIRED_META_FIELDS if not meta.get(f)]
    if missing:
        raise ValueError(f"{path.name}: в frontmatter не хватает полей {missing}")
    if meta["id"] != path.stem:
        raise ValueError(f"{path.name}: id в frontmatter ('{meta['id']}') должен совпадать с именем файла")
    return {
        "id": meta["id"],
        "category": meta["category"],
        "categoryLabel": meta["category_label"],
        "title": meta["title"],
        "icon": meta["icon"],
        "short": meta["short"],
        "content": _parse_blocks(body),
    }


def list_articles() -> list[dict]:
    articles = []
    for path in sorted(ARTICLES_DIR.glob("*.md")):
        try:
            articles.append(_load_article_file(path))
        except ValueError:
            # Битый файл (опечатка CFO во frontmatter) не должен ронять
            # весь список статей — пропускаем только его.
            continue
    return articles


def get_article(article_id: str) -> dict | None:
    if not _ID_RE.match(article_id):
        return None
    path = ARTICLES_DIR / f"{article_id}.md"
    if not path.is_file():
        return None
    try:
        return _load_article_file(path)
    except ValueError:
        return None
