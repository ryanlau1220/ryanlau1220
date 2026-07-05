import { oc } from "@orpc/contract";
import { z } from "zod";

// --- Category Enums constants ---
export const skillCategoryEnum = [
  "Programming Languages",
  "Backend",
  "Frontend",
  "Databases",
  "Tools",
  "DevOps",
  "AI & Intelligence",
  "Others",
] as const;

export const projectCategoryEnum = ["open-source", "hackathon", "internship", "academic"] as const;

export const timelineCategoryEnum = ["education", "internship", "hackathon", "other"] as const;

// --- Zod schemas for input validation ---

export const ProjectSchema = z.object({
  id: z.number().optional().nullable(),
  category: z.enum(projectCategoryEnum),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  description: z.string().min(1),
  githubUrl: z.string().url().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().default(0),
  achievements: z.array(z.string()).default([]),
  skills: z.array(z.number()).default([]),
});

export const SkillSchema = z.object({
  id: z.number().optional().nullable(),
  name: z.string().min(1),
  category: z.enum(skillCategoryEnum),
});

export const TimelineSchema = z.object({
  id: z.number().optional().nullable(),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  dateDisplay: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(timelineCategoryEnum),
  outcome: z.string().nullable().optional(),
  sortKey: z.number(),
  isFeatured: z.boolean().default(false),
  achievements: z.array(z.string()).default([]),
  skills: z.array(z.number()).default([]),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;
export type SkillInput = z.infer<typeof SkillSchema>;
export type TimelineInput = z.infer<typeof TimelineSchema>;

// --- oRPC Contract ---
export const contract = oc.router({
  getSkills: oc
    .output(z.array(z.any()))
    .route({ method: "GET", path: "/skills", summary: "List all skills", tags: ["skills"] }),
  saveSkill: oc
    .input(SkillSchema)
    .output(z.object({ id: z.number() }))
    .route({
      method: "POST",
      path: "/skills",
      summary: "Create or update a skill",
      tags: ["skills"],
    }),
  deleteSkill: oc
    .input(z.object({ id: z.number() }))
    .output(z.object({ success: z.boolean() }))
    .route({ method: "DELETE", path: "/skills/{id}", summary: "Delete a skill", tags: ["skills"] }),

  getProjects: oc
    .output(z.array(z.any()))
    .route({ method: "GET", path: "/projects", summary: "List all projects", tags: ["projects"] }),
  saveProject: oc
    .input(ProjectSchema)
    .output(z.object({ id: z.number() }))
    .route({
      method: "POST",
      path: "/projects",
      summary: "Create or update a project",
      tags: ["projects"],
    }),
  deleteProject: oc
    .input(z.object({ id: z.number() }))
    .output(z.object({ success: z.boolean() }))
    .route({
      method: "DELETE",
      path: "/projects/{id}",
      summary: "Delete a project",
      tags: ["projects"],
    }),

  getTimeline: oc.output(z.array(z.any())).route({
    method: "GET",
    path: "/timeline",
    summary: "List all timeline items",
    tags: ["timeline"],
  }),
  saveTimelineItem: oc
    .input(TimelineSchema)
    .output(z.object({ id: z.number() }))
    .route({
      method: "POST",
      path: "/timeline",
      summary: "Create or update a timeline item",
      tags: ["timeline"],
    }),
  deleteTimelineItem: oc
    .input(z.object({ id: z.number() }))
    .output(z.object({ success: z.boolean() }))
    .route({
      method: "DELETE",
      path: "/timeline/{id}",
      summary: "Delete a timeline item",
      tags: ["timeline"],
    }),
});
export * from "./router";
export type ContractRouter = typeof contract;
