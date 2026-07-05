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
  Phone,
  Play,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SkillsGraph } from "../components/SkillsGraph";
import { Timeline } from "../components/Timeline";
import { getPortfolioData } from "../server/queries";

export const Route = createFileRoute("/")({
  loader: async () => {
    return getPortfolioData();
  },
  component: PortfolioHome,
});

function PortfolioHome() {
  const {
    projects: PROJECTS,
    experiences: EXPERIENCES,
    events: EVENTS,
  } = Route.useLoaderData() as {
    projects: any[];
    experiences: any[];
    events: any[];
  };
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectFilter, setProjectFilter] = useState<
    "all" | "open-source" | "hackathon" | "internship"
  >("all");
  const [currentProjectIdx, setCurrentProjectIdx] = useState(0);
  // Guard: when routing to a specific project we set filters + index simultaneously;
  // this ref prevents the filter-change effect from immediately resetting index to 0.
  const skipResetRef = useRef(false);

  // Dynamic numeric pagination pages list
  const paginationPages = useMemo(() => {
    const total = PROJECTS.filter((p) => {
      const matchCat = projectFilter === "all" || p.category === projectFilter;
      const matchSkill =
        !selectedSkill ||
        p.technologies.includes(selectedSkill) ||
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

  // Filter projects by selected category and skill (technologies or domains)
  const filteredProjects = useMemo(() => {
    let list = PROJECTS;
    if (projectFilter !== "all") {
      list = list.filter((p) => p.category === projectFilter);
    }
    if (selectedSkill) {
      list = list.filter(
        (p) => p.technologies.includes(selectedSkill) || p.domains.includes(selectedSkill),
      );
    }
    return list;
  }, [projectFilter, selectedSkill]);

  // Reset slideshow index when filters change — but skip if a direct project route just set the index
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
            access_key: "4cf3d562-875e-40d3-aac8-04ad869ec935",
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
          alert("Failed to send message. Please email directly to liujunhong20@gmail.com");
        }
      } catch (error) {
        console.error(error);
        alert("Failed to send message. Please email directly to liujunhong20@gmail.com");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full">
      {/* 1. HERO SECTION */}
      <section
        id="home"
        className="relative min-h-[85vh] flex items-center justify-center py-20 px-6 bg-grid overflow-hidden border-b border-neutral-100 dark:border-neutral-900"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white dark:via-neutral-950/50 dark:to-neutral-950 pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10 select-text">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-none">
            Ryan Lau Jun Hong
          </h1>

          <p className="text-lg sm:text-xl font-medium text-neutral-600 dark:text-neutral-400 font-mono">
            Software Engineer
          </p>

          <p className="max-w-lg mx-auto text-sm sm:text-base text-neutral-500 dark:text-neutral-500 leading-relaxed font-sans">
            Focusing on DevOps pipelines, AI-driven automation, and secure, high-performance Backend
            architectures.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="#projects"
              onClick={(e) => scrollToSection(e, "projects")}
              className="inline-flex items-center gap-2 text-xs font-mono px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-lg transition-colors font-semibold shadow-sm"
            >
              <span>View Projects</span>
              <ArrowRight size={14} />
            </a>
            <a
              href="#contact"
              onClick={(e) => scrollToSection(e, "contact")}
              className="inline-flex items-center gap-2 text-xs font-mono px-5 py-2.5 bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 rounded-lg transition-colors font-semibold"
            >
              <span>Get in Touch</span>
            </a>
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
            <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mt-2 font-sans">
              Who I Am
            </h3>
          </div>
          <div className="md:col-span-2 space-y-6 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <p>
              I am a Software Engineering student passionate about exploring latest technologies and
              building reliable systems. My engineering approach centers on designing clean
              architectures, solving technical complexity, and optimizing performance.
            </p>
            <p>
              I am deeply interested in DevOps automation, distributed ledgers, and intelligent AI
              pipelines, constantly experimenting with cutting-edge tools to build high-performance
              backend systems.
            </p>

            <div className="pt-4">
              <a
                href="/Ryan Lau_Resume.pdf"
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
        className="max-w-6xl mx-auto py-24 px-6 border-b border-neutral-100 dark:border-neutral-900"
      >
        <div className="text-center space-y-3 mb-10">
          <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            Skill Connections
          </h3>
        </div>

        <SkillsGraph
          selectedSkill={selectedSkill}
          onSelectSkill={setSelectedSkill}
          onRouteToProject={handleRouteToProject}
          projects={PROJECTS}
        />
      </section>

      {/* 4. PROJECTS SECTION */}
      <section
        id="projects"
        className="max-w-6xl mx-auto py-24 px-6 border-b border-neutral-100 dark:border-neutral-900 select-text"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mt-2">
              Featured Projects
            </h3>
          </div>
          {selectedSkill && (
            <button
              type="button"
              onClick={() => setSelectedSkill(null)}
              className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Clear skill filter ({selectedSkill})
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          {[
            { id: "all", label: "All Projects" },
            { id: "internship", label: "Internships" },
            { id: "hackathon", label: "Hackathons" },
            { id: "open-source", label: "Open Source" },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setProjectFilter(filter.id as any)}
              className={`text-xs px-4 py-2 rounded-full border transition-all font-mono cursor-pointer ${
                projectFilter === filter.id
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-sm font-semibold"
                  : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="relative">
          {filteredProjects.length === 0 ? (
            <p className="text-center font-mono text-xs text-neutral-500 py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
              No projects found matching the filters.
            </p>
          ) : (
            <div className="flex items-center gap-2 sm:gap-6">
              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={() =>
                  setCurrentProjectIdx(
                    (prev) => (prev - 1 + filteredProjects.length) % filteredProjects.length,
                  )
                }
                className={`p-2.5 sm:p-3.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors shadow-sm cursor-pointer shrink-0 ${
                  filteredProjects.length <= 1 ? "opacity-0 pointer-events-none" : ""
                }`}
                aria-label="Previous project"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Project Card */}
              {(() => {
                const project = filteredProjects[currentProjectIdx] || filteredProjects[0];
                if (!project) return null;
                const hasImage = !!project.imageUrl;
                return (
                  <div
                    key={project.id}
                    className={`flex-1 min-w-0 group border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-xl overflow-hidden hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 shadow-sm flex flex-col ${
                      hasImage ? "md:flex-row" : "p-6 sm:p-8 space-y-6"
                    }`}
                  >
                    {hasImage && (
                      <div className="w-full md:w-1/2 h-48 sm:h-64 md:h-auto min-h-[220px] md:min-h-[380px] relative overflow-hidden bg-neutral-50 dark:bg-neutral-900/40 shrink-0">
                        <img
                          src={project.imageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover rounded-t-xl md:rounded-l-xl md:rounded-tr-none transition-transform duration-500 group-hover:scale-[1.02]"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    <div
                      className={`w-full ${hasImage ? "md:w-1/2 p-6 sm:p-8 flex flex-col justify-between space-y-6" : "space-y-6"}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            {project.subtitle}
                          </span>
                          <h4 className="text-xl font-bold text-neutral-900 dark:text-white mt-1">
                            {project.title}
                          </h4>
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
                        <span className="text-[10px] font-mono font-bold text-neutral-400 dark:text-neutral-600 uppercase tracking-wider block mb-2">
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

                      {/* Technologies Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-4 border-t border-neutral-100 dark:border-neutral-900">
                        {project.technologies.map((tech: string) => (
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
                className={`p-2.5 sm:p-3.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors shadow-sm cursor-pointer shrink-0 ${
                  filteredProjects.length <= 1 ? "opacity-0 pointer-events-none" : ""
                }`}
                aria-label="Next project"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Numeric Pagination Indicator */}
          {filteredProjects.length > 1 && (
            <div className="flex justify-center items-center gap-1.5 mt-8 select-none">
              {paginationPages.map((page, idx) => {
                if (typeof page === "string") {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="text-xs text-neutral-400 dark:text-neutral-600 px-1 font-mono"
                    >
                      ...
                    </span>
                  );
                }

                const isActive = page === currentProjectIdx;
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
          <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            Education &amp; Experience
          </h3>
        </div>

        <Timeline experiences={EXPERIENCES} events={EVENTS} />
      </section>

      {/* 6. CERTIFICATIONS & CREDENTIALS SECTION */}
      <section
        id="certifications"
        className="max-w-6xl mx-auto py-24 px-6 border-b border-neutral-100 dark:border-neutral-900 select-text"
      >
        <div className="text-center space-y-3 mb-12">
          <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            Credentials &amp; Certifications
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="https://drive.google.com/drive/folders/1yL_hl6eykQmJX-as3KJKMA0w7seN5c_L?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="group border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 rounded-xl hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Award size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Certificates</h4>
                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                  A compilation of my learning journey and development roadmap.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400 group-hover:underline pt-4">
              <span>View certifications</span>
              <ExternalLink size={10} />
            </div>
          </a>

          <a
            href="https://g.dev/ryanlau1220"
            target="_blank"
            rel="noopener noreferrer"
            className="group border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 rounded-xl hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                <Code2 size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Google Developer
                </h4>
                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                  Developer profile showcasing my Google Cloud pathways and developer milestones.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400 group-hover:underline pt-4">
              <span>View developer profile</span>
              <ExternalLink size={10} />
            </div>
          </a>

          <a
            href="https://skillsprofile.skillbuilder.aws/user/ryanlau1220"
            target="_blank"
            rel="noopener noreferrer"
            className="group border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 rounded-xl hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Cloud size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  AWS Skill Builder
                </h4>
                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                  AWS cloud training logs, simulation scores, and platform learning tracks.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400 group-hover:underline pt-4">
              <span>Verify AWS profile</span>
              <ExternalLink size={10} />
            </div>
          </a>
        </div>
      </section>

      {/* 7. CONTACT SECTION */}
      <section id="contact" className="max-w-6xl mx-auto py-24 px-6 select-text">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-2xl font-bold text-neutral-950 dark:text-white mt-2">
              Let's Connect
            </h3>
            <p className="text-xs text-neutral-500 mt-2">
              Have a question or looking to recruit? Drop me an email directly or submit the contact
              form.
            </p>

            <div className="mt-8 space-y-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-3">
                <Mail size={14} className="text-neutral-400" />
                <a href="mailto:liujunhong20@gmail.com" className="hover:text-blue-500">
                  liujunhong20@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={14} className="text-neutral-400" />
                <a href="tel:+601110768752" className="hover:text-blue-500">
                  +601110768752
                </a>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-neutral-400" />
                <span>Bukit Jalil, Kuala Lumpur</span>
              </div>
            </div>

            {/* Resume & Social Links */}
            <div className="flex flex-wrap gap-2.5 mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-900">
              <a
                href="https://github.com/ryanlau1220"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-[10px] font-semibold font-mono text-neutral-700 dark:text-neutral-300 transition-colors shadow-sm"
                title="GitHub"
              >
                <Github size={12} />
                <span>GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/ryanlau1220/"
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
                    className="text-[10px] font-bold font-mono text-neutral-400 dark:text-neutral-600 uppercase"
                    htmlFor="form-name"
                  >
                    Name
                  </label>
                  <input
                    id="form-name"
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full text-xs font-mono px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-neutral-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-[10px] font-bold font-mono text-neutral-400 dark:text-neutral-600 uppercase"
                    htmlFor="form-email"
                  >
                    Email
                  </label>
                  <input
                    id="form-email"
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full text-xs font-mono px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  className="text-[10px] font-bold font-mono text-neutral-400 dark:text-neutral-600 uppercase"
                  htmlFor="form-msg"
                >
                  Message
                </label>
                <textarea
                  id="form-msg"
                  required
                  rows={5}
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
    </div>
  );
}
