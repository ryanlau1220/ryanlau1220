import { eq } from 'drizzle-orm';
import { 
  skills, 
  projects, 
  projectAchievements, 
  projectSkills, 
  timeline, 
  timelineAchievements, 
  timelineSkills 
} from '@portfolio/db';
import type { ProjectInput, SkillInput, TimelineInput } from './index';

// DB CRUD Implementations - designed to run with a Drizzle client instance (db)

export async function getDbSkills(db: any) {
  return await db.query.skills.findMany();
}

export async function saveDbSkill(db: any, input: SkillInput) {
  if (input.id) {
    await db.update(skills).set({
      name: input.name,
      category: input.category
    }).where(eq(skills.id, input.id));
    return { id: input.id as number };
  } else {
    const [result] = await db.insert(skills).values({
      name: input.name,
      category: input.category
    }).returning({ id: skills.id });
    return { id: result.id as number };
  }
}

export async function deleteDbSkill(db: any, id: number) {
  await db.delete(skills).where(eq(skills.id, id));
  return { success: true };
}

export async function getDbProjects(db: any) {
  return await db.query.projects.findMany({
    with: {
      achievements: true,
      skills: {
        with: {
          skill: true
        }
      }
    },
    orderBy: (p: any, { asc }: any) => [asc(p.sortOrder)]
  });
}

export async function saveDbProject(db: any, input: ProjectInput) {
  let projectId = input.id;

  if (projectId) {
    // 1. Update project entry
    await db.update(projects).set({
      category: input.category,
      title: input.title,
      subtitle: input.subtitle,
      description: input.description,
      githubUrl: input.githubUrl || null,
      videoUrl: input.videoUrl || null,
      imageUrl: input.imageUrl || null,
      sortOrder: input.sortOrder
    }).where(eq(projects.id, projectId));

    // 2. Clear old achievements and insert new ones
    await db.delete(projectAchievements).where(eq(projectAchievements.projectId, projectId));
    if (input.achievements.length > 0) {
      await db.insert(projectAchievements).values(
        input.achievements.map(content => ({ projectId: projectId!, content }))
      );
    }

    // 3. Clear old skills junctions and insert new ones
    await db.delete(projectSkills).where(eq(projectSkills.projectId, projectId));
    if (input.skills.length > 0) {
      await db.insert(projectSkills).values(
        input.skills.map(skillId => ({ projectId: projectId!, skillId }))
      );
    }
  } else {
    // Insert new project
    const [inserted] = await db.insert(projects).values({
      category: input.category,
      title: input.title,
      subtitle: input.subtitle,
      description: input.description,
      githubUrl: input.githubUrl || null,
      videoUrl: input.videoUrl || null,
      imageUrl: input.imageUrl || null,
      sortOrder: input.sortOrder
    }).returning({ id: projects.id });

    projectId = inserted.id;

    if (input.achievements.length > 0) {
      await db.insert(projectAchievements).values(
        input.achievements.map(content => ({ projectId: projectId!, content }))
      );
    }

    if (input.skills.length > 0) {
      await db.insert(projectSkills).values(
        input.skills.map(skillId => ({ projectId: projectId!, skillId }))
      );
    }
  }

  return { id: projectId as number };
}

export async function deleteDbProject(db: any, id: number) {
  await db.delete(projects).where(eq(projects.id, id));
  return { success: true };
}

export async function getDbTimeline(db: any) {
  return await db.query.timeline.findMany({
    with: {
      achievements: true,
      skills: {
        with: {
          skill: true
        }
      }
    },
    orderBy: (t: any, { desc }: any) => [desc(t.sortKey)]
  });
}

export async function saveDbTimelineItem(db: any, input: TimelineInput) {
  let timelineId = input.id;

  if (timelineId) {
    // Update timeline entry
    await db.update(timeline).set({
      title: input.title,
      subtitle: input.subtitle,
      dateDisplay: input.dateDisplay,
      description: input.description,
      category: input.category,
      outcome: input.outcome || null,
      sortKey: input.sortKey,
      isFeatured: input.isFeatured ? 1 : 0
    }).where(eq(timeline.id, timelineId));

    // Clear and insert achievements
    await db.delete(timelineAchievements).where(eq(timelineAchievements.timelineId, timelineId));
    if (input.achievements.length > 0) {
      await db.insert(timelineAchievements).values(
        input.achievements.map(content => ({ timelineId: timelineId!, content }))
      );
    }

    // Clear and insert skills junctions
    await db.delete(timelineSkills).where(eq(timelineSkills.timelineId, timelineId));
    if (input.skills.length > 0) {
      await db.insert(timelineSkills).values(
        input.skills.map(skillId => ({ timelineId: timelineId!, skillId }))
      );
    }
  } else {
    // Insert new timeline item
    const [inserted] = await db.insert(timeline).values({
      title: input.title,
      subtitle: input.subtitle,
      dateDisplay: input.dateDisplay,
      description: input.description,
      category: input.category,
      outcome: input.outcome || null,
      sortKey: input.sortKey,
      isFeatured: input.isFeatured ? 1 : 0
    }).returning({ id: timeline.id });

    timelineId = inserted.id;

    if (input.achievements.length > 0) {
      await db.insert(timelineAchievements).values(
        input.achievements.map(content => ({ timelineId: timelineId!, content }))
      );
    }

    if (input.skills.length > 0) {
      await db.insert(timelineSkills).values(
        input.skills.map(skillId => ({ timelineId: timelineId!, skillId }))
      );
    }
  }

  return { id: timelineId as number };
}

export async function deleteDbTimelineItem(db: any, id: number) {
  await db.delete(timeline).where(eq(timeline.id, id));
  return { success: true };
}
