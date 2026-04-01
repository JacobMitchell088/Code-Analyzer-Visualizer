import { useState, useMemo } from "react";
import type { FunctionComplexity } from "../../api/types";
import clsx from "clsx";

const RANK_COLORS: Record<string, string> = {
  A: "text-green-400",
  B: "text-lime-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  E: "text-red-400",
  F: "text-red-700",
};

export default function ComplexityTable({ functions }: { functions: FunctionComplexity[] }) {
  const [sortKey, setSortKey] = useState<"complexity" | "function_name" | "file_path">("complexity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");

  const sorted = useMemo(() => {
    const filtered = functions.filter(
      (f) =>
        f.function_name.toLowerCase().includes(filter.toLowerCase()) ||
        f.file_path.toLowerCase().includes(filter.toLowerCase())
    );
    return filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [functions, sortKey, sortDir, filter]);

  const toggleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const th = (label: string, key: typeof sortKey) => (
    <th
      onClick={() => toggleSort(key)}
      className="px-4 py-2 text-left text-gray-400 text-xs font-semibold uppercase cursor-pointer hover:text-white select-none"
    >
      {label} {sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : ""}
    </th>
  );

  return (
    <div className="space-y-3">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by function or file..."
        className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 w-64 focus:outline-none focus:border-blue-500"
      />
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              {th("Function", "function_name")}
              {th("File", "file_path")}
              <th className="px-4 py-2 text-left text-gray-400 text-xs font-semibold uppercase">Line</th>
              <th
                onClick={() => toggleSort("complexity")}
                className="px-4 py-2 text-left text-gray-400 text-xs font-semibold uppercase cursor-pointer hover:text-white select-none"
              >
                <span
                  title="Cyclomatic Complexity — counts the number of independent paths through a function. Higher = harder to test and maintain. A (1–5) is ideal; F (26+) is very high risk."
                  className="border-b border-dashed border-gray-500 cursor-help"
                >
                  CC
                </span>
                {sortKey === "complexity" ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
              </th>
              <th className="px-4 py-2 text-left text-gray-400 text-xs font-semibold uppercase">Rank</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 200).map((fn, i) => (
              <tr key={i} className="border-t border-gray-800 hover:bg-gray-900/50">
                <td className="px-4 py-2 font-mono text-white">{fn.function_name}</td>
                <td className="px-4 py-2 text-gray-400 text-xs truncate max-w-xs">{fn.file_path}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{fn.line_start}</td>
                <td className="px-4 py-2 font-bold text-white">{fn.complexity}</td>
                <td className={clsx("px-4 py-2 font-bold", RANK_COLORS[fn.rank] ?? "text-gray-400")}>
                  {fn.rank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center text-gray-500 py-8">No functions found.</div>
        )}
      </div>
    </div>
  );
}
