import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Code2,
  Download,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  MapPin,
  Maximize2,
  Pin,
  Phone,
  Play,
  X,
} from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Timeline } from "../components/Timeline";
import { CERTIFICATIONS, EVENTS, EXPERIENCES, PROFILE, PROJECTS } from "../data/registry";

const SkillsGraph = lazy(() =>
  import("../components/SkillsGraph").then((module) => ({ default: module.SkillsGraph })),
);

const PROJECT_IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "apu-asc": { width: 1920, height: 947 },
  openchain: { width: 1920, height: 947 },
  "llm-wiki": { width: 1920, height: 947 },
  ledgertrace: { width: 1920, height: 947 },
  umhackathon: { width: 1279, height: 1079 },
  "myai-future": { width: 1920, height: 947 },
  kitahack: { width: 1618, height: 844 },
  greatmalaysiaai: { width: 1129, height: 559 },
  devmatch: { width: 1920, height: 947 },
  futurehack: { width: 1920, height: 947 },
};

function getProjectPreviewUrl(project: (typeof PROJECTS)[number]) {
  return project.previewImageUrl ?? project.imageUrl?.replace("image.png", "preview.webp");
}

function getMobileProjectPreviewUrl(project: (typeof PROJECTS)[number]) {
  return (
    project.mobilePreviewImageUrl ??
    project.previewImageUrl ??
    project.imageUrl?.replace("image.png", "preview-mobile.webp")
  );
}

export const Route = createFileRoute("/")({
  component: PortfolioHome,
});

function DevelopmentErrorBoundaryTrigger() {
  const isLocalE2ERunner =
    typeof window !== "undefined" &&
    window.location.hostname === "127.0.0.1" &&
    window.location.port === "3100";

  if (
    (import.meta.env.DEV || isLocalE2ERunner) &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("__errorBoundary")
  ) {
    throw new Error("Manually triggered error boundary");
  }

  return null;
}

function PortfolioHome() {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeImage, setActiveImage] = useState<{ src: string; alt: string } | null>(null);
  const [shouldLoadSkills, setShouldLoadSkills] = useState(false);
  const [projectFilter, setProjectFilter] = useState<
    "all" | "pinned" | "open-source" | "hackathon" | "internship"
  >("all");
  const [currentProjectIdx, setCurrentProjectIdx] = useState(0);
  const [timelineFocusRequest, setTimelineFocusRequest] = useState<{
    id: string;
    requestId: number;
  } | null>(null);
  // Guard: when routing to a specific project we set filters + index simultaneously;
  // this ref prevents the filter-change effect from immediately resetting index to 0.
  const skipResetRef = useRef(false);
  const timelineRequestIdRef = useRef(0);
  const skillsSectionRef = useRef<HTMLElement | null>(null);
  const imageCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  // Dynamic numeric pagination pages list
  const paginationPages = useMemo(() => {
    const total = PROJECTS.filter((p) => {
      const matchCat =
        projectFilter === "all" ||
        (projectFilter === "pinned" ? p.pinned : p.category === projectFilter);
      const matchSkill =
        !selectedSkill ||
        p.technologies.some((technology) => technology === selectedSkill) ||
        p.domains.includes(selectedSkill);
      return matchCat && matchSkill;
    }).length; // Match the dynamic filteredProjects length computation below

    const current = currentProjectIdx;

    if (total <= 6) {
      return Array.from({ length: total }, (_, i) => i);
    }

    if (current < 3) {
      return [0, 1, 2, "ellipsis", total - 2, total - 1];
    }

    if (current >= total - 3) {
      return [0, 1, "ellipsis", total - 3, total - 2, total - 1];
    }

    return [0, "ellipsis-left", current, "ellipsis-right", total - 1];
  }, [projectFilter, selectedSkill, currentProjectIdx]);

  const handleRouteToProject = (projectId: string) => {
    // Mark that we are intentionally setting the index; skip the auto-reset effect.
    skipResetRef.current = true;
    setProjectFilter("all");
    setSelectedSkill(null);
    const idx = PROJECTS.findIndex((p) => p.id === projectId);
    if (idx !== -1) {
      setCurrentProjectIdx(idx);
    }
    // Scroll after React has committed the state batch
    setTimeout(() => {
      const element = document.getElementById("projects");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 80);
  };

  const handleRouteToTimeline = (timelineId: string) => {
    timelineRequestIdRef.current += 1;
    setTimelineFocusRequest({ id: timelineId, requestId: timelineRequestIdRef.current });
  };

  // Scroll to hash element on mount if present
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    const section = skillsSectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      setShouldLoadSkills(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoadSkills(true);
        observer.disconnect();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeImage) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusFrame = window.requestAnimationFrame(() => imageCloseButtonRef.current?.focus());

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImage(null);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", closeOnEscape);
      previouslyFocused?.focus();
    };
  }, [activeImage]);

  // Filter projects by selected category and skill (technologies or domains)
  const filteredProjects = useMemo(() => {
    let list = PROJECTS;
    if (projectFilter === "pinned") {
      list = list.filter((project) => project.pinned);
    } else if (projectFilter !== "all") {
      list = list.filter((p) => p.category === projectFilter);
    }
    if (selectedSkill) {
      list = list.filter(
        (p) =>
          p.technologies.some((technology) => technology === selectedSkill) ||
          p.domains.includes(selectedSkill),
      );
    }
    return list;
  }, [projectFilter, selectedSkill]);

  const activeProjectIndex = Math.min(currentProjectIdx, Math.max(filteredProjects.length - 1, 0));

  // Reset slideshow index when filters change — but skip if a direct project route just set the index
  // biome-ignore lint/correctness/useExhaustiveDependencies: projectFilter and selectedSkill are intentional trigger-only deps
  useEffect(() => {
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    setCurrentProjectIdx(0);
  }, [projectFilter, selectedSkill]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactForm.name && contactForm.email && contactForm.message) {
      setIsSubmitting(true);
      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            access_key: PROFILE.contact.web3FormsAccessKey,
            name: contactForm.name,
            email: contactForm.email,
            message: contactForm.message,
            subject: "New Portfolio Contact Form Submission",
          }),
        });
        const result = await response.json();
        if (result.success) {
          setFormSubmitted(true);
          setContactForm({ name: "", email: "", message: "" });
          setTimeout(() => setFormSubmitted(false), 5000);
        } else {
          alert(`Failed to send message. Please email directly to ${PROFILE.contact.email}`);
        }
      } catch (error) {
        console.error(error);
        alert(`Failed to send message. Please email directly to ${PROFILE.contact.email}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const scrollToSection = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full">
      <DevelopmentErrorBoundaryTrigger />
      {/* 1. HERO SECTION */}
      <section
        id="home"
        className="relative min-h-[85vh] flex items-center justify-center py-20 px-6 bg-grid overflow-hidden border-b border-neutral-100 dark:border-neutral-900"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white dark:via-neutral-950/50 dark:to-neutral-950 pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10 select-text">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-none">
            {PROFILE.name}
          </h1>

          <p className="text-lg sm:text-xl font-medium text-neutral-600 dark:text-neutral-400 font-mono">
            {PROFILE.role}
          </p>

          <p className="max-w-lg mx-auto text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed font-sans">
            {PROFILE.heroSummary}
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={(e) => scrollToSection(e, "projects")}
              className="inline-flex items-center gap-2 text-xs font-mono px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-lg transition-colors font-semibold shadow-sm"
            >
              <span>View Projects</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => scrollToSection(e, "contact")}
              className="inline-flex items-center gap-2 text-xs font-mono px-5 py-2.5 bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 rounded-lg transition-colors font-semibold"
            >
              <span>Get in Touch</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. ABOUT SECTION */}
      <section
        id="about"
        className="max-w-6xl mx-auto py-24 px-6 border-b border-neutral-100 dark:border-neutral-900 select-text"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
          <div>
            <h2 className="text-2xl font-bold text-neutral-950 dark:text-white mt-2 font-sans">
              Who I Am
            </h2>
          </div>
          <div className="md:col-span-2 space-y-6 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {PROFILE.about.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <div className="pt-4">
              <a
                href={PROFILE.resumePath}
                download
                target="_blank"
                className="inline-flex items-center gap-2 text-xs font-mono px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-lg transition-colors font-semibold shadow-sm"
                rel="noreferrer"
              >
                <Download size={14} />
                <span>Download Resume</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SKILLS SECTION */}
      <section
        id="skills"
        ref={skillsSectionRef}
        className="max-w-6xl mx-auto py-24 px-6 border-b border-neutral-100 dark:border-neutral-900"
      >
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            Skill Connections
          </h2>
        </div>

        {shouldLoadSkills ? (
          <Suspense
            fallback={
              <div
                className="flex min-h-[500px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300"
                aria-live="polite"
              >
                Loading skill connections…
              </div>
            }
          >
            <SkillsGraph
              selectedSkill={selectedSkill}
              onSelectSkill={setSelectedSkill}
              onRouteToProject={handleRouteToProject}
              onRouteToTimeline={handleRouteToTimeline}
              projects={PROJECTS}
              experiences={EXPERIENCES}
              events={EVENTS}
            />
          </Suspense>
        ) : (
          <div
            className="min-h-[500px] rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50"
            aria-hidden="true"
          />
        )}
      </section>

      {/* 4. PROJECTS SECTION */}
      <section
        id="projects"
        className="max-w-6xl mx-auto py-24 px-6 border-b border-neutral-100 dark:border-neutral-900 select-text"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-950 dark:text-white mt-2">
            Featured Projects
          </h2>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
          {[
            { id: "pinned", label: "Pinned" },
            { id: "all", label: "All Projects" },
            { id: "internship", label: "Internships" },
            { id: "hackathon", label: "Hackathons" },
            { id: "open-source", label: "Open Source" },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() =>
                setProjectFilter(
                  filter.id as "all" | "pinned" | "open-source" | "hackathon" | "internship",
                )
              }
              className={`inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border transition-all font-mono cursor-pointer ${
                projectFilter === filter.id
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-sm font-semibold"
                  : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600"
              }`}
            >
              {filter.id === "pinned" && <Pin size={12} aria-hidden="true" />}
              {filter.label}
            </button>
          ))}
          {selectedSkill && (
            <button
              type="button"
              onClick={() => setSelectedSkill(null)}
              className="text-xs px-4 py-2 rounded-full border border-blue-200 dark:border-blue-900/70 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-mono hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
            >
              Clear: {selectedSkill}
            </button>
          )}
        </div>

        <div className="relative">
          {filteredProjects.length === 0 ? (
            <p className="text-center font-mono text-xs text-neutral-500 py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
              No projects found matching the filters.
            </p>
          ) : (
            <div className="flex items-stretch gap-6">
              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={() =>
                  setCurrentProjectIdx(
                    (prev) => (prev - 1 + filteredProjects.length) % filteredProjects.length,
                  )
                }
                className={`hidden md:flex self-center p-3.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors shadow-sm cursor-pointer shrink-0 ${
                  filteredProjects.length <= 1 ? "opacity-0 pointer-events-none" : ""
                }`}
                aria-label="Previous project"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Project Card */}
              {(() => {
                const project = filteredProjects[activeProjectIndex];
                if (!project) return null;
                const hasImage = !!project.imageUrl;
                const imageDimensions = PROJECT_IMAGE_DIMENSIONS[project.id];
                return (
                  <div
                    key={project.id}
                    className={`flex-1 min-w-0 group border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-xl overflow-hidden hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 shadow-sm flex flex-col ${
                      hasImage ? "md:grid md:grid-cols-[1.15fr_1fr]" : "p-6 sm:p-8 space-y-6"
                    }`}
                  >
                    {hasImage && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImage({
                            src: project.imageUrl!,
                            alt: `${project.title} product screenshot`,
                          })
                        }
                        className="relative min-h-[260px] w-full overflow-hidden bg-gradient-to-br from-neutral-100 via-white to-blue-50/70 p-3 text-left dark:from-black dark:via-neutral-950 dark:to-blue-950/20 sm:min-h-[320px] sm:p-4 md:flex md:min-h-full md:items-center md:justify-center md:p-5"
                        aria-label={`Expand ${project.title} screenshot`}
                      >
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 bg-white/35 dark:bg-neutral-950/20"
                        />
                        <span className="absolute left-5 top-5 z-10 rounded-md border border-white/20 bg-black/55 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                          Project preview
                        </span>
                        <picture className="relative z-10 h-full w-full">
                          <source
                            media="(max-width: 639px)"
                            srcSet={getMobileProjectPreviewUrl(project)}
                          />
                          <img
                            src={getProjectPreviewUrl(project)}
                            alt={`${project.title} product screenshot`}
                            width={imageDimensions?.width}
                            height={imageDimensions?.height}
                            className="h-full w-full rounded-lg border border-white/50 object-contain shadow-xl transition-transform duration-500 group-hover:scale-[1.015] dark:border-white/10"
                            loading="lazy"
                            decoding="async"
                          />
                        </picture>
                        <span className="absolute bottom-5 right-5 flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/60 text-white opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                          <Maximize2 size={15} aria-hidden="true" />
                        </span>
                      </button>
                    )}

                    <div
                      className={`w-full ${hasImage ? "p-6 sm:p-8 flex flex-col justify-between space-y-6" : "space-y-6"}`}
                    >
                      {!hasImage && (
                        <span className="inline-flex w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                          Internship work · Product visuals confidential
                        </span>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            {project.subtitle}
                          </span>
                          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mt-1">
                            {project.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          {project.videoUrl && (
                            <a
                              href={project.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors"
                              title="Watch Demo Video"
                            >
                              <Play size={16} className="opacity-80" />
                            </a>
                          )}
                          {project.githubUrl && (
                            <a
                              href={project.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors"
                              title="GitHub Repo"
                            >
                              <Github size={16} />
                            </a>
                          )}
                          {project.demoUrl && (
                            <a
                              href={project.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors"
                              title="Live Demo"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {project.description}
                      </p>

                      {/* Achievements List */}
                      <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-900 pt-4">
                        <span className="text-[10px] font-mono font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                          Key Outcomes &amp; Technical Achievements
                        </span>
                        <ul className="space-y-2">
                          {project.achievements.map((ach: string, idx: number) => (
                            <li
                              key={idx}
                              className="text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-2.5 leading-relaxed"
                            >
                              <CheckCircle
                                size={14}
                                className="text-neutral-400 dark:text-neutral-700 shrink-0 mt-0.5"
                              />
                              <span>{ach}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Curated project skills — complete technology relationships stay in the Skills Map. */}
                      <div className="flex flex-wrap gap-1.5 pt-4 border-t border-neutral-100 dark:border-neutral-900">
                        <span className="basis-full text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                          Top skills
                        </span>
                        {project.featuredTechnologies.map((tech: string) => (
                          <button
                            key={tech}
                            type="button"
                            onClick={() => setSelectedSkill(tech)}
                            className={`text-[10px] font-mono px-2.5 py-1 rounded transition-all cursor-pointer ${
                              selectedSkill === tech
                                ? "bg-blue-50 dark:bg-blue-950/20 border border-blue-400 text-blue-600 dark:text-blue-400 font-bold"
                                : "bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700"
                            }`}
                          >
                            {tech}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Right Arrow Button */}
              <button
                type="button"
                onClick={() => setCurrentProjectIdx((prev) => (prev + 1) % filteredProjects.length)}
                className={`hidden md:flex self-center p-3.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors shadow-sm cursor-pointer shrink-0 ${
                  filteredProjects.length <= 1 ? "opacity-0 pointer-events-none" : ""
                }`}
                aria-label="Next project"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {filteredProjects.length > 1 && (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/50 md:hidden">
              <button
                type="button"
                onClick={() =>
                  setCurrentProjectIdx(
                    (prev) => (prev - 1 + filteredProjects.length) % filteredProjects.length,
                  )
                }
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-mono font-semibold text-neutral-700 transition-colors hover:bg-white dark:text-neutral-300 dark:hover:bg-neutral-950"
              >
                <ChevronLeft size={15} aria-hidden="true" />
                Previous
              </button>
              <span className="shrink-0 px-2 text-[10px] font-mono font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
                {activeProjectIndex + 1} / {filteredProjects.length}
              </span>
              <button
                type="button"
                onClick={() => setCurrentProjectIdx((prev) => (prev + 1) % filteredProjects.length)}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-mono font-semibold text-neutral-700 transition-colors hover:bg-white dark:text-neutral-300 dark:hover:bg-neutral-950"
              >
                Next
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Numeric Pagination Indicator */}
          {filteredProjects.length > 1 && (
            <div className="mt-8 hidden select-none items-center justify-center gap-1.5 md:flex">
              {paginationPages.map((page, idx) => {
                if (typeof page === "string") {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="text-xs text-neutral-600 dark:text-neutral-400 px-1 font-mono"
                    >
                      ...
                    </span>
                  );
                }

                const isActive = page === activeProjectIndex;
                return (
                  <button
                    key={`page-${page}`}
                    type="button"
                    onClick={() => setCurrentProjectIdx(page)}
                    className={`h-7 w-7 rounded-full border text-[11px] font-mono font-semibold flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-sm font-bold scale-105"
                        : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600"
                    }`}
                    aria-label={`Go to slide ${page + 1}`}
                  >
                    {page + 1}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. TIMELINE SECTION */}
      <section
        id="timeline"
        className="max-w-6xl mx-auto py-24 px-6 border-b border-neutral-100 dark:border-neutral-900"
      >
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            Education &amp; Experience
          </h2>
        </div>

        <Timeline experiences={EXPERIENCES} events={EVENTS} focusRequest={timelineFocusRequest} />
      </section>

      {/* 6. CERTIFICATIONS & CREDENTIALS SECTION */}
      <section
        id="certifications"
        className="max-w-6xl mx-auto py-24 px-6 border-b border-neutral-100 dark:border-neutral-900 select-text"
      >
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            Credentials &amp; Certifications
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CERTIFICATIONS.map((certification) => {
            const Icon =
              certification.icon === "award"
                ? Award
                : certification.icon === "code"
                  ? Code2
                  : Cloud;
            const iconClassName =
              certification.icon === "award"
                ? "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400"
                : certification.icon === "code"
                  ? "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
                  : "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400";

            return (
              <a
                key={certification.title}
                href={certification.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 rounded-xl hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div
                    className={`h-10 w-10 border rounded-lg flex items-center justify-center ${iconClassName}`}
                  >
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {certification.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                      {certification.description}
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400 group-hover:underline pt-4">
                  <span>{certification.cta}</span>
                  <ExternalLink size={10} />
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* 7. CONTACT SECTION */}
      <section id="contact" className="max-w-6xl mx-auto py-24 px-6 select-text">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h2 className="text-2xl font-bold text-neutral-950 dark:text-white mt-2">
              Let's Connect
            </h2>
            <p className="text-xs text-neutral-500 mt-2">
              Have a question or looking to recruit? Drop me an email directly or submit the contact
              form.
            </p>

            <div className="mt-8 space-y-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-3">
                <Mail size={14} className="text-neutral-400" />
                <a href={`mailto:${PROFILE.contact.email}`} className="hover:text-blue-500">
                  {PROFILE.contact.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={14} className="text-neutral-400" />
                <a href={`tel:${PROFILE.contact.phone}`} className="hover:text-blue-500">
                  {PROFILE.contact.phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-neutral-400" />
                <span>{PROFILE.contact.location}</span>
              </div>
            </div>

            {/* Resume & Social Links */}
            <div className="flex flex-wrap gap-2.5 mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-900">
              <a
                href={PROFILE.contact.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-[10px] font-semibold font-mono text-neutral-700 dark:text-neutral-300 transition-colors shadow-sm"
                title="GitHub"
              >
                <Github size={12} />
                <span>GitHub</span>
              </a>
              <a
                href={PROFILE.contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-[10px] font-semibold font-mono text-neutral-700 dark:text-neutral-300 transition-colors shadow-sm"
                title="LinkedIn"
              >
                <Linkedin size={12} />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

          <div className="md:col-span-2">
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label
                    className="text-[10px] font-bold font-mono text-neutral-600 dark:text-neutral-400 uppercase"
                    htmlFor="form-name"
                  >
                    Name
                  </label>
                  <input
                    id="form-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full text-xs font-mono px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-neutral-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-[10px] font-bold font-mono text-neutral-600 dark:text-neutral-400 uppercase"
                    htmlFor="form-email"
                  >
                    Email
                  </label>
                  <input
                    id="form-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full text-xs font-mono px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  className="text-[10px] font-bold font-mono text-neutral-600 dark:text-neutral-400 uppercase"
                  htmlFor="form-msg"
                >
                  Message
                </label>
                <textarea
                  id="form-msg"
                  name="message"
                  required
                  rows={7}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full text-xs font-mono px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              {formSubmitted ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-lg text-xs text-green-600 dark:text-green-400 font-mono">
                  <CheckCircle size={14} />
                  <span>Thank you! Your message has been sent successfully.</span>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-xs font-mono px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-lg transition-all font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              )}
            </form>
          </div>
        </div>
      </section>

      {activeImage && (
        <dialog
          open
          className="fixed inset-0 z-[100] m-0 flex h-screen w-screen max-w-none items-center justify-center border-0 bg-transparent p-4 sm:p-8"
          aria-modal="true"
          aria-labelledby="expanded-screenshot-title"
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              event.preventDefault();
              imageCloseButtonRef.current?.focus();
            }
          }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setActiveImage(null)}
            aria-label="Close expanded screenshot by clicking outside"
          />
          <div className="relative flex max-h-full w-full max-w-7xl items-center justify-center">
            <p id="expanded-screenshot-title" className="sr-only">
              {activeImage.alt}
            </p>
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="max-h-[88vh] w-auto max-w-full rounded-xl border border-white/15 bg-neutral-950 object-contain shadow-2xl"
            />
            <button
              ref={imageCloseButtonRef}
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              aria-label="Close expanded screenshot"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
