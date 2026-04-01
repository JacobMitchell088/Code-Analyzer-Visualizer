import { useState } from "react";
import type { DuplicateBlock } from "../../api/types";

export default function DuplicatesList({ groups }: { groups: DuplicateBlock[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (groups.length === 0) {
    return <div className="text-gray-500 text-sm py-8 text-center">No duplicate blocks detected.</div>;
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.block_id} className="border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === group.block_id ? null : group.block_id)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors text-left"
          >
            <div>
              <span className="text-white text-sm font-medium">
                {group.instances.length} copies
              </span>
              <span className="text-gray-500 text-xs ml-3">
                {group.instances.map((i) => i.file_path.split("/").pop()).join(" · ")}
              </span>
            </div>
            <span className="text-gray-600 text-xs">{expanded === group.block_id ? "▲" : "▼"}</span>
          </button>
          {expanded === group.block_id && (
            <div className="divide-y divide-gray-800">
              {group.instances.map((inst, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="text-xs text-gray-400 mb-2">
                    {inst.file_path}:{inst.line_start}–{inst.line_end}
                  </div>
                  <pre className="text-xs text-gray-300 bg-gray-950 rounded p-3 overflow-x-auto">
                    {inst.snippet || "(no snippet)"}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
