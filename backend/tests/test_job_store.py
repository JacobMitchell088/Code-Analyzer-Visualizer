from app.core.job_store import JobStore
from app.models.results import AnalysisResult, JobStatusEnum


def make_store() -> JobStore:
    return JobStore()


def test_create_job_returns_pending():
    store = make_store()
    job = store.create_job("https://github.com/test/repo")
    assert job.status == JobStatusEnum.PENDING
    assert job.progress == 0.0
    assert job.job_id is not None
    assert job.result is None


def test_get_existing_job():
    store = make_store()
    job = store.create_job("https://github.com/test/repo")
    fetched = store.get(job.job_id)
    assert fetched is not None
    assert fetched.job_id == job.job_id


def test_get_missing_job_returns_none():
    store = make_store()
    assert store.get("nonexistent-id") is None


def test_update_fields():
    store = make_store()
    job = store.create_job("https://github.com/test/repo")
    store.update(job.job_id, progress=0.5, stage_message="Cloning")
    updated = store.get(job.job_id)
    assert updated.progress == 0.5
    assert updated.stage_message == "Cloning"


def test_update_unknown_job_does_not_raise():
    store = make_store()
    store.update("ghost-id", progress=0.5)  # should not raise


def test_set_done():
    store = make_store()
    job = store.create_job("https://github.com/test/repo")
    result = AnalysisResult(repo_url="https://github.com/test/repo")
    store.set_done(job.job_id, result)
    done = store.get(job.job_id)
    assert done.status == JobStatusEnum.DONE
    assert done.progress == 1.0
    assert done.result is not None
    assert done.completed_at is not None


def test_set_error():
    store = make_store()
    job = store.create_job("https://github.com/test/repo")
    store.set_error(job.job_id, "Clone failed")
    errored = store.get(job.job_id)
    assert errored.status == JobStatusEnum.ERROR
    assert errored.error == "Clone failed"
    assert errored.completed_at is not None


def test_multiple_jobs_are_independent():
    store = make_store()
    j1 = store.create_job("https://github.com/a/a")
    j2 = store.create_job("https://github.com/b/b")
    store.set_error(j1.job_id, "oops")
    assert store.get(j2.job_id).status == JobStatusEnum.PENDING
