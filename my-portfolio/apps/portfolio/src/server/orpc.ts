import { os } from '@orpc/server';
import { contract } from '@portfolio/api';
import { getDb } from './db';
import { 
  getDbSkills, saveDbSkill, deleteDbSkill,
  getDbProjects, saveDbProject, deleteDbProject,
  getDbTimeline, saveDbTimelineItem, deleteDbTimelineItem
} from '@portfolio/api';

const implementer = os.contract(contract);

// Create oRPC router backend matching the API contract
export const router = implementer.router({
  getSkills: implementer.getSkills.func(async () => {
    const db = getDb();
    if (!db) throw new Error("DB connection unavailable");
    return await getDbSkills(db);
  }),
  saveSkill: implementer.saveSkill.func(async (input) => {
    const db = getDb();
    if (!db) throw new Error("DB connection unavailable");
    return await saveDbSkill(db, input);
  }),
  deleteSkill: implementer.deleteSkill.func(async (input) => {
    const db = getDb();
    if (!db) throw new Error("DB connection unavailable");
    return await deleteDbSkill(db, input.id);
  }),
  getProjects: implementer.getProjects.func(async () => {
    const db = getDb();
    if (!db) throw new Error("DB connection unavailable");
    return await getDbProjects(db);
  }),
  saveProject: implementer.saveProject.func(async (input) => {
    const db = getDb();
    if (!db) throw new Error("DB connection unavailable");
    return await saveDbProject(db, input);
  }),
  deleteProject: implementer.deleteProject.func(async (input) => {
    const db = getDb();
    if (!db) throw new Error("DB connection unavailable");
    return await deleteDbProject(db, input.id);
  }),
  getTimeline: implementer.getTimeline.func(async () => {
    const db = getDb();
    if (!db) throw new Error("DB connection unavailable");
    return await getDbTimeline(db);
  }),
  saveTimelineItem: implementer.saveTimelineItem.func(async (input) => {
    const db = getDb();
    if (!db) throw new Error("DB connection unavailable");
    return await saveDbTimelineItem(db, input);
  }),
  deleteTimelineItem: implementer.deleteTimelineItem.func(async (input) => {
    const db = getDb();
    if (!db) throw new Error("DB connection unavailable");
    return await deleteDbTimelineItem(db, input.id);
  })
});
