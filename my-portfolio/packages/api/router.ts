import {
  projectAchievements,
  projectSkills,
  projects,
  skills,
  timeline,
  timelineAchievements,
  timelineSkills,
} from "@portfolio/db";
import type { DB } from "@portfolio/db";
import { eq } from "drizzle-orm";
import type { ProjectInput, SkillInput, TimelineInput } from "./index";

// DB CRUD Implementations - designed to run with a Drizzle client instance (db)

export async function getDbSkills(db: DB) {
  return await db.query.skills.findMany();
}

export async function saveDbSkill(db: DB, input: SkillInput) {
  if (input.id) {
    await db
      .update(skills)
      .set({
        name: input.name,
        category: input.category,
      })
      .where(eq(skills.id, input.id));
    return { id: input.id as number };
  }
  const [result] = await db
    .insert(skills)
    .values({
      name: input.name,
      category: input.category,
    })
    .returning();
  return { id: result.id };
}

export async function deleteDbSkill(db: DB, id: number) {
  await db.delete(skills).where(eq(skills.id, id));
  return { success: true };
}

export async function getDbProjects(db: DB) {
  return await db.query.projects.findMany({
    with: {
      achievements: true,
      skills: {
        with: {
          skill: true,
        },
      },
    },
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  });
}

export async function saveDbProject(db: DB, input: ProjectInput) {
  let projectId = input.id;

  if (projectId) {
    // 1. Update project entry
    await db
      .update(projects)
      .set({
        category: input.category,
        title: input.title,
        subtitle: input.subtitle,
        description: input.description,
        githubUrl: input.githubUrl || null,
        videoUrl: input.videoUrl || null,
        imageUrl: input.imageUrl || null,
        sortOrder: input.sortOrder,
      })
      .where(eq(projects.id, projectId));

    // 2. Clear old achievements and insert new ones
    await db.delete(projectAchievements).where(eq(projectAchievements.projectId, projectId));
    if (input.achievements.length > 0) {
      await db
        .insert(projectAchievements)
        .values(input.achievements.map((content: string) => ({ projectId: projectId!, content })));
    }

    // 3. Clear old skills junctions and insert new ones
    await db.delete(projectSkills).where(eq(projectSkills.projectId, projectId));
    if (input.skills.length > 0) {
      await db
        .insert(projectSkills)
        .values(input.skills.map((skillId: number) => ({ projectId: projectId!, skillId })));
    }
  } else {
    // Insert new project
    const [inserted] = await db
      .insert(projects)
      .values({
        category: input.category,
        title: input.title,
        subtitle: input.subtitle,
        description: input.description,
        githubUrl: input.githubUrl || null,
        videoUrl: input.videoUrl || null,
        imageUrl: input.imageUrl || null,
        sortOrder: input.sortOrder,
      })
      .returning();

    projectId = inserted.id;

    if (input.achievements.length > 0) {
      await db
        .insert(projectAchievements)
        .values(input.achievements.map((content: string) => ({ projectId: projectId!, content })));
    }

    if (input.skills.length > 0) {
      await db
        .insert(projectSkills)
        .values(input.skills.map((skillId: number) => ({ projectId: projectId!, skillId })));
    }
  }

  return { id: projectId as number };
}

export async function deleteDbProject(db: DB, id: number) {
  await db.delete(projects).where(eq(projects.id, id));
  return { success: true };
}

export async function getDbTimeline(db: DB) {
  return await db.query.timeline.findMany({
    with: {
      achievements: true,
      skills: {
        with: {
          skill: true,
        },
      },
    },
    orderBy: (t, { desc }) => [desc(t.sortKey)],
  });
}

export async function saveDbTimelineItem(db: DB, input: TimelineInput) {
  let timelineId = input.id;

  if (timelineId) {
    // Update timeline entry
    await db
      .update(timeline)
      .set({
        title: input.title,
        subtitle: input.subtitle,
        dateDisplay: input.dateDisplay,
        description: input.description,
        category: input.category,
        outcome: input.outcome || null,
        sortKey: input.sortKey,
        isFeatured: input.isFeatured ? 1 : 0,
      })
      .where(eq(timeline.id, timelineId));

    // Clear and insert achievements
    await db.delete(timelineAchievements).where(eq(timelineAchievements.timelineId, timelineId));
    if (input.achievements.length > 0) {
      await db
        .insert(timelineAchievements)
        .values(
          input.achievements.map((content: string) => ({ timelineId: timelineId!, content })),
        );
    }

    // Clear and insert skills junctions
    await db.delete(timelineSkills).where(eq(timelineSkills.timelineId, timelineId));
    if (input.skills.length > 0) {
      await db
        .insert(timelineSkills)
        .values(input.skills.map((skillId: number) => ({ timelineId: timelineId!, skillId })));
    }
  } else {
    // Insert new timeline item
    const [inserted] = await db
      .insert(timeline)
      .values({
        title: input.title,
        subtitle: input.subtitle,
        dateDisplay: input.dateDisplay,
        description: input.description,
        category: input.category,
        outcome: input.outcome || null,
        sortKey: input.sortKey,
        isFeatured: input.isFeatured ? 1 : 0,
      })
      .returning();

    timelineId = inserted.id;

    if (input.achievements.length > 0) {
      await db
        .insert(timelineAchievements)
        .values(
          input.achievements.map((content: string) => ({ timelineId: timelineId!, content })),
        );
    }

    if (input.skills.length > 0) {
      await db
        .insert(timelineSkills)
        .values(input.skills.map((skillId: number) => ({ timelineId: timelineId!, skillId })));
    }
  }

  return { id: timelineId as number };
}

export async function deleteDbTimelineItem(db: DB, id: number) {
  await db.delete(timeline).where(eq(timeline.id, id));
  return { success: true };
}
