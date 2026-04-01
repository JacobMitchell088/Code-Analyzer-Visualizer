import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SummaryCards from "../components/dashboard/SummaryCards";
import type { RepoSummary } from "../api/types";

const summary: RepoSummary = {
  total_files: 42,
  python_files: 30,
  js_ts_files: 12,
  total_lines: 8000,
  avg_cyclomatic_complexity: 3.7,
  max_cyclomatic_complexity: 14,
  duplicate_block_count: 5,
  duplicate_line_percentage: 8.3,
  dead_symbol_count: 11,
};

describe("SummaryCards", () => {
  it("renders total file count", () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders python and js/ts breakdown", () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText("30 Python · 12 JS/TS")).toBeInTheDocument();
  });

  it("renders avg complexity formatted to 1 decimal", () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText("3.7")).toBeInTheDocument();
  });

  it("renders max complexity", () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText("Max: 14")).toBeInTheDocument();
  });

  it("renders duplicate block count", () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders duplicate line percentage formatted to 1 decimal", () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText("8.3% of lines")).toBeInTheDocument();
  });

  it("renders dead symbol count", () => {
    render(<SummaryCards summary={summary} />);
    expect(screen.getByText("11")).toBeInTheDocument();
  });
});
