export type JobStatusEnum = "PENDING" | "CLONING" | "ANALYZING" | "DONE" | "ERROR";

export interface FunctionComplexity {
  function_name: string;
  file_path: string;
  line_start: number;
  line_end: number;
  complexity: number;
  rank: "A" | "B" | "C" | "D" | "E" | "F";
  language: string;
}

export interface FileComplexitySummary {
  file_path: string;
  max_complexity: number;
  avg_complexity: number;
  lines_of_code: number;
}

export interface ComplexityReport {
  functions: FunctionComplexity[];
  per_file: FileComplexitySummary[];
}

export interface DependencyEdge {
  from_module: string;
  to_module: string;
  import_type: string;
  is_external: boolean;
}

export interface DependencyNode {
  module_id: string;
  file_path: string | null;
  language: string;
  in_degree: number;
  out_degree: number;
  is_external: boolean;
}

export interface DependencyReport {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DuplicateInstance {
  file_path: string;
  line_start: number;
  line_end: number;
  snippet: string;
}

export interface DuplicateBlock {
  block_id: string;
  instances: DuplicateInstance[];
  token_count: number;
  language: string;
}

export interface DuplicatesReport {
  groups: DuplicateBlock[];
  total_duplicate_lines: number;
}

export interface DeadSymbol {
  name: string;
  symbol_type: string;
  file_path: string;
  line: number;
  confidence: "high" | "medium" | "low";
  language: string;
}

export interface DeadCodeReport {
  symbols: DeadSymbol[];
}

export interface RepoSummary {
  total_files: number;
  python_files: number;
  js_ts_files: number;
  total_lines: number;
  avg_cyclomatic_complexity: number;
  max_cyclomatic_complexity: number;
  duplicate_block_count: number;
  duplicate_line_percentage: number;
  dead_symbol_count: number;
}

export interface AnalysisResult {
  repo_url: string;
  commit_sha: string;
  summary: RepoSummary;
  complexity: ComplexityReport;
  dependencies: DependencyReport;
  duplicates: DuplicatesReport;
  dead_code: DeadCodeReport;
}

export interface JobStatus {
  job_id: string;
  status: JobStatusEnum;
  progress: number;
  stage_message: string;
  error?: string;
  result?: AnalysisResult;
  created_at: string;
  completed_at?: string;
}
