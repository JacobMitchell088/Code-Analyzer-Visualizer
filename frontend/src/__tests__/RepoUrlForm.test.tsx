import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RepoUrlForm from "../components/input/RepoUrlForm";

const mockSubmit = vi.fn();

vi.mock("../hooks/useAnalysis", () => ({
  useSubmitAnalysis: () => mockSubmit,
}));

beforeEach(() => {
  mockSubmit.mockReset();
  mockSubmit.mockResolvedValue(undefined);
});

describe("RepoUrlForm", () => {
  it("renders the url input", () => {
    render(<RepoUrlForm />);
    expect(screen.getByPlaceholderText(/github\.com/i)).toBeInTheDocument();
  });

  it("analyze button is disabled when input is empty", () => {
    render(<RepoUrlForm />);
    expect(screen.getByRole("button", { name: /analyze/i })).toBeDisabled();
  });

  it("analyze button enables when url is typed", () => {
    render(<RepoUrlForm />);
    const input = screen.getByPlaceholderText(/github\.com/i);
    fireEvent.change(input, { target: { value: "https://github.com/test/repo" } });
    expect(screen.getByRole("button", { name: /analyze/i })).not.toBeDisabled();
  });

  it("calls submit with the entered url", async () => {
    render(<RepoUrlForm />);
    const input = screen.getByPlaceholderText(/github\.com/i);
    fireEvent.change(input, { target: { value: "https://github.com/test/repo" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith("https://github.com/test/repo")
    );
  });

  it("shows SkillScope in the example repos", () => {
    render(<RepoUrlForm />);
    expect(screen.getByText(/SkillScope/i)).toBeInTheDocument();
  });

  it("clicking an example repo fills the input", () => {
    render(<RepoUrlForm />);
    fireEvent.click(screen.getByText(/SkillScope/i));
    const input = screen.getByPlaceholderText(/github\.com/i) as HTMLInputElement;
    expect(input.value).toContain("SkillScope");
  });

  it("shows error message on submit failure", async () => {
    mockSubmit.mockRejectedValue({ response: { data: { detail: "Repo too large" } } });
    render(<RepoUrlForm />);
    const input = screen.getByPlaceholderText(/github\.com/i);
    fireEvent.change(input, { target: { value: "https://github.com/test/repo" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));
    await waitFor(() =>
      expect(screen.getByText("Repo too large")).toBeInTheDocument()
    );
  });
});
