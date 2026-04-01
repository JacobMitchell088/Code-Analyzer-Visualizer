import textwrap
from pathlib import Path

from app.analyzers.python.dead_code import analyze_dead_code
from app.core.file_walker import FileInfo


def _make_file(tmp_path: Path, name: str, code: str) -> FileInfo:
    p = tmp_path / name
    p.write_text(textwrap.dedent(code), encoding="utf-8")
    lines = code.count("\n") + 1
    return FileInfo(path=p, rel_path=name, language="python", lines=lines)


def test_returns_dead_code_report(tmp_path):
    fi = _make_file(tmp_path, "mod.py", """\
        def used():
            return 1

        def never_called():
            return 2

        result = used()
    """)
    report = analyze_dead_code([fi], tmp_path)
    assert hasattr(report, "symbols")
    assert isinstance(report.symbols, list)


def test_file_path_is_string(tmp_path):
    fi = _make_file(tmp_path, "mod.py", """\
        def orphan():
            pass
    """)
    report = analyze_dead_code([fi], tmp_path)
    for sym in report.symbols:
        assert isinstance(sym.file_path, str), f"Expected str, got {type(sym.file_path)}"


def test_file_path_uses_forward_slashes(tmp_path):
    subdir = tmp_path / "pkg"
    subdir.mkdir()
    code = "def orphan():\n    pass\n"
    p = subdir / "util.py"
    p.write_text(code)
    fi = FileInfo(path=p, rel_path="pkg/util.py", language="python", lines=2)
    report = analyze_dead_code([fi], tmp_path)
    for sym in report.symbols:
        assert "\\" not in sym.file_path


def test_confidence_values_are_valid(tmp_path):
    fi = _make_file(tmp_path, "mod.py", """\
        def orphan():
            pass
    """)
    report = analyze_dead_code([fi], tmp_path)
    valid = {"high", "medium", "low"}
    for sym in report.symbols:
        assert sym.confidence in valid, f"Unexpected confidence: {sym.confidence}"


def test_language_is_python(tmp_path):
    fi = _make_file(tmp_path, "mod.py", "def orphan():\n    pass\n")
    report = analyze_dead_code([fi], tmp_path)
    for sym in report.symbols:
        assert sym.language == "python"


def test_empty_file(tmp_path):
    fi = _make_file(tmp_path, "empty.py", "")
    report = analyze_dead_code([fi], tmp_path)
    assert report.symbols == []
