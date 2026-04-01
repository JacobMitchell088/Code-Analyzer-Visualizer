from pathlib import Path
from dataclasses import dataclass

import pathspec

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "vendor", "target", ".mypy_cache",
    ".pytest_cache", "coverage", ".tox",
}

LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
}


@dataclass
class FileInfo:
    path: Path          # absolute
    rel_path: str       # relative to repo root
    language: str
    lines: int


def walk_repo(root: Path) -> dict[str, list[FileInfo]]:
    """
    Walk the repo, classify files by language.
    Returns { "python": [...], "javascript": [...] }
    (typescript is grouped under "javascript" for analysis purposes)
    """
    gitignore = _load_gitignore(root)
    result: dict[str, list[FileInfo]] = {"python": [], "javascript": []}

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if _should_skip(path, root):
            continue
        if gitignore and gitignore.match_file(str(path.relative_to(root))):
            continue

        lang = LANGUAGE_MAP.get(path.suffix.lower())
        if lang is None:
            continue

        try:
            lines = _count_lines(path)
        except (OSError, UnicodeDecodeError):
            continue

        rel = str(path.relative_to(root)).replace("\\", "/")
        bucket = "javascript" if lang in ("javascript", "typescript") else lang
        result[bucket].append(FileInfo(path=path, rel_path=rel, language=lang, lines=lines))

    return result


def _should_skip(path: Path, root: Path) -> bool:
    parts = path.relative_to(root).parts
    return any(part in SKIP_DIRS for part in parts)


def _load_gitignore(root: Path) -> pathspec.PathSpec | None:
    gitignore_path = root / ".gitignore"
    if not gitignore_path.exists():
        return None
    lines = gitignore_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    return pathspec.PathSpec.from_lines("gitwildmatch", lines)


def _count_lines(path: Path) -> int:
    with path.open("r", encoding="utf-8", errors="ignore") as f:
        return sum(1 for _ in f)
