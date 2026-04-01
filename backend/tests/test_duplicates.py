import textwrap
from pathlib import Path

from app.analyzers.python.duplicates import analyze_duplicates, _tokenize, _winnow, _hash
from app.core.file_walker import FileInfo


def _make_file(tmp_path: Path, name: str, code: str) -> FileInfo:
    p = tmp_path / name
    p.write_text(textwrap.dedent(code), encoding="utf-8")
    lines = code.count("\n") + 1
    return FileInfo(path=p, rel_path=name, language="python", lines=lines)


# --- Unit: _tokenize ---

def test_tokenize_returns_tokens():
    code = "x = 1 + 2\n"
    tokens = _tokenize(code)
    strings = [t[0] for t in tokens]
    assert "x" in strings
    assert "1" in strings
    assert "+" in strings


def test_tokenize_skips_comments():
    code = "# this is a comment\nx = 1\n"
    tokens = _tokenize(code)
    strings = [t[0] for t in tokens]
    assert "# this is a comment" not in strings


def test_tokenize_empty_source():
    # tokenize emits an ENDMARKER (empty string) even for empty input.
    # There should be no meaningful (non-empty) tokens.
    result = _tokenize("")
    assert not any(tok for tok, _ in result)


def test_tokenize_invalid_source():
    # Should not raise; returns partial results
    result = _tokenize("def broken(:\n    pass\n")
    assert isinstance(result, list)


# --- Unit: _hash ---

def test_hash_deterministic():
    assert _hash("abc") == _hash("abc")


def test_hash_different_inputs():
    assert _hash("abc") != _hash("xyz")


# --- Integration: analyze_duplicates ---

# A block of code repeated across two files — long enough to generate fingerprints
_SHARED_BODY = """\
def transform(items, factor, offset):
    result = []
    for item in items:
        value = item * factor
        value = value + offset
        if value > 0:
            result.append(value)
    return result
"""


def test_detects_duplicate_across_files(tmp_path):
    f1 = _make_file(tmp_path, "alpha.py", _SHARED_BODY)
    f2 = _make_file(tmp_path, "beta.py", _SHARED_BODY)
    report = analyze_duplicates([f1, f2])
    assert len(report.groups) > 0
    # Each duplicate group must reference both files
    file_paths = {inst.file_path for g in report.groups for inst in g.instances}
    assert "alpha.py" in file_paths
    assert "beta.py" in file_paths


def test_no_duplicates_for_unique_files(tmp_path):
    f1 = _make_file(tmp_path, "unique1.py", "x = 1\n")
    f2 = _make_file(tmp_path, "unique2.py", "y = 2\n")
    report = analyze_duplicates([f1, f2])
    assert report.groups == []


def test_single_file_no_duplicates(tmp_path):
    f1 = _make_file(tmp_path, "solo.py", _SHARED_BODY)
    report = analyze_duplicates([f1])
    assert report.groups == []


def test_total_duplicate_lines_positive(tmp_path):
    f1 = _make_file(tmp_path, "a.py", _SHARED_BODY)
    f2 = _make_file(tmp_path, "b.py", _SHARED_BODY)
    report = analyze_duplicates([f1, f2])
    if report.groups:
        assert report.total_duplicate_lines > 0
