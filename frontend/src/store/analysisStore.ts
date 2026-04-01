import { create } from "zustand";
import type { AnalysisResult } from "../api/types";

interface AnalysisStore {
  jobId: string | null;
  result: AnalysisResult | null;
  setJobId: (id: string) => void;
  setResult: (r: AnalysisResult) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  jobId: null,
  result: null,
  setJobId: (id) => set({ jobId: id, result: null }),
  setResult: (result) => set({ result }),
  reset: () => set({ jobId: null, result: null }),
}));
