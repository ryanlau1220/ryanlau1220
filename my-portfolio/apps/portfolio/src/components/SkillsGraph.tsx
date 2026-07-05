import * as d3Force from "d3-force";
import { List, Maximize, Network, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
interface D3Node extends d3Force.SimulationNodeDatum {
  id: string;
  name: string;
  type: "domain" | "technology";
  linkCount: number;
}

interface D3Link extends d3Force.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
}

interface Project {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  description: string;
  achievements: string[];
  githubUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  domains: string[];
  technologies: string[];
}

interface SkillsGraphProps {
  selectedSkill: string | null;
  onSelectSkill: (skill: string | null) => void;
  onRouteToProject?: (projectId: string) => void;
  projects: Project[];
}

export function SkillsGraph({
  selectedSkill,
  onSelectSkill,
  onRouteToProject,
  projects: PROJECTS,
}: SkillsGraphProps) {
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Pan & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [_simKey, setSimKey] = useState(0);

  // Dragging state for node
  const draggedNodeRef = useRef<D3Node | null>(null);
  const hasMovedRef = useRef(false);

  // 1. Group domains as the eight main categories, and map all 45 technologies
  const { nodes, links, domains, technologies, techMap } = useMemo(() => {
    const techToCategoryMap: Record<string, string> = {
      // 1. Programming Languages
      TypeScript: "Programming Languages",
      Go: "Programming Languages",
      Dart: "Programming Languages",
      Python: "Programming Languages",
      Java: "Programming Languages",
      R: "Programming Languages",
      Solidity: "Programming Languages",
      Kotlin: "Programming Languages",
      JavaScript: "Programming Languages",
      PHP: "Programming Languages",

      // 2. Backend
      "Node.js": "Backend",
      "Hono.js": "Backend",
      Keycloak: "Backend",
      "Drizzle ORM": "Backend",
      Bun: "Backend",
      Elysia: "Backend",
      ORPC: "Backend",
      Express: "Backend",
      Firebase: "Backend",
      "Firebase Genkit": "Backend",
      Prisma: "Backend",
      GORM: "Backend",
      FastAPI: "Backend",
      BullMQ: "Backend",

      // 3. Frontend
      React: "Frontend",
      "Next.js": "Frontend",
      "TanStack Start": "Frontend",
      "TanStack Query": "Frontend",
      Flutter: "Frontend",
      "Redux Toolkit": "Frontend",
      "Framer Motion": "Frontend",
      GSAP: "Frontend",
      Recharts: "Frontend",
      "Tailwind CSS": "Frontend",
      "Jetpack Compose": "Frontend",
      HTML5: "Frontend",
      CSS3: "Frontend",
      Leaflet: "Frontend",

      // 4. Databases
      PostgreSQL: "Databases",
      MySQL: "Databases",
      Supabase: "Databases",
      pgvector: "Databases",
      Redis: "Databases",
      SQLite: "Databases",
      DynamoDB: "Databases",
      Room: "Databases",
      SQLCipher: "Databases",
      PostGIS: "Databases",
      Firestore: "Databases",

      // 5. Tools
      Git: "Tools",
      Linux: "Tools",
      Jira: "Tools",
      Biome: "Tools",
      PNPM: "Tools",
      Turborepo: "Tools",
      Vite: "Tools",
      Obsidian: "Tools",
      Hardhat: "Tools",
      "The Graph": "Tools",
      "Discord Webhooks": "Tools",
      "Cloud Storage": "Tools",
      "Cloud Pub/Sub": "Tools",
      "Telegram Bot": "Tools",
      "Cloudflare Tunnel": "Tools",

      // 6. DevOps
      Docker: "DevOps",
      "Docker Compose": "DevOps",
      "Google Cloud": "DevOps",
      GCP: "DevOps",
      AWS: "DevOps",
      Cloudflare: "DevOps",
      Vercel: "DevOps",
      "Oracle Cloud": "DevOps",
      "GitHub Actions": "DevOps",
      TRON: "DevOps",
      OAuth: "DevOps",
      "AWS Amplify": "DevOps",
      Stripe: "DevOps",
      "Sui SDK": "DevOps",
      zkLogin: "DevOps",
      "Oasis ROFL": "DevOps",
      Atlas: "DevOps",
      Blnk: "DevOps",
      Viem: "DevOps",

      // 7. AI & Intelligence
      Ollama: "AI & Intelligence",
      Gemini: "AI & Intelligence",
      OpenCV: "AI & Intelligence",
      LangChain: "AI & Intelligence",
      "Vertex AI": "AI & Intelligence",
      "Amazon Bedrock": "AI & Intelligence",
      "Amazon Comprehend": "AI & Intelligence",
      "Amazon Translate": "AI & Intelligence",
      "Amazon Transcribe": "AI & Intelligence",
      "Amazon Polly": "AI & Intelligence",
      BERT: "AI & Intelligence",
      PyTorch: "AI & Intelligence",
      "Hugging Face Transformers": "AI & Intelligence",
      "ILMU-GLM-5.1": "AI & Intelligence",
      "Whisper.cpp": "AI & Intelligence",
      "GLM-OCR": "AI & Intelligence",
      "ML Kit OCR": "AI & Intelligence",

      // 8. Quality & Testing
      Vitest: "Quality & Testing",
      "Biometric Auth": "Quality & Testing",
      Postman: "Quality & Testing",
    };

    const uniqueDomains = new Set<string>([
      "Programming Languages",
      "Backend",
      "Frontend",
      "Databases",
      "Tools",
      "DevOps",
      "AI & Intelligence",
      "Quality & Testing",
    ]);
    const uniqueTech = new Set<string>(Object.keys(techToCategoryMap));
    const connections = new Set<string>(); // "source-target" string set

    Object.entries(techToCategoryMap).forEach(([tech, cat]) => {
      connections.add(`${tech}::${cat}`);
    });

    // Count links for scaling node sizes
    const linkCounts = new Map<string, number>();
    connections.forEach((conn) => {
      const [tech, domain] = conn.split("::");
      linkCounts.set(tech, (linkCounts.get(tech) || 0) + 1);
      linkCounts.set(domain, (linkCounts.get(domain) || 0) + 1);
    });

    // Construct nodes
    const nodeList: D3Node[] = [
      ...Array.from(uniqueDomains).map((d) => ({
        id: d,
        name: d,
        type: "domain" as const,
        linkCount: linkCounts.get(d) || 0,
      })),
      ...Array.from(uniqueTech).map((t) => ({
        id: t,
        name: t,
        type: "technology" as const,
        linkCount: linkCounts.get(t) || 0,
      })),
    ];

    // Construct links
    const linkList: D3Link[] = Array.from(connections).map((conn) => {
      const [tech, domain] = conn.split("::");
      return {
        source: tech,
        target: domain,
      };
    });

    return {
      nodes: nodeList,
      links: linkList,
      domains: Array.from(uniqueDomains).sort(),
      technologies: Array.from(uniqueTech).sort(),
      techMap: techToCategoryMap,
    };
  }, []);

  // 2. D3 force simulation layout
  const [simulationNodes, setSimulationNodes] = useState<D3Node[]>([]);
  const [simulationLinks, setSimulationLinks] = useState<D3Link[]>([]);
  const simulationRef = useRef<d3Force.Simulation<D3Node, D3Link> | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: _simKey intentionally used as restart trigger
  useEffect(() => {
    if (nodes.length === 0 || viewMode !== "graph") return;

    // Create fresh copies of nodes and links
    const d3Nodes: D3Node[] = nodes.map((n) => ({ ...n }));
    const d3Links: D3Link[] = links.map((l) => ({ ...l }));

    // Setup force simulation
    const simulation = d3Force
      .forceSimulation<D3Node>(d3Nodes)
      .force(
        "link",
        d3Force
          .forceLink<D3Node, D3Link>(d3Links)
          .id((d) => d.id)
          .distance((d) => {
            const s = d.source as D3Node;
            const t = d.target as D3Node;
            const sourceCount = s?.linkCount || 1;
            const targetCount = t?.linkCount || 1;
            return 80 + Math.min(sourceCount, targetCount) * 10;
          }),
      )
      .force("charge", d3Force.forceManyBody().strength(-220))
      .force("x", d3Force.forceX(0).strength(0.06))
      .force("y", d3Force.forceY(0).strength(0.06))
      .force(
        "collision",
        d3Force.forceCollide<D3Node>().radius((d) => {
          const baseRadius = d.type === "domain" ? 24 : 14;
          return baseRadius + Math.sqrt(d.linkCount) * 3 + 12;
        }),
      );

    simulationRef.current = simulation;

    // Run active updates on tick
    simulation.on("tick", () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        d3Nodes.forEach((node) => {
          const radius = node.type === "domain" ? 30 : 18;
          const padX = w / 2 - radius;
          const padY = h / 2 - radius;

          if (node.x !== undefined && node.y !== undefined) {
            // Clamp X and bounce
            if (node.x < -padX) {
              node.x = -padX;
              if (node.vx !== undefined) node.vx = Math.abs(node.vx) * 0.5;
            } else if (node.x > padX) {
              node.x = padX;
              if (node.vx !== undefined) node.vx = -Math.abs(node.vx) * 0.5;
            }

            // Clamp Y and bounce
            if (node.y < -padY) {
              node.y = -padY;
              if (node.vy !== undefined) node.vy = Math.abs(node.vy) * 0.5;
            } else if (node.y > padY) {
              node.y = padY;
              if (node.vy !== undefined) node.vy = -Math.abs(node.vy) * 0.5;
            }
          }
        });
      }
      setSimulationNodes([...d3Nodes]);
      setSimulationLinks([...d3Links]);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, _simKey, viewMode]);

  // Center the view on load and resize
  useEffect(() => {
    if (viewMode !== "graph" || !svgRef.current) return;

    const handleResize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setPan({ x: rect.width / 2, y: rect.height / 2 });
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Center initially

    return () => window.removeEventListener("resize", handleResize);
  }, [viewMode]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeRef.current && svgRef.current && simulationRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const localX = (e.clientX - rect.left - pan.x) / zoom;
      const localY = (e.clientY - rect.top - pan.y) / zoom;

      const node = draggedNodeRef.current;
      node.fx = localX;
      node.fy = localY;
      hasMovedRef.current = true;

      // Keep the simulation warm and active
      simulationRef.current.alpha(0.3).restart();
    }
  };

  const handleMouseUpOrLeave = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      draggedNodeRef.current = null;

      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0).restart();
      }
    }
  };

  // Helper to find the currently selected node object
  const selectedNode = useMemo(() => {
    if (!selectedSkill) return null;
    return (
      nodes.find((n) => n.id === selectedSkill) || {
        id: selectedSkill,
        name: selectedSkill,
        type: "technology" as const,
        linkCount: 0,
      }
    );
  }, [selectedSkill, nodes]);

  // Find linked projects — for domain nodes, find projects that contain any tech in that domain
  const activeProjects = useMemo(() => {
    if (!selectedNode) return [];
    if (selectedNode.type === "domain") {
      // Collect all canonical tech names that belong to this domain
      const domainTechs = new Set(
        Object.entries(techMap)
          .filter(([, cat]) => cat === selectedNode.id)
          .map(([tech]) => tech),
      );
      // Also check p.domains directly (for projects that categorise themselves under this domain)
      return PROJECTS.filter(
        (p) =>
          p.domains.includes(selectedNode.id) || p.technologies.some((t) => domainTechs.has(t)),
      );
    }
    return PROJECTS.filter((p) => p.technologies.includes(selectedNode.id));
  }, [selectedNode, techMap, PROJECTS]);

  // Helper to retrieve technologies under the selected domain — derive dynamically from techMap
  const selectedDomainTechs = useMemo(() => {
    if (!selectedNode || selectedNode.type !== "domain") return [];
    return Object.entries(techMap)
      .filter(([, cat]) => cat === selectedNode.id)
      .map(([tech]) => tech)
      .sort();
  }, [selectedNode, techMap]);

  const handleNodeDragStart = (e: React.MouseEvent, node: D3Node) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    draggedNodeRef.current = node;
    node.fx = node.x;
    node.fy = node.y;
    hasMovedRef.current = false;

    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(3, z * 1.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z / 1.15));
  const handleReset = () => {
    setZoom(1);
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
    }
    onSelectSkill(null);
  };

  // Node highlighting and dimming logic
  const isNodeDimmed = (nodeId: string) => {
    const activeSkill = selectedSkill;
    const hoverSkill = hoveredNodeId;

    if (activeSkill && activeSkill !== nodeId) {
      // Check if they are connected
      const isConnected = links.some((l) => {
        const sId = typeof l.source === "string" ? l.source : l.source.id;
        const tId = typeof l.target === "string" ? l.target : l.target.id;
        return (sId === activeSkill && tId === nodeId) || (tId === activeSkill && sId === nodeId);
      });
      if (!isConnected) return true;
    }

    if (hoverSkill && hoverSkill !== nodeId) {
      const isConnected = links.some((l) => {
        const sId = typeof l.source === "string" ? l.source : l.source.id;
        const tId = typeof l.target === "string" ? l.target : l.target.id;
        return (sId === hoverSkill && tId === nodeId) || (tId === hoverSkill && sId === nodeId);
      });
      if (!isConnected) return true;
    }

    return false;
  };

  const isLinkActive = (link: D3Link) => {
    const sId = typeof link.source === "string" ? link.source : link.source.id;
    const tId = typeof link.target === "string" ? link.target : link.target.id;

    const highlightId = hoveredNodeId || selectedSkill;
    if (highlightId) {
      return sId === highlightId || tId === highlightId;
    }
    return false;
  };

  // Categorize technologies for the traditional list view — derived dynamically from techMap so it's always in sync
  const categorizedSkills = useMemo(() => {
    const order = [
      "Programming Languages",
      "Backend",
      "Frontend",
      "Databases",
      "Tools",
      "DevOps",
      "AI & Intelligence",
      "Quality & Testing",
    ];
    const buckets: Record<string, string[]> = {};
    order.forEach((cat) => {
      buckets[cat] = [];
    });
    Object.entries(techMap).forEach(([tech, cat]) => {
      if (buckets[cat]) buckets[cat].push(tech);
    });
    return order.map((catName) => ({
      name: catName,
      items: buckets[catName].sort(),
    }));
  }, [techMap]);

  const renderDetailsCard = () => {
    if (!selectedNode) return null;

    return (
      <div className="flex flex-col space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight truncate">
              {selectedNode.name}
            </h4>
            <button
              type="button"
              onClick={() => onSelectSkill(null)}
              className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:underline cursor-pointer"
            >
              [Clear]
            </button>
          </div>
          <span className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mt-0.5">
            {selectedNode.type === "domain" ? "Skill Domain" : "Technology / Skill"}
          </span>
        </div>

        {selectedNode.type === "domain" && selectedDomainTechs.length > 0 && (
          <div className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-900/60 pt-2 max-h-[80px] overflow-y-auto pr-1">
            <span className="font-bold text-neutral-800 dark:text-neutral-200">Technologies:</span>{" "}
            {selectedDomainTechs.join(", ")}
          </div>
        )}

        <div className="border-t border-neutral-100 dark:border-neutral-900/60 pt-3 flex-1 flex flex-col min-h-0">
          <span className="text-[10px] font-mono font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-2">
            Linked Projects ({activeProjects.length})
          </span>
          {activeProjects.length === 0 ? (
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 italic">
              No projects listed for this skill.
            </p>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-[160px] pr-1">
              {activeProjects.map((proj) => (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => {
                    if (onRouteToProject) {
                      onRouteToProject(proj.id);
                    }
                  }}
                  className="w-full text-left text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-between gap-2 cursor-pointer py-1 group"
                >
                  <span className="truncate">{proj.title}</span>
                  <span className="text-[9px] text-neutral-400 dark:text-neutral-600 shrink-0 font-mono font-normal group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="w-full relative border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-xl shadow-sm flex flex-col min-h-[500px]"
    >
      {/* Control bar */}
      <header className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3 justify-between items-center bg-neutral-50 dark:bg-neutral-900/50 rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <Network className="text-neutral-700 dark:text-neutral-300 animate-pulse" size={20} />
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Skills Map
            </h3>
            <p className="text-xs text-neutral-500">
              {domains.length} domains • {technologies.length} technologies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle view mode */}
          <div className="flex bg-neutral-200/60 dark:bg-neutral-800/70 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "graph"
                  ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              <Network size={14} />
              Graph View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              <List size={14} />
              List View
            </button>
          </div>

          {viewMode === "graph" && (
            <button
              type="button"
              onClick={() => setSimKey((k) => k + 1)}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
              title="Recalculate Force"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Main graph viewport / list */}
      <div className="flex-1 min-h-0 relative bg-neutral-50/50 dark:bg-neutral-950/20 rounded-b-xl">
        {viewMode === "graph" ? (
          <div
            className="w-full h-[450px] sm:h-[500px] relative overflow-hidden select-none"
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            <svg ref={svgRef} className="w-full h-full">
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Connection lines */}
                <g>
                  {simulationLinks.map((link, idx) => {
                    const s = link.source as D3Node;
                    const t = link.target as D3Node;
                    if (!s || !t || s.x === undefined || t.x === undefined) return null;
                    const isActive = isLinkActive(link);
                    const isDimmed = isNodeDimmed(s.id) || isNodeDimmed(t.id);

                    return (
                      <line
                        key={`link-${s.id}-${t.id}-${idx}`}
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke={isActive ? "#3b82f6" : "#d4d4d8"}
                        strokeWidth={isActive ? 2 : 1}
                        strokeOpacity={isDimmed && !isActive ? 0.08 : isActive ? 0.8 : 0.25}
                        className="transition-all duration-300 dark:stroke-neutral-800"
                      />
                    );
                  })}
                </g>

                {/* Nodes */}
                <g>
                  {simulationNodes.map((node) => {
                    if (node.x === undefined || node.y === undefined) return null;
                    const isSelected = node.id === selectedSkill;
                    const isDimmed = isNodeDimmed(node.id);
                    const radius =
                      node.type === "domain"
                        ? 22 + Math.sqrt(node.linkCount) * 2
                        : 10 + Math.sqrt(node.linkCount) * 1.5;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onMouseDown={(e) => handleNodeDragStart(e, node)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasMovedRef.current) return;
                          onSelectSkill(isSelected ? null : node.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            if (hasMovedRef.current) return;
                            onSelectSkill(isSelected ? null : node.id);
                          }
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        tabIndex={0}
                        className="cursor-grab active:cursor-grabbing select-none group outline-none"
                      >
                        {/* Selected halo */}
                        {isSelected && (
                          <circle
                            r={radius + 6}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={1.5}
                            strokeDasharray="3 2"
                            className="animate-[spin_20s_linear_infinite]"
                          />
                        )}

                        {/* Outer interactive circle */}
                        <circle
                          r={radius + 3}
                          fill="transparent"
                          className="group-hover:stroke-neutral-200 dark:group-hover:stroke-neutral-800 transition-colors duration-200"
                          strokeWidth={1}
                        />

                        {/* Core circle */}
                        <circle
                          r={radius}
                          fill={node.type === "domain" ? "#3b82f6" : "#22c55e"}
                          fillOpacity={isDimmed ? 0.15 : isSelected ? 0.95 : 0.75}
                          className="transition-all duration-300"
                        />

                        {/* Core text label */}
                        <text
                          dy=".31em"
                          textAnchor="middle"
                          fontSize={node.type === "domain" ? "10px" : "8px"}
                          fontWeight={node.type === "domain" ? "bold" : "normal"}
                          fill={isDimmed ? "#a3a3a3" : "#171717"}
                          fillOpacity={isDimmed ? 0.25 : 0.9}
                          className="select-none pointer-events-none dark:fill-white font-sans transition-all duration-300"
                        >
                          {node.name}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </g>
            </svg>

            {/* Float controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
              <button
                type="button"
                onClick={handleZoomIn}
                className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shadow-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shadow-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shadow-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                title="Reset zoom"
              >
                <Maximize size={13} />
              </button>
            </div>

            {/* Legend (Bottom-Left) */}
            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-neutral-950/95 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 shadow-md text-[10px] space-y-2 z-10 select-none font-mono">
              <span className="font-bold text-neutral-800 dark:text-neutral-200 block border-b border-neutral-200 dark:border-neutral-800 pb-1 uppercase tracking-wider">
                Graph Legend
              </span>
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                <span>Domain</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                <span>Technology</span>
              </div>
            </div>
          </div>
        ) : (
          // List view: full scroll within a bounded container
          <div className="max-h-[540px] overflow-y-auto">
            <div className="flex flex-col md:flex-row gap-6 p-6">
              {/* On mobile, show the card ABOVE the grid so user never has to scroll past all categories */}
              {selectedNode && (
                <div className="md:hidden w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-4 border-t-2 border-t-blue-500">
                  {renderDetailsCard()}
                </div>
              )}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 select-text">
                {categorizedSkills.map((category) => (
                  <div key={category.name} className="space-y-3">
                    <h4 className="text-xs font-bold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-mono border-b border-neutral-100 dark:border-neutral-900 pb-2">
                      {category.name}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {category.items.map((item) => {
                        const isSelected = item === selectedSkill;
                        return (
                          <button
                            key={item}
                            type="button"
                            onMouseEnter={() => setHoveredNodeId(item)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            onClick={() => onSelectSkill(isSelected ? null : item)}
                            className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-400 text-blue-600 dark:text-blue-400 font-bold animate-pulse"
                                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600"
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {/* On desktop: sticky card that pins to the top of the scroll container */}
              {selectedNode && (
                <div className="hidden md:block w-72 shrink-0 sticky top-4 self-start bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-4 border-t-2 border-t-blue-500">
                  {renderDetailsCard()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stationary Details Card in Graph View — fixed to centre of viewport so it's always readable */}
        {viewMode === "graph" && selectedNode && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            aria-modal="false"
          >
            {/* Translucent backdrop to help the card stand out against any node */}
            <button
              type="button"
              className="absolute inset-0 bg-black/10 dark:bg-black/30 pointer-events-auto cursor-default"
              onClick={() => onSelectSkill(null)}
              aria-label="Close details"
            />
            <div className="relative w-80 max-w-[92vw] pointer-events-auto bg-white/98 dark:bg-neutral-950/98 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-5 backdrop-blur-md border-t-2 border-t-blue-500">
              {renderDetailsCard()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
