"""
Runs the Node.js analysis worker as a subprocess and parses its JSON output.
"""
import asyncio
import json
from pathlib import Path

from app.config import settings
from app.core.file_walker import FileInfo
from app.models.results import (
    AnalysisResult, ComplexityReport, DependencyReport, DuplicatesReport, DeadCodeReport,
    FunctionComplexity, FileComplexitySummary, DependencyEdge, DependencyNode,
    DuplicateBlock, DuplicateInstance, DeadSymbol,
)

# Path to the JS worker entry point relative to this file
_WORKER_PATH = Path(__file__).parent.parent.parent.parent / "js_worker" / "analysis_worker.js"


async def analyze_js(repo_root: Path, files: list[FileInfo]) -> AnalysisResult | None:
    if not files:
        return None
    if not _WORKER_PATH.exists():
        return None

    try:
        proc = await asyncio.create_subprocess_exec(
            settings.node_path,
            str(_WORKER_PATH),
            "--path", str(repo_root),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=settings.analysis_timeout_seconds
        )
    except asyncio.TimeoutError:
        return None
    except Exception:
        return None

    if proc.returncode != 0:
        return None

    try:
        data = json.loads(stdout.decode())
    except json.JSONDecodeError:
        return None

    return _parse_js_result(data)


def _parse_js_result(data: dict) -> AnalysisResult:
    functions = [
        FunctionComplexity(**f) for f in data.get("complexity", {}).get("functions", [])
    ]
    per_file = [
        FileComplexitySummary(**f) for f in data.get("complexity", {}).get("per_file", [])
    ]
    complexity = ComplexityReport(functions=functions, per_file=per_file)

    edges = [DependencyEdge(**e) for e in data.get("dependencies", {}).get("edges", [])]
    nodes = [DependencyNode(**n) for n in data.get("dependencies", {}).get("nodes", [])]
    dependencies = DependencyReport(nodes=nodes, edges=edges)

    groups = []
    for g in data.get("duplicates", {}).get("groups", []):
        instances = [DuplicateInstance(**i) for i in g.get("instances", [])]
        groups.append(DuplicateBlock(
            block_id=g["block_id"],
            instances=instances,
            token_count=g.get("token_count", 0),
            language=g.get("language", "javascript"),
        ))
    duplicates = DuplicatesReport(
        groups=groups,
        total_duplicate_lines=data.get("duplicates", {}).get("total_duplicate_lines", 0),
    )

    symbols = [DeadSymbol(**s) for s in data.get("dead_code", {}).get("symbols", [])]
    dead_code = DeadCodeReport(symbols=symbols)

    return AnalysisResult(
        repo_url="",
        complexity=complexity,
        dependencies=dependencies,
        duplicates=duplicates,
        dead_code=dead_code,
    )
