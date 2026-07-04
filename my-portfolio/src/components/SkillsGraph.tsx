import * as d3Force from 'd3-force';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Network, RefreshCw, ZoomIn, ZoomOut, Maximize, List } from 'lucide-react';

interface D3Node extends d3Force.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'domain' | 'technology';
  linkCount: number;
}

interface D3Link extends d3Force.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
}

interface SkillsGraphProps {
  selectedSkill: string | null;
  onSelectSkill: (skill: string | null) => void;
}

export function SkillsGraph({ selectedSkill, onSelectSkill }: SkillsGraphProps) {
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Pan & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [simKey, setSimKey] = useState(0);

  // Dragging state for node
  const draggedNodeRef = useRef<D3Node | null>(null);
  const hasMovedRef = useRef(false);

  // 1. Group domains as the eight main categories, and map all 45 technologies
  const { nodes, links, domains, technologies } = useMemo(() => {
    const techToCategoryMap: Record<string, string> = {
      // 1. Programming Languages
      TypeScript: 'Programming Languages',
      Golang: 'Programming Languages',
      Dart: 'Programming Languages',
      Python: 'Programming Languages',
      Java: 'Programming Languages',
      R: 'Programming Languages',
      Solidity: 'Programming Languages',

      // 2. Backend
      NodeJS: 'Backend',
      HonoJS: 'Backend',
      Keycloak: 'Backend',
      'Drizzle ORM': 'Backend',

      // 3. Frontend
      ReactJS: 'Frontend',
      NextJS: 'Frontend',
      'TanStack Start': 'Frontend',
      'React Native Expo': 'Frontend',
      Flutter: 'Frontend',

      // 4. Databases
      PostgreSQL: 'Databases',
      MySQL: 'Databases',
      Supabase: 'Databases',
      pgvector: 'Databases',
      Redis: 'Databases',
      SQLite: 'Databases',

      // 5. Tools
      Git: 'Tools',
      Linux: 'Tools',
      WSL: 'Tools',
      Jira: 'Tools',
      Biome: 'Tools',
      Bun: 'Tools',
      PNPM: 'Tools',
      Turborepo: 'Tools',

      // 6. DevOps
      Docker: 'DevOps',
      Contabo: 'DevOps',
      'Google Cloud': 'DevOps',
      AWS: 'DevOps',
      Cloudflare: 'DevOps',
      Vercel: 'DevOps',
      'Oracle Cloud': 'DevOps',
      'GitHub Actions': 'DevOps',

      // 7. AI & Intelligence
      Ollama: 'AI & Intelligence',
      Gemini: 'AI & Intelligence',
      OpenCV: 'AI & Intelligence',
      LangChain: 'AI & Intelligence',

      // 8. Quality & Testing
      Vitest: 'Quality & Testing',
      'Testing Library': 'Quality & Testing',
      Postman: 'Quality & Testing'
    };

    const uniqueDomains = new Set<string>([
      'Programming Languages',
      'Backend',
      'Frontend',
      'Databases',
      'Tools',
      'DevOps',
      'AI & Intelligence',
      'Quality & Testing'
    ]);
    const uniqueTech = new Set<string>(Object.keys(techToCategoryMap));
    const connections = new Set<string>(); // "source-target" string set

    Object.entries(techToCategoryMap).forEach(([tech, cat]) => {
      connections.add(`${tech}::${cat}`);
    });

    // Count links for scaling node sizes
    const linkCounts = new Map<string, number>();
    connections.forEach(conn => {
      const [tech, domain] = conn.split('::');
      linkCounts.set(tech, (linkCounts.get(tech) || 0) + 1);
      linkCounts.set(domain, (linkCounts.get(domain) || 0) + 1);
    });

    // Construct nodes
    const nodeList: D3Node[] = [
      ...Array.from(uniqueDomains).map(d => ({
        id: d,
        name: d,
        type: 'domain' as const,
        linkCount: linkCounts.get(d) || 0
      })),
      ...Array.from(uniqueTech).map(t => ({
        id: t,
        name: t,
        type: 'technology' as const,
        linkCount: linkCounts.get(t) || 0
      }))
    ];

    // Construct links
    const linkList: D3Link[] = Array.from(connections).map(conn => {
      const [tech, domain] = conn.split('::');
      return {
        source: tech,
        target: domain
      };
    });

    return {
      nodes: nodeList,
      links: linkList,
      domains: Array.from(uniqueDomains).sort(),
      technologies: Array.from(uniqueTech).sort()
    };
  }, []);

  // 2. D3 force simulation layout
  const [simulationNodes, setSimulationNodes] = useState<D3Node[]>([]);
  const [simulationLinks, setSimulationLinks] = useState<D3Link[]>([]);
  const simulationRef = useRef<d3Force.Simulation<D3Node, D3Link> | null>(null);

  useEffect(() => {
    if (nodes.length === 0 || viewMode !== 'graph') return;

    // Create fresh copies of nodes and links
    const d3Nodes: D3Node[] = nodes.map(n => ({ ...n }));
    const d3Links: D3Link[] = links.map(l => ({ ...l }));

    // Setup force simulation
    const simulation = d3Force.forceSimulation<D3Node>(d3Nodes)
      .force('link', d3Force.forceLink<D3Node, D3Link>(d3Links)
        .id(d => d.id)
        .distance(d => {
          const s = d.source as D3Node;
          const t = d.target as D3Node;
          const sourceCount = s?.linkCount || 1;
          const targetCount = t?.linkCount || 1;
          return 80 + Math.min(sourceCount, targetCount) * 10;
        })
      )
      .force('charge', d3Force.forceManyBody().strength(-220))
      .force('x', d3Force.forceX(0).strength(0.06))
      .force('y', d3Force.forceY(0).strength(0.06))
      .force('collision', d3Force.forceCollide<D3Node>().radius(d => {
        const baseRadius = d.type === 'domain' ? 24 : 14;
        return baseRadius + Math.sqrt(d.linkCount) * 3 + 12;
      }));

    simulationRef.current = simulation;

    // Run active updates on tick
    simulation.on('tick', () => {
      setSimulationNodes([...d3Nodes]);
      setSimulationLinks([...d3Links]);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, simKey, viewMode]);

  // Center the view on load and resize
  useEffect(() => {
    if (viewMode !== 'graph' || !svgRef.current) return;
    
    const handleResize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setPan({ x: rect.width / 2, y: rect.height / 2 });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Center initially
    
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

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

  // Helper to find the currently hovered node object
  const hoveredNode = useMemo(() => {
    if (!hoveredNodeId) return null;
    return nodes.find(n => n.id === hoveredNodeId);
  }, [hoveredNodeId, nodes]);

  // Helper to retrieve technologies under the hovered domain
  const hoveredDomainTechs = useMemo(() => {
    if (!hoveredNode || hoveredNode.type !== 'domain') return [];
    const categories = {
      'Programming Languages': ['TypeScript', 'Golang', 'Dart', 'Python', 'Java', 'R', 'Solidity'],
      'Backend': ['NodeJS', 'HonoJS', 'Keycloak', 'Drizzle ORM'],
      'Frontend': ['ReactJS', 'NextJS', 'TanStack Start', 'React Native Expo', 'Flutter'],
      'Databases': ['PostgreSQL', 'MySQL', 'Supabase', 'pgvector', 'Redis', 'SQLite'],
      'Tools': ['Git', 'Linux', 'WSL', 'Jira', 'Biome', 'Bun', 'PNPM', 'Turborepo'],
      'DevOps': ['Docker', 'Contabo', 'Google Cloud', 'AWS', 'Cloudflare', 'Vercel', 'Oracle Cloud', 'GitHub Actions'],
      'AI & Intelligence': ['Ollama', 'Gemini', 'OpenCV', 'LangChain'],
      'Quality & Testing': ['Vitest', 'Testing Library', 'Postman']
    };
    return categories[hoveredNode.name as keyof typeof categories] || [];
  }, [hoveredNode]);

  // Compute position coordinates for tooltip, preventing right/bottom clipping
  const tooltipStyle = useMemo(() => {
    if (!hoveredNode || hoveredNode.type !== 'domain' || !containerRef.current) return {};

    const tooltipWidth = 280;
    const tooltipHeight = 160; // Estimated height based on content
    const rect = containerRef.current.getBoundingClientRect();
    
    let left = mousePos.x + 15;
    let top = mousePos.y + 15;

    // Check right edge
    if (left + tooltipWidth > rect.width) {
      left = mousePos.x - tooltipWidth - 15;
    }

    // Check bottom edge
    if (top + tooltipHeight > rect.height) {
      top = mousePos.y - tooltipHeight - 15;
    }

    // Lower bound safeguards
    left = Math.max(10, left);
    top = Math.max(10, top);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${tooltipWidth}px`,
    };
  }, [hoveredNode, mousePos]);

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


  const handleZoomIn = () => setZoom(z => Math.min(3, z * 1.15));
  const handleZoomOut = () => setZoom(z => Math.max(0.4, z / 1.15));
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
      const isConnected = links.some(l => {
        const sId = typeof l.source === 'string' ? l.source : l.source.id;
        const tId = typeof l.target === 'string' ? l.target : l.target.id;
        return (sId === activeSkill && tId === nodeId) || (tId === activeSkill && sId === nodeId);
      });
      if (!isConnected) return true;
    }

    if (hoverSkill && hoverSkill !== nodeId) {
      const isConnected = links.some(l => {
        const sId = typeof l.source === 'string' ? l.source : l.source.id;
        const tId = typeof l.target === 'string' ? l.target : l.target.id;
        return (sId === hoverSkill && tId === nodeId) || (tId === hoverSkill && sId === nodeId);
      });
      if (!isConnected) return true;
    }

    return false;
  };

  const isLinkActive = (link: D3Link) => {
    const sId = typeof link.source === 'string' ? link.source : link.source.id;
    const tId = typeof link.target === 'string' ? link.target : link.target.id;

    const highlightId = hoveredNodeId || selectedSkill;
    if (highlightId) {
      return sId === highlightId || tId === highlightId;
    }
    return false;
  };

  // Categorize technologies for the traditional list view
  const categorizedSkills = useMemo(() => {
    const categories = {
      'Programming Languages': ['TypeScript', 'Golang', 'Dart', 'Python', 'Java', 'R', 'Solidity'],
      'Backend': ['NodeJS', 'HonoJS', 'Keycloak', 'Drizzle ORM'],
      'Frontend': ['ReactJS', 'NextJS', 'TanStack Start', 'React Native Expo', 'Flutter'],
      'Databases': ['PostgreSQL', 'MySQL', 'Supabase', 'pgvector', 'Redis', 'SQLite'],
      'Tools': ['Git', 'Linux', 'WSL', 'Jira', 'Biome', 'Bun', 'PNPM', 'Turborepo'],
      'DevOps': ['Docker', 'Contabo', 'Google Cloud', 'AWS', 'Cloudflare', 'Vercel', 'Oracle Cloud', 'GitHub Actions'],
      'AI & Intelligence': ['Ollama', 'Gemini', 'OpenCV', 'LangChain'],
      'Quality & Testing': ['Vitest', 'Testing Library', 'Postman']
    };

    return Object.entries(categories).map(([catName, techList]) => {
      return {
        name: catName,
        items: techList
      };
    });
  }, []);

  return (
    <div className="w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
      {/* Control bar */}
      <header className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3 justify-between items-center bg-neutral-50 dark:bg-neutral-900/50">
        <div className="flex items-center gap-2.5">
          <Network className="text-neutral-700 dark:text-neutral-300 animate-pulse" size={20} />
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Skills Map</h3>
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
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'graph'
                  ? 'bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <Network size={14} />
              Graph View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <List size={14} />
              List View
            </button>
          </div>

          {viewMode === 'graph' && (
            <button
              type="button"
              onClick={() => setSimKey(k => k + 1)}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
              title="Recalculate Force"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Main graph viewport / list */}
      <div className="flex-1 min-h-0 relative bg-neutral-50/50 dark:bg-neutral-950/20">
        {viewMode === 'graph' ? (
          <div
            ref={containerRef}
            className="w-full h-[450px] sm:h-[500px] relative overflow-hidden select-none"
            onMouseMove={handleMouseMove}
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
                        stroke={isActive ? '#3b82f6' : '#d4d4d8'}
                        strokeWidth={isActive ? 2 : 1}
                        strokeOpacity={isDimmed && !isActive ? 0.08 : isActive ? 0.8 : 0.25}
                        className="transition-all duration-300 dark:stroke-neutral-800"
                      />
                    );
                  })}
                </g>

                {/* Nodes */}
                <g>
                  {simulationNodes.map(node => {
                    if (node.x === undefined || node.y === undefined) return null;
                    const isSelected = node.id === selectedSkill;
                    const isDimmed = isNodeDimmed(node.id);
                    const radius = node.type === 'domain' 
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
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        className="cursor-grab active:cursor-grabbing select-none group outline-none"
                      >
                        {/* Selected halo */}
                        {isSelected && (
                          <circle
                            r={radius + 6}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="4,2"
                            className="animate-spin"
                            style={{ transformOrigin: '0px 0px', animationDuration: '20s' }}
                          />
                        )}

                        {/* Node circle */}
                        <circle
                          r={radius}
                          fill={node.type === 'domain' ? '#3b82f6' : '#22c55e'}
                          stroke={isSelected ? '#ffffff' : 'transparent'}
                          strokeWidth={2}
                          opacity={isDimmed ? 0.15 : 1}
                          className="transition-all duration-200 group-hover:scale-105 shadow-sm"
                        />

                        {/* Label text */}
                        <text
                          dy=".35em"
                          x={node.type === 'domain' ? 0 : radius + 6}
                          textAnchor={node.type === 'domain' ? 'middle' : 'start'}
                          fill={isSelected ? '#3b82f6' : '#171717'}
                          fontSize={node.type === 'domain' ? '12px' : '9.5px'}
                          fontWeight={node.type === 'domain' || isSelected ? 'bold' : 'normal'}
                          className="pointer-events-none select-none dark:fill-neutral-300 font-mono"
                          opacity={isDimmed ? 0.08 : isSelected || hoveredNodeId === node.id ? 1 : 0.8}
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

            {/* Hover Tooltip for Domain Nodes */}
            {hoveredNode && hoveredNode.type === 'domain' && (
              <div
                style={tooltipStyle}
                className="absolute z-30 pointer-events-none p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md shadow-lg text-center font-sans space-y-2"
              >
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {hoveredNode.name}
                  </h4>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5">
                    Skill Domain
                  </p>
                </div>
                <div className="border-t border-neutral-100 dark:border-neutral-900 my-2" />
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">Technologies:</span>{' '}
                  {hoveredDomainTechs.join(', ')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 select-text">
            {categorizedSkills.map(category => (
              <div key={category.name} className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest font-mono border-b border-neutral-100 dark:border-neutral-900 pb-2">
                  {category.name}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {category.items.map(item => {
                    const isSelected = item === selectedSkill;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => onSelectSkill(isSelected ? null : item)}
                        className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-400 text-blue-600 dark:text-blue-400 font-bold'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600'
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
        )}
      </div>
    </div>
  );
}

