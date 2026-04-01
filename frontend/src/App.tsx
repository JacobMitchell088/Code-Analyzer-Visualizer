import RepoUrlForm from "./components/input/RepoUrlForm";
import Dashboard from "./components/dashboard/Dashboard";
import Header from "./components/layout/Header";
import { useAnalysisStore } from "./store/analysisStore";
import { useJobStatus } from "./hooks/useAnalysis";

export default function App() {
  const result = useAnalysisStore((s) => s.result);
  const jobId = useAnalysisStore((s) => s.jobId);
  const { data: jobStatus } = useJobStatus();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {!result ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-3">
                Code Analyzer & Visualizer
              </h1>
              <p className="text-gray-400 text-lg">
                Static analysis — complexity, dependencies, duplicates, dead code
              </p>
            </div>
            <RepoUrlForm />
            {jobId && jobStatus && jobStatus.status !== "DONE" && jobStatus.status !== "ERROR" && (
              <div className="w-full max-w-lg">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>{jobStatus.stage_message}</span>
                  <span>{Math.round(jobStatus.progress * 100)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${jobStatus.progress * 100}%` }}
                  />
                </div>
              </div>
            )}
            {jobStatus?.status === "ERROR" && (
              <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-4 max-w-lg w-full">
                <strong>Analysis failed:</strong> {jobStatus.error}
              </div>
            )}
          </div>
        ) : (
          <Dashboard result={result} />
        )}
      </main>
    </div>
  );
}
