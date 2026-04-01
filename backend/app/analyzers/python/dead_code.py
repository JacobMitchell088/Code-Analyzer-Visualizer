from pathlib import Path

import vulture

from app.core.file_walker import FileInfo
from app.models.results import DeadCodeReport, DeadSymbol

CONFIDENCE_MAP = {
    100: "high",
    90: "high",
    60: "medium",
}


def _confidence(score: int) -> str:
    if score >= 90:
        return "high"
    if score >= 60:
        return "medium"
    return "low"


def analyze_dead_code(files: list[FileInfo], repo_root: Path) -> DeadCodeReport:
    v = vulture.Vulture(verbose=False)

    for fi in files:
        try:
            source = fi.path.read_text(encoding="utf-8", errors="ignore")
            v.scan(source, filename=fi.rel_path)
        except Exception:
            continue

    symbols: list[DeadSymbol] = []
    for item in v.get_unused_code():
        symbols.append(DeadSymbol(
            name=item.name,
            symbol_type=item.typ,
            file_path=str(item.filename).replace("\\", "/"),
            line=item.first_lineno,
            confidence=_confidence(item.confidence),
            language="python",
        ))

    return DeadCodeReport(symbols=symbols)
