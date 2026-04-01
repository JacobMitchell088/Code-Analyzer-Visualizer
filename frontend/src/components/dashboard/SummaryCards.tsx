import type { RepoSummary } from "../../api/types";

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function SummaryCards({ summary }: { summary: RepoSummary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card
        label="Total Files"
        value={summary.total_files.toLocaleString()}
        sub={`${summary.python_files} Python · ${summary.js_ts_files} JS/TS`}
      />
      <Card
        label="Avg Complexity"
        value={summary.avg_cyclomatic_complexity.toFixed(1)}
        sub={`Max: ${summary.max_cyclomatic_complexity}`}
      />
      <Card
        label="Duplicate Blocks"
        value={summary.duplicate_block_count}
        sub={`${summary.duplicate_line_percentage.toFixed(1)}% of lines`}
      />
      <Card
        label="Dead Symbols"
        value={summary.dead_symbol_count}
        sub="Unused exports & functions"
      />
    </div>
  );
}
