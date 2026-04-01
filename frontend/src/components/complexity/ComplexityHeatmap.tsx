import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { FileComplexitySummary } from "../../api/types";

const WIDTH = 900;
const HEIGHT = 420;

function ccColor(cc: number): string {
  if (cc <= 5) return "#22c55e";
  if (cc <= 10) return "#84cc16";
  if (cc <= 15) return "#eab308";
  if (cc <= 20) return "#f97316";
  return "#ef4444";
}

export default function ComplexityHeatmap({ perFile }: { perFile: FileComplexitySummary[] }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || perFile.length === 0) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const root = d3
      .hierarchy({ children: perFile } as any)
      .sum((d: any) => d.lines_of_code ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    d3.treemap<any>().size([WIDTH, HEIGHT]).padding(2)(root);

    const leaves = svg
      .selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);

    leaves
      .append("rect")
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("fill", (d: any) => ccColor(d.data.max_complexity))
      .attr("opacity", 0.85)
      .attr("rx", 2);

    leaves
      .append("text")
      .attr("x", 4)
      .attr("y", 14)
      .attr("font-size", "10px")
      .attr("fill", "white")
      .attr("pointer-events", "none")
      .text((d: any) => {
        const w = d.x1 - d.x0;
        if (w < 40) return "";
        const name = d.data.file_path.split("/").pop() ?? d.data.file_path;
        return name.length * 6 > w ? name.slice(0, Math.floor(w / 6) - 1) + "…" : name;
      });

    leaves.append("title").text(
      (d: any) =>
        `${d.data.file_path}\nMax CC: ${d.data.max_complexity}\nAvg CC: ${d.data.avg_complexity.toFixed(1)}\nLOC: ${d.data.lines_of_code}`
    );
  }, [perFile]);

  if (perFile.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">
        Complexity Heatmap — area = LOC, color = max CC
      </h3>
      <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
        <svg ref={ref} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" />
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-400">
        {[["A (≤5)", "#22c55e"], ["B (≤10)", "#84cc16"], ["C (≤15)", "#eab308"], ["D (≤20)", "#f97316"], ["E/F (>20)", "#ef4444"]].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
