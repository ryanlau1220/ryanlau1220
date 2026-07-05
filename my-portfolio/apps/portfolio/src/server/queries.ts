import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db";

// Fetch all database records and map to legacy type structures to keep the UI simple
export const getPortfolioData = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  if (!db) {
    // Return fallback empty data if DB binding is missing during build checks
    return { projects: [], experiences: [], events: [] };
  }

  try {
    // 1. Fetch Projects with achievements and skills relations
    const dbProjects = await db.query.projects.findMany({
      with: {
        achievements: true,
        skills: {
          with: {
            skill: true,
          },
        },
      },
      orderBy: (projects, { asc }) => [asc(projects.sortOrder)],
    });

    const projects = dbProjects.map((p) => {
      const technologies = p.skills.map((s) => s.skill.name);
      const domains = Array.from(new Set(p.skills.map((s) => s.skill.category))) as string[];

      return {
        id: String(p.id),
        category: p.category,
        title: p.title,
        subtitle: p.subtitle,
        description: p.description,
        achievements: p.achievements.map((a) => a.content),
        githubUrl: p.githubUrl || undefined,
        videoUrl: p.videoUrl || undefined,
        imageUrl: p.imageUrl || undefined,
        domains,
        technologies,
      };
    });

    // 2. Fetch Timeline items with achievements and skills relations
    const dbTimeline = await db.query.timeline.findMany({
      with: {
        achievements: true,
        skills: {
          with: {
            skill: true,
          },
        },
      },
      orderBy: (timeline, { desc }) => [desc(timeline.sortKey)],
    });

    // Split timeline items into experiences (education & internship) and events (hackathon & others)
    const experiences = dbTimeline
      .filter((t) => t.category === "education" || t.category === "internship")
      .map((exp) => {
        const technologies = exp.skills.map((s) => s.skill.name);
        const domains = Array.from(new Set(exp.skills.map((s) => s.skill.category))) as string[];

        return {
          id: exp.category === "education" ? `edu-${exp.id}` : `internship-${exp.id}`,
          role: exp.title,
          company: exp.subtitle,
          period: exp.dateDisplay,
          description: exp.description,
          achievements: exp.achievements.map((a) => a.content),
          domains,
          technologies,
          sortKey: exp.sortKey,
        };
      });

    const events = dbTimeline
      .filter((t) => t.category === "hackathon" || t.category === "other")
      .map((evt) => {
        const technologies = evt.skills.map((s) => s.skill.name);

        return {
          id: `event-${evt.id}`,
          title: evt.title,
          event: evt.subtitle,
          date: evt.dateDisplay,
          role: "Participant", // Default fallback
          outcome: evt.outcome || undefined,
          description: evt.description,
          category: evt.category === "other" ? ("other" as const) : ("hackathon" as const),
          featured: evt.isFeatured === 1,
          technologies,
          sortKey: evt.sortKey,
        };
      });

    return { projects, experiences, events };
  } catch (error) {
    console.error("Failed to query portfolio data from D1:", error);
    return { projects: [], experiences: [], events: [] };
  }
});
