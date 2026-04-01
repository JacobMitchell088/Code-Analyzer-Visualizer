from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_analyze_returns_202():
    with patch("app.api.routes.analysis.run_pipeline", new_callable=AsyncMock):
        resp = client.post(
            "/api/analyze",
            json={"repo_url": "https://github.com/test/repo"},
        )
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data
    assert data["status"] == "PENDING"
    assert "created_at" in data


def test_analyze_missing_body():
    resp = client.post("/api/analyze", json={})
    assert resp.status_code == 422


def test_analyze_invalid_url_type():
    resp = client.post("/api/analyze", json={"repo_url": 12345})
    assert resp.status_code == 422


def test_get_job_not_found():
    resp = client.get("/api/jobs/nonexistent-00000000")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Job not found"


def test_get_job_found():
    with patch("app.api.routes.analysis.run_pipeline", new_callable=AsyncMock):
        post = client.post(
            "/api/analyze",
            json={"repo_url": "https://github.com/test/repo"},
        )
    job_id = post.json()["job_id"]

    resp = client.get(f"/api/jobs/{job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == job_id
    assert data["status"] == "PENDING"


def test_analyze_with_optional_branch():
    with patch("app.api.routes.analysis.run_pipeline", new_callable=AsyncMock):
        resp = client.post(
            "/api/analyze",
            json={"repo_url": "https://github.com/test/repo", "branch": "develop"},
        )
    assert resp.status_code == 202
