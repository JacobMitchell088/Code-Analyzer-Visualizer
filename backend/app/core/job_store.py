import uuid
from datetime import datetime, timezone
from threading import Lock

from app.models.results import JobStatus, JobStatusEnum, AnalysisResult


class JobStore:
    def __init__(self):
        self._jobs: dict[str, JobStatus] = {}
        self._lock = Lock()

    def create_job(self, repo_url: str) -> JobStatus:
        job_id = str(uuid.uuid4())
        job = JobStatus(job_id=job_id, created_at=datetime.now(timezone.utc))
        with self._lock:
            self._jobs[job_id] = job
        return job

    def get(self, job_id: str) -> JobStatus | None:
        return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs):
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            for k, v in kwargs.items():
                setattr(job, k, v)

    def set_done(self, job_id: str, result: AnalysisResult):
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            job.status = JobStatusEnum.DONE
            job.progress = 1.0
            job.stage_message = "Analysis complete"
            job.result = result
            job.completed_at = datetime.now(timezone.utc)

    def set_error(self, job_id: str, error: str):
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            job.status = JobStatusEnum.ERROR
            job.error = error
            job.completed_at = datetime.now(timezone.utc)


job_store = JobStore()
