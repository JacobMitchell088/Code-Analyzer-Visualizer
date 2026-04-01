import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import type { DependencyNode, DependencyEdge } from "../../api/types";

interface Props {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

const WIDTH = 960;
const HEIGHT = 600;

const LANG_COLOR: Record<string, string> = {
  python: "#3b82f6",
  javascript: "#f59e0b",
  typescript: "#8b5cf6",
};

export default function DependencyGraph({ nodes, edges }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hideExternal, setHideExternal] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: DependencyNode } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const visibleNodes = hideExternal ? nodes.filter((n) => !n.is_external) : nodes;
    const visibleIds = new Set(visibleNodes.map((n) => n.module_id));
    const visibleEdges = edges.filter(
      (e) => visibleIds.has(e.from_module) && visibleIds.has(e.to_module)
    );

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    svg.call(
      d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
        g.attr("transform", event.transform);
      }) as any
    );

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#4b5563");

    const simNodes = visibleNodes.map((n) => ({ ...n })) as any[];
    const idIndex = new Map(simNodes.map((n, i) => [n.module_id, i]));

    const simLinks = visibleEdges
      .map((e) => ({
        source: idIndex.get(e.from_module),
        target: idIndex.get(e.to_module),
        import_type: e.import_type,
      }))
      .filter((l) => l.source !== undefined && l.target !== undefined);

    const sim = d3
      .forceSimulation(simNodes)
      .force("link", d3.forceLink(simLinks).id((_: any, i: number) => i).distance(120))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("collision", d3.forceCollide(20));

    const link = g
      .append("g")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#374151")
      .attr("stroke-width", 1)
      .attr("marker-end", "url(#arrow)");

    const node = g
      .append("g")
      .selectAll("circle")
      .data(simNodes)
      .join("circle")
      .attr("r", (d: any) => Math.min(4 + d.in_degree * 2, 20))
      .attr("fill", (d: any) => LANG_COLOR[d.language] ?? "#6b7280")
      .attr("opacity", (d: any) => (d.is_external ? 0.4 : 0.9))
      .attr("cursor", "pointer")
      .on("mouseover", (event: MouseEvent, d: any) => {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          node: d,
        });
      })
      .on("mouseout", () => setTooltip(null))
      .call(
        d3.drag<SVGCircleElement, any>()
          .on("start", (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }) as any
      );

    const label = g
      .append("g")
      .selectAll("text")
      .data(simNodes.filter((n: any) => n.in_degree > 1 || !n.is_external))
      .join("text")
      .attr("font-size", "9px")
      .attr("fill", "#9ca3af")
      .attr("pointer-events", "none")
      .text((d: any) => d.module_id.split("/").pop()?.split(".").shift() ?? d.module_id);

    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
      label.attr("x", (d: any) => d.x + 8).attr("y", (d: any) => d.y + 3);
    });

    return () => { sim.stop(); };
  }, [nodes, edges, hideExternal]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={hideExternal}
            onChange={(e) => setHideExternal(e.target.checked)}
            className="accent-blue-500"
          />
          Hide external packages
        </label>
        <div className="flex gap-3 text-xs text-gray-500">
          {Object.entries(LANG_COLOR).map(([lang, color]) => (
            <span key={lang} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
              {lang}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-600 ml-auto">Scroll to zoom · Drag nodes · Hover for info</span>
      </div>
      <div className="relative rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
        <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" />
        {tooltip && (
          <div
            className="absolute z-10 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
          >
            <div className="font-bold text-white mb-1">{tooltip.node.module_id}</div>
            <div className="text-gray-400">In: {tooltip.node.in_degree} · Out: {tooltip.node.out_degree}</div>
            <div className="text-gray-500">{tooltip.node.language}{tooltip.node.is_external ? " · external" : ""}</div>
          </div>
        )}
      </div>
    </div>
  );
}
