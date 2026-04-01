import asyncio
import shutil
from pathlib import Path

from app.core.cloner import clone_repo, CloneError
from app.core.file_walker import walk_repo
from app.core.job_store import job_store
from app.models.results import (
    AnalysisResult, RepoSummary, JobStatusEnum,
    ComplexityReport, DependencyReport, DuplicatesReport, DeadCodeReport,
)
from app.analyzers.python.complexity import analyze_complexity as py_complexity
from app.analyzers.python.dependencies import analyze_dependencies as py_deps
from app.analyzers.python.dead_code import analyze_dead_code as py_dead
from app.analyzers.python.duplicates import analyze_duplicates as py_dupes
from app.analyzers.javascript.runner import analyze_js


async def run_pipeline(job_id: str, repo_url: str, branch: str | None):
    tmp_dir: Path | None = None
    try:
        # 1. Clone
        job_store.update(
            job_id,
            status=JobStatusEnum.CLONING,
            progress=0.05,
            stage_message="Cloning repository...",
        )
        tmp_dir, commit_sha = await asyncio.to_thread(clone_repo, repo_url, branch)

        # 2. Walk files
        job_store.update(
            job_id,
            status=JobStatusEnum.ANALYZING,
            progress=0.20,
            stage_message="Walking file tree...",
        )
        files = await asyncio.to_thread(walk_repo, tmp_dir)
        py_files = files["python"]
        js_files = files["javascript"]

        # 3. Analyze Python
        job_store.update(job_id, progress=0.35, stage_message="Analyzing Python files...")
        py_complexity_report, py_dep_report, py_dead_report, py_dupe_report = (
            await asyncio.gather(
                asyncio.to_thread(py_complexity, py_files, tmp_dir),
                asyncio.to_thread(py_deps, py_files, tmp_dir),
                asyncio.to_thread(py_dead, py_files, tmp_dir),
                asyncio.to_thread(py_dupes, py_files),
            )
        )

        # 4. Analyze JavaScript/TypeScript
        job_store.update(job_id, progress=0.65, stage_message="Analyzing JS/TS files...")
        js_result = await analyze_js(tmp_dir, js_files)

        # 5. Merge results
        job_store.update(job_id, progress=0.90, stage_message="Merging results...")
        result = _merge(
            repo_url, commit_sha,
            py_files, js_files,
            py_complexity_report, py_dep_report, py_dead_report, py_dupe_report,
            js_result,
        )

        job_store.set_done(job_id, result)

    except CloneError as e:
        job_store.set_error(job_id, f"Clone failed: {e}")
    except Exception as e:
        job_store.set_error(job_id, f"Analysis failed: {e}")
    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)


def _merge(
    repo_url, commit_sha,
    py_files, js_files,
    py_cx, py_dep, py_dead, py_dupes,
    js_result,
) -> AnalysisResult:
    # Combine complexity
    all_functions = py_cx.functions + (js_result.complexity.functions if js_result else [])
    all_per_file = py_cx.per_file + (js_result.complexity.per_file if js_result else [])
    complexity = ComplexityReport(functions=all_functions, per_file=all_per_file)

    # Combine dependencies
    all_nodes = py_dep.nodes + (js_result.dependencies.nodes if js_result else [])
    all_edges = py_dep.edges + (js_result.dependencies.edges if js_result else [])
    dependencies = DependencyReport(nodes=all_nodes, edges=all_edges)

    # Combine dead code
    all_symbols = py_dead.symbols + (js_result.dead_code.symbols if js_result else [])
    dead_code = DeadCodeReport(symbols=all_symbols)

    # Combine duplicates
    all_groups = py_dupes.groups + (js_result.duplicates.groups if js_result else [])
    total_dup_lines = py_dupes.total_duplicate_lines + (
        js_result.duplicates.total_duplicate_lines if js_result else 0
    )
    duplicates = DuplicatesReport(groups=all_groups, total_duplicate_lines=total_dup_lines)

    # Summary stats
    total_lines = sum(f.lines for f in py_files + js_files)
    cc_scores = [f.complexity for f in all_functions]
    avg_cc = round(sum(cc_scores) / len(cc_scores), 2) if cc_scores else 0.0
    max_cc = max(cc_scores, default=0)
    dup_pct = round((total_dup_lines / total_lines * 100), 2) if total_lines else 0.0

    summary = RepoSummary(
        total_files=len(py_files) + len(js_files),
        python_files=len(py_files),
        js_ts_files=len(js_files),
        total_lines=total_lines,
        avg_cyclomatic_complexity=avg_cc,
        max_cyclomatic_complexity=max_cc,
        duplicate_block_count=len(all_groups),
        duplicate_line_percentage=dup_pct,
        dead_symbol_count=len(all_symbols),
    )

    return AnalysisResult(
        repo_url=repo_url,
        commit_sha=commit_sha,
        summary=summary,
        complexity=complexity,
        dependencies=dependencies,
        duplicates=duplicates,
        dead_code=dead_code,
    )
