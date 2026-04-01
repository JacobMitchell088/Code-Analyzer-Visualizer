import tempfile
import shutil
from pathlib import Path

import git

from app.config import settings


class CloneError(Exception):
    pass


def clone_repo(url: str, branch: str | None = None) -> tuple[Path, str]:
    """
    Clone the repo into a temp directory.
    Returns (tmp_dir_path, commit_sha).
    Caller is responsible for cleanup via shutil.rmtree.
    """
    tmp_dir = Path(tempfile.mkdtemp(prefix="cav_"))
    try:
        kwargs: dict = {"depth": 1, "single_branch": True}
        if branch:
            kwargs["branch"] = branch
        repo = git.Repo.clone_from(url, tmp_dir, **kwargs)
        commit_sha = repo.head.commit.hexsha
        _check_size(tmp_dir)
        return tmp_dir, commit_sha
    except git.GitCommandError as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise CloneError(f"Git clone failed: {e}") from e
    except Exception as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise CloneError(str(e)) from e


def _check_size(path: Path):
    total_bytes = sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
    total_mb = total_bytes / (1024 * 1024)
    if total_mb > settings.max_repo_size_mb:
        raise CloneError(
            f"Repo size {total_mb:.0f} MB exceeds limit of {settings.max_repo_size_mb} MB"
        )
