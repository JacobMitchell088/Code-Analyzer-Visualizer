import { useAnalysisStore } from "../../store/analysisStore";

export default function Header() {
  const reset = useAnalysisStore((s) => s.reset);
  const result = useAnalysisStore((s) => s.result);

  return (
    <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <button
        onClick={reset}
        className="text-blue-400 font-bold text-lg hover:text-blue-300 transition-colors"
      >
        CAV
      </button>
      {result && (
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="truncate max-w-xs">{result.repo_url}</span>
          <span className="font-mono text-xs bg-gray-800 px-2 py-1 rounded">
            {result.commit_sha.slice(0, 7)}
          </span>
          <button
            onClick={reset}
            className="text-gray-500 hover:text-white transition-colors"
          >
            New analysis
          </button>
        </div>
      )}
    </header>
  );
}
