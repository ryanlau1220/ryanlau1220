import { describe, expect, it } from "vitest";
import { EVENTS, EXPERIENCES, PROJECTS, TECHNOLOGY_CATEGORIES } from "../../src/data/registry";
import {
  projectMatchesSkill,
  projectSkills,
  timelineSkills,
} from "../../src/data/skill-connections";

describe("skill connections", () => {
  it("connects every displayed skill to a project or timeline entry", () => {
    const entries = [...PROJECTS, ...EXPERIENCES, ...EVENTS];
    const unconnected = Object.keys(TECHNOLOGY_CATEGORIES).filter(
      (skill) =>
        !entries.some((entry) => entry.technologies.some((technology) => technology === skill)),
    );
    expect(unconnected).toEqual([]);
  });

  it("pairs every hackathon project and event exactly once", () => {
    const projects = PROJECTS.filter((project) => project.category === "hackathon");
    const events = EVENTS.filter((event) => event.category === "hackathon");
    expect(projects.map((project) => project.timelineId).sort()).toEqual(
      events.map((event) => event.id).sort(),
    );
    for (const project of projects) {
      const event = events.find((entry) => entry.id === project.timelineId);
      expect(event).toBeDefined();
      if (!event) continue;
      const normalize = (title: string) => title.toLowerCase().replace(/[^a-z0-9]/g, "");
      expect(normalize(event.title)).toBe(normalize(project.title));
      for (const skill of [...project.technologies, ...event.technologies]) {
        expect(projectMatchesSkill(project, skill), `${project.title}: ${skill}`).toBe(true);
        expect(timelineSkills(event, PROJECTS)).toContain(skill);
      }
    }
  });

  it("connects project skills to degree and internship without assigning all experience skills to projects", () => {
    for (const [projectId, timelineId] of [
      ["grocerly", "edu-bsc"],
      ["krypitalx", "internship-fp"],
    ]) {
      const project = PROJECTS.find((item) => item.id === projectId)!;
      const timeline = EXPERIENCES.find((item) => item.id === timelineId)!;
      expect(project.timelineId).toBe(timelineId);
      expect(timelineSkills(timeline, PROJECTS)).toEqual(
        expect.arrayContaining(project.technologies),
      );
    }
    expect(projectSkills(PROJECTS.find((project) => project.id === "grocerly")!)).not.toContain(
      "R Programming",
    );
    expect(projectSkills(PROJECTS.find((project) => project.id === "krypitalx")!)).not.toContain(
      "MT5",
    );
    for (const id of ["apu-asc", "openchain", "llm-wiki"]) {
      expect(PROJECTS.find((project) => project.id === id)?.timelineId).toBeUndefined();
    }
  });

  it("does not attribute Next.js to the Vite-based EcoChain project", () => {
    const project = PROJECTS.find((item) => item.id === "devmatch")!;
    expect(projectMatchesSkill(project, "Next.js")).toBe(false);
    expect(projectMatchesSkill(project, "Vercel")).toBe(true);
  });
});
