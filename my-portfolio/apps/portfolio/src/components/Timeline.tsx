import { Award, Briefcase, Calendar, ChevronDown, GraduationCap, Laptop } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
interface UnifiedTimelineItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  outcome?: string;
  description: string;
  achievements?: string[];
  category: "hackathon" | "education" | "internship" | "other";
  technologies: string[];
  sortKey: number;
}

interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
  achievements: string[];
  domains: string[];
  technologies: string[];
  sortKey: number;
}

interface TimelineEvent {
  id: string;
  title: string;
  event: string;
  date: string;
  role: string;
  outcome?: string;
  description: string;
  category: "hackathon" | "other";
  featured: boolean;
  technologies: string[];
  sortKey: number;
}

interface TimelineProps {
  experiences: Experience[];
  events: TimelineEvent[];
  focusRequest?: { id: string; requestId: number } | null;
}

const FILTER_OPTIONS: { id: "edu-work" | "hackathon"; label: string }[] = [
  { id: "edu-work", label: "Education & Work" },
  { id: "hackathon", label: "Hackathons" },
];

export function Timeline({
  experiences: EXPERIENCES,
  events: EVENTS,
  focusRequest = null,
}: TimelineProps) {
  const [activeFilter, setActiveFilter] = useState<"edu-work" | "hackathon">("edu-work");
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const handledFocusRequestIdRef = useRef(0);

  // Unified items list
  const unifiedItems = useMemo((): UnifiedTimelineItem[] => {
    const list: UnifiedTimelineItem[] = [];

    // Map experiences
    EXPERIENCES.forEach((exp) => {
      list.push({
        id: exp.id,
        title: exp.role,
        subtitle: exp.company,
        date: exp.period,
        description: exp.description,
        achievements: exp.achievements,
        category: exp.id.startsWith("edu-") ? "education" : "internship",
        technologies: exp.technologies,
        sortKey: exp.sortKey,
      });
    });

    // Map events
    EVENTS.forEach((evt) => {
      list.push({
        id: evt.id,
        title: evt.title,
        subtitle: evt.event,
        date: evt.date,
        outcome: evt.outcome,
        description: evt.description,
        category: evt.category,
        technologies: evt.technologies,
        sortKey: evt.sortKey,
      });
    });

    // Sort newest first
    return list.sort((a, b) => b.sortKey - a.sortKey);
  }, [EXPERIENCES, EVENTS]);

  // Filter items
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      if (activeFilter === "hackathon") return item.category === "hackathon";
      if (activeFilter === "edu-work")
        return item.category === "education" || item.category === "internship";
      return false;
    });
  }, [unifiedItems, activeFilter]);

  useEffect(() => {
    if (focusRequest && focusRequest.requestId !== handledFocusRequestIdRef.current) return;
    if (filteredItems.length > 0) {
      setExpandedTimelineId(filteredItems[0].id);
    } else {
      setExpandedTimelineId(null);
    }
  }, [filteredItems, focusRequest]);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.requestId === handledFocusRequestIdRef.current) return;

    const target = unifiedItems.find((item) => item.id === focusRequest.id);
    if (!target) return;

    setActiveFilter(target.category === "hackathon" ? "hackathon" : "edu-work");
  }, [focusRequest, unifiedItems]);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.requestId === handledFocusRequestIdRef.current) return;

    const target = filteredItems.find((item) => item.id === focusRequest.id);
    if (!target) return;

    setExpandedTimelineId(target.id);
    handledFocusRequestIdRef.current = focusRequest.requestId;
    const timer = window.setTimeout(() => {
      document.getElementById(target.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [filteredItems, focusRequest]);

  const toggleItem = (itemId: string) => {
    setExpandedTimelineId((prev) => (prev === itemId ? null : itemId));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "internship":
        return <Briefcase size={16} className="text-blue-500" />;
      case "education":
        return <GraduationCap size={16} className="text-purple-500" />;
      case "hackathon":
        return <Award size={16} className="text-green-500" />;
      default:
        return <Laptop size={16} className="text-amber-500" />;
    }
  };

  return (
    <div className="w-full space-y-12">
      {/* Filter Buttons */}
      <div className="flex flex-wrap justify-center gap-2.5">
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={`text-xs px-4 py-2 rounded-full border transition-all font-mono cursor-pointer ${
              activeFilter === filter.id
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-sm font-semibold"
                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Alternating Timeline */}
      <div className="relative max-w-6xl mx-auto px-4 select-text">
        {/* Central Vertical Line */}
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-800 -translate-x-1/2" />

        <div className="space-y-12 md:space-y-16">
          {filteredItems.length === 0 ? (
            <p className="text-center font-mono text-xs text-neutral-500 py-12">
              No timeline items match this filter.
            </p>
          ) : (
            filteredItems.map((item, index) => {
              const isEven = index % 2 === 0;

              return (
                <div
                  key={item.id}
                  id={item.id}
                  className={`relative flex flex-col md:flex-row items-start scroll-mt-28 ${
                    isEven ? "md:flex-row-reverse" : ""
                  }`}
                >
                  {/* Timeline Dot with Icon */}
                  <div className="absolute left-8 md:left-1/2 top-1.5 -translate-x-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm transition-transform duration-200 hover:scale-110">
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Left / Right Card Spacing wrapper */}
                  <div className="w-full md:w-1/2 pl-16 md:pl-0 md:px-8">
                    {/* Card Container */}
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className="group relative w-full text-left border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 rounded-xl hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 shadow-sm cursor-pointer select-none"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Floating Date Badge */}
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-2">
                            <Calendar size={11} />
                            {item.date}
                          </span>

                          {/* Header details */}
                          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-1 leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                            {item.subtitle}
                          </p>

                          {/* Outcome Badge */}
                          {item.outcome && (
                            <span className="inline-flex items-center mt-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/40">
                              🏆 {item.outcome}
                            </span>
                          )}
                        </div>

                        <ChevronDown
                          size={16}
                          className={`text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-transform duration-300 transform shrink-0 ml-4 mt-1 ${
                            expandedTimelineId === item.id ? "rotate-180" : ""
                          }`}
                        />
                      </div>

                      {/* Collapsible content with smooth height transition */}
                      <div
                        className={`grid transition-all duration-300 ease-in-out ${
                          expandedTimelineId === item.id
                            ? "grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-900"
                            : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden space-y-4 select-text">
                          {/* Description */}
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Bullet Achievements (for Work / Ed) */}
                          {item.achievements && item.achievements.length > 0 && (
                            <ul className="space-y-1.5 pt-1">
                              {item.achievements.map((ach: string, idx: number) => (
                                <li
                                  key={idx}
                                  className="text-[11px] text-neutral-600 dark:text-neutral-400 flex items-start gap-2.5 leading-relaxed"
                                >
                                  <span className="text-neutral-400 select-none">•</span>
                                  <span>{ach}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Tech Tags */}
                          {item.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              <span className="basis-full text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                                Skills &amp; applied domains
                              </span>
                              {item.technologies.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 text-neutral-600 dark:text-neutral-400"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Empty placeholder for grid balancing on desktop */}
                  <div className="hidden md:block w-1/2" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
