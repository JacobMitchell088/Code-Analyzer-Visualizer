from pathlib import Path

from radon.complexity import cc_visit, ComplexityVisitor
from radon.metrics import mi_visit

from app.core.file_walker import FileInfo
from app.models.results import (
    ComplexityReport, FunctionComplexity, FileComplexitySummary,
)

RANK_THRESHOLDS = [
    (5, "A"), (10, "B"), (15, "C"), (20, "D"), (25, "E")
]


def _rank(cc: int) -> str:
    for threshold, rank in RANK_THRESHOLDS:
        if cc <= threshold:
            return rank
    return "F"


def analyze_complexity(files: list[FileInfo], repo_root: Path) -> ComplexityReport:
    functions: list[FunctionComplexity] = []
    per_file: list[FileComplexitySummary] = []

    for fi in files:
        try:
            source = fi.path.read_text(encoding="utf-8", errors="ignore")
            blocks = cc_visit(source)
        except Exception:
            continue

        file_scores = []
        for block in blocks:
            cc = block.complexity
            functions.append(FunctionComplexity(
                function_name=block.fullname,
                file_path=fi.rel_path,
                line_start=block.lineno,
                line_end=block.endline if hasattr(block, "endline") else block.lineno,
                complexity=cc,
                rank=_rank(cc),
                language=fi.language,
            ))
            file_scores.append(cc)

        if file_scores:
            per_file.append(FileComplexitySummary(
                file_path=fi.rel_path,
                max_complexity=max(file_scores),
                avg_complexity=round(sum(file_scores) / len(file_scores), 2),
                lines_of_code=fi.lines,
            ))

    return ComplexityReport(functions=functions, per_file=per_file)
