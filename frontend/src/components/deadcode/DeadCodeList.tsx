import { useState } from "react";
import type { DeadSymbol } from "../../api/types";
import clsx from "clsx";

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-gray-400",
};

export default function DeadCodeList({ symbols }: { symbols: DeadSymbol[] }) {
  const [minConf, setMinConf] = useState<"all" | "medium" | "high">("all");
  const [filter, setFilter] = useState("");

  const filtered = symbols.filter((s) => {
    if (minConf === "high" && s.confidence !== "high") return false;
    if (minConf === "medium" && s.confidence === "low") return false;
    if (filter && !s.name.toLowerCase().includes(filter.toLowerCase()) &&
        !s.file_path.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  if (symbols.length === 0) {
    return <div className="text-gray-500 text-sm py-8 text-center">No dead code detected.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter..."
          className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <select
          value={minConf}
          onChange={(e) => setMinConf(e.target.value as any)}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none"
        >
          <option value="all">All confidence</option>
          <option value="medium">Medium+</option>
          <option value="high">High only</option>
        </select>
        <span className="text-gray-500 text-sm self-center">{filtered.length} symbols</span>
      </div>
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-gray-400 text-xs font-semibold uppercase">Symbol</th>
              <th className="px-4 py-2 text-left text-gray-400 text-xs font-semibold uppercase">Type</th>
              <th className="px-4 py-2 text-left text-gray-400 text-xs font-semibold uppercase">File</th>
              <th className="px-4 py-2 text-left text-gray-400 text-xs font-semibold uppercase">Line</th>
              <th className="px-4 py-2 text-left text-gray-400 text-xs font-semibold uppercase">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((sym, i) => (
              <tr key={i} className="border-t border-gray-800 hover:bg-gray-900/50">
                <td className="px-4 py-2 font-mono text-white">{sym.name}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{sym.symbol_type}</td>
                <td className="px-4 py-2 text-gray-400 text-xs truncate max-w-xs">{sym.file_path}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{sym.line}</td>
                <td className={clsx("px-4 py-2 text-xs font-semibold", CONFIDENCE_COLORS[sym.confidence])}>
                  {sym.confidence}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
