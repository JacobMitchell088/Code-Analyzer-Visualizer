from pydantic import BaseModel, HttpUrl


class AnalyzeRequest(BaseModel):
    repo_url: str
    branch: str | None = None
