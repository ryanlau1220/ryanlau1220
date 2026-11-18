import { List, Network } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  type EventItem,
  type Experience,
  type Project,
  SKILL_CATEGORIES,
  TECHNOLOGY_CATEGORIES,
} from "../data/registry";
import { projectSkills, timelineSkills } from "../data/skill-connections";

const SkillsGlobe = lazy(() => import("./SkillsGlobe"));

interface SkillsGraphProps {
  selectedSkill: string | null;
  onSelectSkill: (skill: string | null) => void;
  onRouteToProject?: (projectId: string) => void;
  onRouteToTimeline?: (timelineId: string) => void;
  projects: Project[];
  experiences: Experience[];
  events: EventItem[];
}

export function SkillsGraph({
  selectedSkill,
  onSelectSkill,
  onRouteToProject,
  onRouteToTimeline,
  projects: PROJECTS,
  experiences: EXPERIENCES,
  events: EVENTS,
}: SkillsGraphProps) {
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");
  const [graphDetailsOpen, setGraphDetailsOpen] = useState(false);
  useEffect(() => {
    if (!graphDetailsOpen) return;
    const initialScrollY = window.scrollY;
    const dismissOnPageScroll = () => {
      if (Math.abs(window.scrollY - initialScrollY) > 24) setGraphDetailsOpen(false);
    };
    window.addEventListener("scroll", dismissOnPageScroll, { passive: true });
    return () => window.removeEventListener("scroll", dismissOnPageScroll);
  }, [graphDetailsOpen]);
  const techMap = TECHNOLOGY_CATEGORIES;
  const technologies = Object.keys(techMap).sort();
  const domains = SKILL_CATEGORIES;
  const nodes = useMemo(
    () => [
      ...SKILL_CATEGORIES.map((name) => ({ id: name, name, type: "domain" as const })),
      ...Object.keys(TECHNOLOGY_CATEGORIES).map((name) => ({
        id: name,
        name,
        type: "technology" as const,
      })),
    ],
    [],
  );

  // Helper to find the currently selected node object
  const selectedNode = useMemo(() => {
    if (!selectedSkill) return null;
    return (
      nodes.find((n) => n.id === selectedSkill) || {
        id: selectedSkill,
        name: selectedSkill,
        type: "technology" as const,
      }
    );
  }, [selectedSkill, nodes]);

  // Find linked projects — for domain nodes, find projects that contain any tech in that domain.
  const activeProjects = useMemo(() => {
    if (!selectedNode) return [];
    if (selectedNode.type === "domain") {
      // Collect all canonical tech names that belong to this domain
      const domainTechs = new Set(
        Object.entries(techMap)
          .filter(([, cat]) => cat === selectedNode.id)
          .map(([tech]) => tech),
      );
      return PROJECTS.filter((project) =>
        projectSkills(project, EVENTS).some((tech) => domainTechs.has(tech)),
      );
    }
    return PROJECTS.filter((p) => projectSkills(p, EVENTS).includes(selectedNode.id));
  }, [selectedNode, PROJECTS, EVENTS]);

  const activeTimelineItems = useMemo(() => {
    if (!selectedNode) return [];
    const domainTechnologies =
      selectedNode.type === "domain"
        ? new Set(
            Object.entries(techMap)
              .filter(([, category]) => category === selectedNode.id)
              .map(([technology]) => technology),
          )
        : null;
    const matches = (technologies: string[]) =>
      domainTechnologies
        ? technologies.some((technology) => domainTechnologies.has(technology))
        : technologies.includes(selectedNode.id);

    return [...EXPERIENCES, ...EVENTS]
      .filter((item) => matches(timelineSkills(item, PROJECTS, EVENTS)))
      .map((item) => ({
        id: item.id,
        title:
          "company" in item ? `${item.role} · ${item.company}` : `${item.title} · ${item.event}`,
      }));
  }, [selectedNode, EXPERIENCES, EVENTS, PROJECTS]);

  // Helper to retrieve technologies under the selected domain — derive dynamically from techMap
  const selectedDomainTechs = useMemo(() => {
    if (selectedNode?.type !== "domain") return [];
    return Object.entries(techMap)
      .filter(([, cat]) => cat === selectedNode.id)
      .map(([tech]) => tech)
      .sort();
  }, [selectedNode]);

  // Categorize technologies for the traditional list view — derived dynamically from techMap so it's always in sync
  const categorizedSkills = useMemo(() => {
    const order = SKILL_CATEGORIES;
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
  }, []);

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
              onClick={() => {
                setGraphDetailsOpen(false);
                onSelectSkill(null);
              }}
              className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:underline cursor-pointer"
            >
              [Clear]
            </button>
          </div>
          <span className="text-[9px] font-mono text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mt-0.5">
            {selectedNode.type === "domain" ? "Skill Domain" : "Technology / Skill"}
          </span>
        </div>

        {selectedNode.type === "domain" && selectedDomainTechs.length > 0 && (
          <div className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-900/60 pt-2 max-h-[80px] overflow-y-auto pr-1">
            <span className="font-bold text-neutral-800 dark:text-neutral-200">Technologies:</span>{" "}
            {selectedDomainTechs.join(", ")}
          </div>
        )}

        {activeProjects.length > 0 && (
          <div className="border-t border-neutral-100 dark:border-neutral-900/60 pt-3 flex-1 flex flex-col min-h-0">
            <span className="text-[10px] font-mono font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-2">
              Linked Projects ({activeProjects.length})
            </span>
            <div className="space-y-1.5 overflow-y-auto max-h-[160px] pr-1">
              {activeProjects.map((proj) => (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => {
                    if (onRouteToProject) {
                      setGraphDetailsOpen(false);
                      onRouteToProject(proj.id);
                    }
                  }}
                  className="w-full text-left text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-between gap-2 cursor-pointer py-1 group"
                >
                  <span className="truncate">{proj.title}</span>
                  <span className="text-[9px] text-neutral-600 dark:text-neutral-400 shrink-0 font-mono font-normal group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTimelineItems.length > 0 && (
          <div className="border-t border-neutral-100 dark:border-neutral-900/60 pt-3">
            <span className="text-[10px] font-mono font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-2">
              Linked Timeline ({activeTimelineItems.length})
            </span>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {activeTimelineItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setGraphDetailsOpen(false);
                    onRouteToTimeline?.(item.id);
                  }}
                  className="w-full text-left text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-between gap-2 cursor-pointer py-1 group"
                >
                  <span className="truncate">{item.title}</span>
                  <span className="text-[9px] text-neutral-600 dark:text-neutral-400 shrink-0 font-mono font-normal group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`w-full relative flex flex-col min-h-[500px] ${viewMode === "list" ? "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-xl shadow-sm" : ""}`}
    >
      {/* Control bar */}
      <header
        className={`px-5 py-4 flex flex-col sm:flex-row gap-3 justify-between items-center ${viewMode === "list" ? "border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 rounded-t-xl" : ""}`}
      >
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
              aria-pressed={viewMode === "graph"}
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
              aria-pressed={viewMode === "list"}
              onClick={() => {
                setGraphDetailsOpen(false);
                setViewMode("list");
              }}
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
        </div>
      </header>

      {/* Main graph viewport / list */}
      <div
        className={`flex-1 min-h-0 relative ${viewMode === "list" ? "bg-neutral-50/50 dark:bg-neutral-950/20 rounded-b-xl" : ""}`}
      >
        {viewMode === "graph" ? (
          <Suspense
            fallback={
              <div className="h-[500px] flex items-center justify-center text-sm text-neutral-500">
                Loading skills globe…
              </div>
            }
          >
            <SkillsGlobe
              selectedSkill={graphDetailsOpen ? selectedSkill : null}
              onSelectSkill={(skill) => {
                setGraphDetailsOpen(skill !== null);
                onSelectSkill(skill);
              }}
              onShowList={() => {
                setGraphDetailsOpen(false);
                setViewMode("list");
              }}
            />
          </Suspense>
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
                    <h4 className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-widest font-mono border-b border-neutral-100 dark:border-neutral-900 pb-2">
                      {category.name}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {category.items.map((item) => {
                        const isSelected = item === selectedSkill;
                        return (
                          <button
                            key={item}
                            type="button"
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
        {viewMode === "graph" && selectedNode && graphDetailsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            {/* Translucent backdrop to help the card stand out against any node */}
            <button
              type="button"
              className="absolute inset-0 bg-black/10 dark:bg-black/30 pointer-events-auto cursor-default"
              onClick={() => {
                setGraphDetailsOpen(false);
                onSelectSkill(null);
              }}
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
