from __future__ import annotations
from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class JobStatusEnum(str, Enum):
    PENDING = "PENDING"
    CLONING = "CLONING"
    ANALYZING = "ANALYZING"
    DONE = "DONE"
    ERROR = "ERROR"


# --- Complexity ---

class FunctionComplexity(BaseModel):
    function_name: str
    file_path: str
    line_start: int
    line_end: int
    complexity: int
    rank: str  # A–F
    language: str


class FileComplexitySummary(BaseModel):
    file_path: str
    max_complexity: int
    avg_complexity: float
    lines_of_code: int


class ComplexityReport(BaseModel):
    functions: list[FunctionComplexity] = []
    per_file: list[FileComplexitySummary] = []


# --- Dependencies ---

class DependencyEdge(BaseModel):
    from_module: str
    to_module: str
    import_type: str
    is_external: bool


class DependencyNode(BaseModel):
    module_id: str
    file_path: str | None = None
    language: str
    in_degree: int = 0
    out_degree: int = 0
    is_external: bool = False


class DependencyReport(BaseModel):
    nodes: list[DependencyNode] = []
    edges: list[DependencyEdge] = []


# --- Duplicates ---

class DuplicateInstance(BaseModel):
    file_path: str
    line_start: int
    line_end: int
    snippet: str


class DuplicateBlock(BaseModel):
    block_id: str
    instances: list[DuplicateInstance]
    token_count: int
    language: str


class DuplicatesReport(BaseModel):
    groups: list[DuplicateBlock] = []
    total_duplicate_lines: int = 0


# --- Dead Code ---

class DeadSymbol(BaseModel):
    name: str
    symbol_type: str  # function | class | variable | import | export
    file_path: str
    line: int
    confidence: str  # high | medium | low
    language: str


class DeadCodeReport(BaseModel):
    symbols: list[DeadSymbol] = []


# --- Summary ---

class RepoSummary(BaseModel):
    total_files: int = 0
    python_files: int = 0
    js_ts_files: int = 0
    total_lines: int = 0
    avg_cyclomatic_complexity: float = 0.0
    max_cyclomatic_complexity: int = 0
    duplicate_block_count: int = 0
    duplicate_line_percentage: float = 0.0
    dead_symbol_count: int = 0


# --- Top-level result ---

class AnalysisResult(BaseModel):
    repo_url: str
    commit_sha: str = ""
    summary: RepoSummary = RepoSummary()
    complexity: ComplexityReport = ComplexityReport()
    dependencies: DependencyReport = DependencyReport()
    duplicates: DuplicatesReport = DuplicatesReport()
    dead_code: DeadCodeReport = DeadCodeReport()


# --- Job ---

class JobStatus(BaseModel):
    job_id: str
    status: JobStatusEnum = JobStatusEnum.PENDING
    progress: float = 0.0
    stage_message: str = "Queued"
    error: str | None = None
    result: AnalysisResult | None = None
    created_at: datetime
    completed_at: datetime | None = None
