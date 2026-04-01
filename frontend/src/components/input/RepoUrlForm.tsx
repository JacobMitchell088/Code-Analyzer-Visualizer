import { useState } from "react";
import { useSubmitAnalysis } from "../../hooks/useAnalysis";

const EXAMPLE_REPOS = [
  "https://github.com/pallets/flask",
  "https://github.com/psf/requests",
  "https://github.com/JacobMitchell088/SkillScope",
];

export default function RepoUrlForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = useSubmitAnalysis();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    setLoading(true);
    try {
      await submit(url.trim());
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to start analysis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-semibold transition-colors"
        >
          {loading ? "Starting..." : "Analyze"}
        </button>
      </form>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      <div className="flex gap-2 mt-3 flex-wrap">
        <span className="text-gray-500 text-sm">Try:</span>
        {EXAMPLE_REPOS.map((r) => (
          <button
            key={r}
            onClick={() => setUrl(r)}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            {r.replace("https://github.com/", "")}
          </button>
        ))}
      </div>
    </div>
  );
}
