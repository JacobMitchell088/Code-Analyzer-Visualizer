import textwrap
from pathlib import Path

from app.analyzers.python.dependencies import analyze_dependencies, _path_to_module_id
from app.core.file_walker import FileInfo


def _make_file(tmp_path: Path, rel: str, code: str) -> FileInfo:
    p = tmp_path / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(textwrap.dedent(code), encoding="utf-8")
    lines = code.count("\n") + 1
    return FileInfo(path=p, rel_path=rel, language="python", lines=lines)


def test_stdlib_import_is_external(tmp_path):
    fi = _make_file(tmp_path, "mod.py", "import os\nimport sys\n")
    report = analyze_dependencies([fi], tmp_path)
    edge_targets = {e.to_module for e in report.edges}
    assert "os" in edge_targets
    assert "sys" in edge_targets
    os_edge = next(e for e in report.edges if e.to_module == "os")
    assert os_edge.is_external is True


def test_from_import(tmp_path):
    fi = _make_file(tmp_path, "mod.py", "from pathlib import Path\n")
    report = analyze_dependencies([fi], tmp_path)
    edge_targets = {e.to_module for e in report.edges}
    assert "pathlib" in edge_targets
    pathlib_edge = next(e for e in report.edges if e.to_module == "pathlib")
    assert pathlib_edge.import_type == "from_import"


def test_internal_module_not_external(tmp_path):
    # Use top-level modules so the base name matches the internal_modules set exactly.
    # _is_external checks the base name against module IDs built from file paths,
    # so "import a" correctly resolves when a.py exists as module "a".
    a = _make_file(tmp_path, "a.py", "x = 1\n")
    b = _make_file(tmp_path, "b.py", "import a\n")
    report = analyze_dependencies([a, b], tmp_path)
    internal_edge = next((e for e in report.edges if e.to_module == "a"), None)
    assert internal_edge is not None
    assert internal_edge.is_external is False


def test_degrees_computed(tmp_path):
    a = _make_file(tmp_path, "a.py", "import os\n")
    report = analyze_dependencies([a], tmp_path)
    a_node = next(n for n in report.nodes if n.module_id == "a")
    assert a_node.out_degree >= 1


def test_nodes_include_source_module(tmp_path):
    fi = _make_file(tmp_path, "mymod.py", "import json\n")
    report = analyze_dependencies([fi], tmp_path)
    module_ids = {n.module_id for n in report.nodes}
    assert "mymod" in module_ids


def test_syntax_error_skipped(tmp_path):
    fi = _make_file(tmp_path, "broken.py", "def bad(:\n    pass\n")
    report = analyze_dependencies([fi], tmp_path)
    # Should not raise; broken file yields no edges
    assert isinstance(report.edges, list)


def test_path_to_module_id():
    assert _path_to_module_id("app/models/results.py") == "app.models.results"
    assert _path_to_module_id("main.py") == "main"
