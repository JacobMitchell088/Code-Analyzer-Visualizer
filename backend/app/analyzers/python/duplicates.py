"""
Token-based duplicate detection using the Winnowing algorithm.

Steps:
1. Tokenize each file (Python tokenize module)
2. Compute rolling k-gram hashes over the token stream
3. Apply the Winnowing window to select fingerprints
4. Group files that share fingerprints
5. Report clone groups with file + line-range info
"""
import hashlib
import tokenize
import io
from collections import defaultdict
from pathlib import Path

from app.core.file_walker import FileInfo
from app.models.results import DuplicatesReport, DuplicateBlock, DuplicateInstance

# Tuning parameters
K_GRAM_SIZE = 6       # tokens per k-gram
WINDOW_SIZE = 5       # Winnowing window
MIN_TOKENS = 15       # minimum clone size to report

# Token types to skip (whitespace, comments, encoding markers)
_SKIP_TYPES = {tokenize.COMMENT, tokenize.NL, tokenize.NEWLINE,
               tokenize.INDENT, tokenize.DEDENT, tokenize.ENCODING}


def analyze_duplicates(files: list[FileInfo]) -> DuplicatesReport:
    # Step 1: Tokenize all files
    file_tokens: list[tuple[FileInfo, list[tuple[str, int]]]] = []
    for fi in files:
        try:
            source = fi.path.read_text(encoding="utf-8", errors="ignore")
            tokens = _tokenize(source)
            if tokens:
                file_tokens.append((fi, tokens))
        except Exception:
            continue

    # Step 2: Compute fingerprints per file
    # fingerprint_index maps hash -> list of (FileInfo, line_start, line_end)
    fingerprint_index: dict[int, list[tuple[FileInfo, int, int]]] = defaultdict(list)

    for fi, tokens in file_tokens:
        fps = _winnow(tokens)
        for h, line_start, line_end in fps:
            fingerprint_index[h].append((fi, line_start, line_end))

    # Step 3: Find hashes that appear in >= 2 different files (or same file, diff location)
    groups: list[DuplicateBlock] = []
    seen_block_ids: set[str] = set()
    total_dup_lines = 0

    for h, locations in fingerprint_index.items():
        if len(locations) < 2:
            continue

        # Deduplicate by file+line
        unique = list({(fi.rel_path, ls, le) for fi, ls, le in locations})
        if len(unique) < 2:
            continue

        block_id = hex(h)[2:]
        if block_id in seen_block_ids:
            continue
        seen_block_ids.add(block_id)

        instances: list[DuplicateInstance] = []
        for fi, line_start, line_end in locations:
            snippet = _extract_snippet(fi.path, line_start)
            instances.append(DuplicateInstance(
                file_path=fi.rel_path,
                line_start=line_start,
                line_end=line_end,
                snippet=snippet,
            ))
            total_dup_lines += max(1, line_end - line_start)

        groups.append(DuplicateBlock(
            block_id=block_id,
            instances=instances,
            token_count=K_GRAM_SIZE,
            language="python",
        ))

    return DuplicatesReport(groups=groups, total_duplicate_lines=total_dup_lines)


def _tokenize(source: str) -> list[tuple[str, int]]:
    """Return list of (token_string, line_number), skipping noise tokens."""
    result = []
    try:
        tokens = tokenize.generate_tokens(io.StringIO(source).readline)
        for tok_type, tok_string, (srow, _), _, _ in tokens:
            if tok_type in _SKIP_TYPES:
                continue
            result.append((tok_string, srow))
    except tokenize.TokenError:
        pass
    return result


def _winnow(tokens: list[tuple[str, int]]) -> list[tuple[int, int, int]]:
    """
    Apply Winnowing to produce (hash, line_start, line_end) fingerprints.
    """
    if len(tokens) < K_GRAM_SIZE:
        return []

    strings = [t[0] for t in tokens]
    lines = [t[1] for t in tokens]

    # Build k-gram hashes
    kgram_hashes: list[tuple[int, int, int]] = []
    for i in range(len(strings) - K_GRAM_SIZE + 1):
        gram = "".join(strings[i: i + K_GRAM_SIZE])
        h = _hash(gram)
        kgram_hashes.append((h, lines[i], lines[i + K_GRAM_SIZE - 1]))

    if not kgram_hashes:
        return []

    # Winnowing: slide a window of size WINDOW_SIZE, pick the minimum hash
    fingerprints: list[tuple[int, int, int]] = []
    prev_min_idx = -1

    for i in range(len(kgram_hashes) - WINDOW_SIZE + 1):
        window = kgram_hashes[i: i + WINDOW_SIZE]
        min_h = min(window, key=lambda x: x[0])
        min_idx = i + window.index(min_h)
        if min_idx != prev_min_idx:
            fingerprints.append(min_h)
            prev_min_idx = min_idx

    return fingerprints


def _hash(s: str) -> int:
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


def _extract_snippet(path: Path, line_start: int, max_lines: int = 3) -> str:
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        start = max(0, line_start - 1)
        return "\n".join(lines[start: start + max_lines])
    except Exception:
        return ""
