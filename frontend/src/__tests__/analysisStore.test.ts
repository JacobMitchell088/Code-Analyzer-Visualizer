import { describe, it, expect, beforeEach } from "vitest";
import { useAnalysisStore } from "../store/analysisStore";
import type { AnalysisResult } from "../api/types";

const makeResult = (): AnalysisResult => ({
  repo_url: "https://github.com/test/repo",
  commit_sha: "abc123",
  summary: {
    total_files: 10,
    python_files: 8,
    js_ts_files: 2,
    total_lines: 500,
    avg_cyclomatic_complexity: 2.5,
    max_cyclomatic_complexity: 8,
    duplicate_block_count: 1,
    duplicate_line_percentage: 3.2,
    dead_symbol_count: 4,
  },
  complexity: { functions: [], per_file: [] },
  dependencies: { nodes: [], edges: [] },
  duplicates: { groups: [], total_duplicate_lines: 0 },
  dead_code: { symbols: [] },
});

beforeEach(() => {
  useAnalysisStore.getState().reset();
});

describe("analysisStore", () => {
  it("starts with null jobId and result", () => {
    const { jobId, result } = useAnalysisStore.getState();
    expect(jobId).toBeNull();
    expect(result).toBeNull();
  });

  it("setJobId sets the job id and clears result", () => {
    useAnalysisStore.getState().setResult(makeResult());
    useAnalysisStore.getState().setJobId("job-123");
    const { jobId, result } = useAnalysisStore.getState();
    expect(jobId).toBe("job-123");
    expect(result).toBeNull();
  });

  it("setResult stores the result", () => {
    const r = makeResult();
    useAnalysisStore.getState().setResult(r);
    expect(useAnalysisStore.getState().result).toEqual(r);
  });

  it("reset clears both jobId and result", () => {
    useAnalysisStore.getState().setJobId("job-999");
    useAnalysisStore.getState().setResult(makeResult());
    useAnalysisStore.getState().reset();
    const { jobId, result } = useAnalysisStore.getState();
    expect(jobId).toBeNull();
    expect(result).toBeNull();
  });
});
