import { relations } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// 1. Skill Categories Enum
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

export type SkillCategory = (typeof skillCategoryEnum)[number];

// 2. Project Categories Enum
export const projectCategoryEnum = ["open-source", "hackathon", "internship", "academic"] as const;

export type ProjectCategory = (typeof projectCategoryEnum)[number];

// 3. Timeline Categories Enum
export const timelineCategoryEnum = ["education", "internship", "hackathon", "other"] as const;

export type TimelineCategory = (typeof timelineCategoryEnum)[number];

// --- Database Tables ---

// Skills table
export const skills = sqliteTable("skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  category: text("category", { enum: skillCategoryEnum }).notNull(),
});

// Projects table
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category", { enum: projectCategoryEnum }).notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  description: text("description").notNull(),
  githubUrl: text("github_url"),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Project Achievements
export const projectAchievements = sqliteTable("project_achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
});

// Project-Skill Junction Table
export const projectSkills = sqliteTable(
  "project_skills",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.skillId] }),
  }),
);

// Timeline table (Experiences and Hackathons)
export const timeline = sqliteTable("timeline", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  dateDisplay: text("date_display").notNull(),
  description: text("description").notNull(),
  category: text("category", { enum: timelineCategoryEnum }).notNull(),
  outcome: text("outcome"),
  sortKey: integer("sort_key").notNull(),
  isFeatured: integer("is_featured").notNull().default(0), // SQLite uses 0 or 1 for booleans
});

// Timeline Achievements
export const timelineAchievements = sqliteTable("timeline_achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timelineId: integer("timeline_id")
    .notNull()
    .references(() => timeline.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
});

// Timeline-Skill Junction Table
export const timelineSkills = sqliteTable(
  "timeline_skills",
  {
    timelineId: integer("timeline_id")
      .notNull()
      .references(() => timeline.id, { onDelete: "cascade" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.timelineId, t.skillId] }),
  }),
);

// --- Relations ---

export const projectsRelations = relations(projects, ({ many }) => ({
  achievements: many(projectAchievements),
  skills: many(projectSkills),
}));

export const projectAchievementsRelations = relations(projectAchievements, ({ one }) => ({
  project: one(projects, {
    fields: [projectAchievements.projectId],
    references: [projects.id],
  }),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  projects: many(projectSkills),
  timeline: many(timelineSkills),
}));

export const projectSkillsRelations = relations(projectSkills, ({ one }) => ({
  project: one(projects, {
    fields: [projectSkills.projectId],
    references: [projects.id],
  }),
  skill: one(skills, {
    fields: [projectSkills.skillId],
    references: [skills.id],
  }),
}));

export const timelineRelations = relations(timeline, ({ many }) => ({
  achievements: many(timelineAchievements),
  skills: many(timelineSkills),
}));

export const timelineAchievementsRelations = relations(timelineAchievements, ({ one }) => ({
  timeline: one(timeline, {
    fields: [timelineAchievements.timelineId],
    references: [timeline.id],
  }),
}));

export const timelineSkillsRelations = relations(timelineSkills, ({ one }) => ({
  timeline: one(timeline, {
    fields: [timelineSkills.timelineId],
    references: [timeline.id],
  }),
  skill: one(skills, {
    fields: [timelineSkills.skillId],
    references: [skills.id],
  }),
}));

// --- Types ---
export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type ProjectAchievement = typeof projectAchievements.$inferSelect;
export type NewProjectAchievement = typeof projectAchievements.$inferInsert;

export type TimelineItem = typeof timeline.$inferSelect;
export type NewTimelineItem = typeof timeline.$inferInsert;

export type TimelineAchievement = typeof timelineAchievements.$inferSelect;
export type NewTimelineAchievement = typeof timelineAchievements.$inferInsert;
