import textwrap
from pathlib import Path

import pytest

from app.analyzers.python.complexity import analyze_complexity, _rank
from app.core.file_walker import FileInfo


# --- _rank ---

def test_rank_a():
    assert _rank(1) == "A"
    assert _rank(5) == "A"


def test_rank_b():
    assert _rank(6) == "B"
    assert _rank(10) == "B"


def test_rank_boundaries():
    assert _rank(11) == "C"
    assert _rank(15) == "C"
    assert _rank(16) == "D"
    assert _rank(20) == "D"
    assert _rank(21) == "E"
    assert _rank(25) == "E"
    assert _rank(26) == "F"
    assert _rank(100) == "F"


# --- analyze_complexity ---

def _make_file(tmp_path: Path, name: str, code: str, lines: int = 10) -> FileInfo:
    p = tmp_path / name
    p.write_text(textwrap.dedent(code), encoding="utf-8")
    return FileInfo(path=p, rel_path=name, language="python", lines=lines)


def test_simple_function(tmp_path):
    fi = _make_file(tmp_path, "simple.py", """\
        def greet(name):
            return f"hello {name}"
    """)
    report = analyze_complexity([fi], tmp_path)
    assert any(fn.function_name == "greet" for fn in report.functions)
    greet = next(fn for fn in report.functions if fn.function_name == "greet")
    assert greet.complexity == 1
    assert greet.rank == "A"
    assert greet.language == "python"
    assert greet.file_path == "simple.py"


def test_branchy_function(tmp_path):
    fi = _make_file(tmp_path, "branchy.py", """\
        def classify(x):
            if x > 100:
                return "big"
            elif x > 50:
                return "medium"
            elif x > 10:
                return "small"
            else:
                return "tiny"
    """)
    report = analyze_complexity([fi], tmp_path)
    fn = next(f for f in report.functions if f.function_name == "classify")
    # 1 base + 3 decision points (if/elif/elif) = CC 4, still rank A (≤5)
    assert fn.complexity >= 4
    assert fn.rank == "A"


def test_empty_file(tmp_path):
    fi = _make_file(tmp_path, "empty.py", "")
    report = analyze_complexity([fi], tmp_path)
    assert report.functions == []
    assert report.per_file == []


def test_multiple_functions_per_file(tmp_path):
    fi = _make_file(tmp_path, "multi.py", """\
        def alpha():
            return 1

        def beta(x):
            if x:
                return x
            return 0
    """)
    report = analyze_complexity([fi], tmp_path)
    names = {fn.function_name for fn in report.functions}
    assert "alpha" in names
    assert "beta" in names


def test_per_file_summary_populated(tmp_path):
    fi = _make_file(tmp_path, "summary.py", """\
        def foo():
            return 1
    """, lines=3)
    report = analyze_complexity([fi], tmp_path)
    assert len(report.per_file) == 1
    summary = report.per_file[0]
    assert summary.file_path == "summary.py"
    assert summary.lines_of_code == 3
    assert summary.max_complexity >= 1


def test_unparseable_file_is_skipped(tmp_path):
    fi = _make_file(tmp_path, "bad.py", "def broken(:\n    pass\n")
    report = analyze_complexity([fi], tmp_path)
    # Should not raise; bad file simply produces no results
    assert isinstance(report.functions, list)
