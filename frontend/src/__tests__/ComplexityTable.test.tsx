import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComplexityTable from "../components/complexity/ComplexityTable";
import type { FunctionComplexity } from "../api/types";

const functions: FunctionComplexity[] = [
  {
    function_name: "simple_fn",
    file_path: "app/utils.py",
    line_start: 10,
    line_end: 15,
    complexity: 1,
    rank: "A",
    language: "python",
  },
  {
    function_name: "complex_fn",
    file_path: "app/core.py",
    line_start: 20,
    line_end: 60,
    complexity: 12,
    rank: "C",
    language: "python",
  },
];

describe("ComplexityTable", () => {
  it("renders all function names", () => {
    render(<ComplexityTable functions={functions} />);
    expect(screen.getByText("simple_fn")).toBeInTheDocument();
    expect(screen.getByText("complex_fn")).toBeInTheDocument();
  });

  it("renders complexity scores", () => {
    render(<ComplexityTable functions={functions} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders rank badges", () => {
    render(<ComplexityTable functions={functions} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("CC header has tooltip explaining cyclomatic complexity", () => {
    render(<ComplexityTable functions={functions} />);
    const ccElement = screen.getByTitle(/Cyclomatic Complexity/i);
    expect(ccElement).toBeInTheDocument();
  });

  it("filters by function name", () => {
    render(<ComplexityTable functions={functions} />);
    const input = screen.getByPlaceholderText(/filter/i);
    fireEvent.change(input, { target: { value: "complex" } });
    expect(screen.queryByText("simple_fn")).not.toBeInTheDocument();
    expect(screen.getByText("complex_fn")).toBeInTheDocument();
  });

  it("filters by file path", () => {
    render(<ComplexityTable functions={functions} />);
    const input = screen.getByPlaceholderText(/filter/i);
    fireEvent.change(input, { target: { value: "utils" } });
    expect(screen.getByText("simple_fn")).toBeInTheDocument();
    expect(screen.queryByText("complex_fn")).not.toBeInTheDocument();
  });

  it("shows empty state when filter matches nothing", () => {
    render(<ComplexityTable functions={functions} />);
    const input = screen.getByPlaceholderText(/filter/i);
    fireEvent.change(input, { target: { value: "zzznomatch" } });
    expect(screen.getByText(/no functions found/i)).toBeInTheDocument();
  });

  it("renders empty state with no functions", () => {
    render(<ComplexityTable functions={[]} />);
    expect(screen.getByText(/no functions found/i)).toBeInTheDocument();
  });
});
