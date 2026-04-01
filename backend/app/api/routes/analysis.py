import asyncio
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.models.requests import AnalyzeRequest
from app.models.results import JobStatus
from app.core.job_store import job_store
from app.core.pipeline import run_pipeline

router = APIRouter()


@router.post("/analyze", status_code=202)
async def analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    job = job_store.create_job(req.repo_url)
    background_tasks.add_task(run_pipeline, job.job_id, req.repo_url, req.branch)
    return {"job_id": job.job_id, "status": job.status, "created_at": job.created_at}


@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job(job_id: str):
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
