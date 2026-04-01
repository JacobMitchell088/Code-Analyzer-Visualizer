import { useState } from "react";
import type { AnalysisResult } from "../../api/types";
import SummaryCards from "./SummaryCards";
import ComplexityTable from "../complexity/ComplexityTable";
import ComplexityHeatmap from "../complexity/ComplexityHeatmap";
import DependencyGraph from "../dependency/DependencyGraph";
import DuplicatesList from "../duplicates/DuplicatesList";
import DeadCodeList from "../deadcode/DeadCodeList";

type Tab = "complexity" | "dependencies" | "duplicates" | "deadcode";

const TABS: { id: Tab; label: string }[] = [
  { id: "complexity", label: "Complexity" },
  { id: "dependencies", label: "Dependencies" },
  { id: "duplicates", label: "Duplicates" },
  { id: "deadcode", label: "Dead Code" },
];

export default function Dashboard({ result }: { result: AnalysisResult }) {
  const [tab, setTab] = useState<Tab>("complexity");

  return (
    <div className="space-y-6">
      <SummaryCards summary={result.summary} />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "complexity" && (
          <div className="space-y-6">
            <ComplexityHeatmap perFile={result.complexity.per_file} />
            <ComplexityTable functions={result.complexity.functions} />
          </div>
        )}
        {tab === "dependencies" && (
          <DependencyGraph
            nodes={result.dependencies.nodes}
            edges={result.dependencies.edges}
          />
        )}
        {tab === "duplicates" && (
          <DuplicatesList groups={result.duplicates.groups} />
        )}
        {tab === "deadcode" && (
          <DeadCodeList symbols={result.dead_code.symbols} />
        )}
      </div>
    </div>
  );
}
