import * as fs from "node:fs";
import * as path from "node:path";
import { EVENTS, EXPERIENCES, PROJECTS } from "../../apps/portfolio/src/data/registry";

// Technology categories map for classification
const techToCategoryMap: Record<string, string> = {
  // Programming Languages
  TypeScript: "Programming Languages",
  Go: "Programming Languages",
  Dart: "Programming Languages",
  Python: "Programming Languages",
  Java: "Programming Languages",
  R: "Programming Languages",
  Solidity: "Programming Languages",
  Kotlin: "Programming Languages",
  JavaScript: "Programming Languages",
  PHP: "Programming Languages",
  "R Programming": "Programming Languages",

  // Backend
  "Node.js": "Backend",
  "Hono.js": "Backend",
  Keycloak: "Backend",
  "Drizzle ORM": "Backend",
  Bun: "Backend",
  Elysia: "Backend",
  ORPC: "Backend",
  Express: "Backend",
  Firebase: "Backend",
  "Firebase Genkit": "Backend",
  Prisma: "Backend",
  GORM: "Backend",
  FastAPI: "Backend",
  BullMQ: "Backend",

  // Frontend
  React: "Frontend",
  "Next.js": "Frontend",
  "TanStack Start": "Frontend",
  "TanStack Query": "Frontend",
  Flutter: "Frontend",
  "Redux Toolkit": "Frontend",
  "Framer Motion": "Frontend",
  GSAP: "Frontend",
  Recharts: "Frontend",
  "Tailwind CSS": "Frontend",
  "Jetpack Compose": "Frontend",
  HTML5: "Frontend",
  CSS3: "Frontend",
  Leaflet: "Frontend",
  HTML: "Frontend",
  CSS: "Frontend",

  // Databases
  PostgreSQL: "Databases",
  MySQL: "Databases",
  Supabase: "Databases",
  pgvector: "Databases",
  Redis: "Databases",
  SQLite: "Databases",
  DynamoDB: "Databases",
  Room: "Databases",
  SQLCipher: "Databases",
  PostGIS: "Databases",
  Firestore: "Databases",

  // Tools
  Git: "Tools",
  Linux: "Tools",
  Jira: "Tools",
  Biome: "Tools",
  PNPM: "Tools",
  Turborepo: "Tools",
  Vite: "Tools",
  Obsidian: "Tools",
  Hardhat: "Tools",
  "The Graph": "Tools",
  "Discord Webhooks": "Tools",
  "Cloud Storage": "Tools",
  "Cloud Pub/Sub": "Tools",
  "Telegram Bot": "Tools",
  "Cloudflare Tunnel": "Tools",
  Postman: "Tools",
  Vitest: "Tools",
  "Biometric Auth": "Tools",
  "ERP Systems": "Tools",

  // DevOps
  Docker: "DevOps",
  "Docker Compose": "DevOps",
  "Google Cloud": "DevOps",
  GCP: "DevOps",
  AWS: "DevOps",
  Cloudflare: "DevOps",
  Vercel: "DevOps",
  "Oracle Cloud": "DevOps",
  "GitHub Actions": "DevOps",
  TRON: "DevOps",
  OAuth: "DevOps",
  "AWS Amplify": "DevOps",
  Stripe: "DevOps",
  "Sui SDK": "DevOps",
  zkLogin: "DevOps",
  "Oasis ROFL": "DevOps",
  Atlas: "DevOps",
  Blnk: "DevOps",
  Viem: "DevOps",

  // AI & Intelligence
  Ollama: "AI & Intelligence",
  Gemini: "AI & Intelligence",
  OpenCV: "AI & Intelligence",
  LangChain: "AI & Intelligence",
  "Vertex AI": "AI & Intelligence",
  "Amazon Bedrock": "AI & Intelligence",
  "Amazon Comprehend": "AI & Intelligence",
  "Amazon Translate": "AI & Intelligence",
  "Amazon Transcribe": "AI & Intelligence",
  "Amazon Polly": "AI & Intelligence",
  BERT: "AI & Intelligence",
  PyTorch: "AI & Intelligence",
  "Hugging Face Transformers": "AI & Intelligence",
  "ILMU-GLM-5.1": "AI & Intelligence",
  "Whisper.cpp": "AI & Intelligence",
  "GLM-OCR": "AI & Intelligence",
  "ML Kit OCR": "AI & Intelligence",
};

function escapeSql(value: string | null | undefined): string {
  if (value === undefined || value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function main() {
  const sqlLines: string[] = [
    "-- Seed data for portfolio database",
    "DELETE FROM project_skills;",
    "DELETE FROM project_achievements;",
    "DELETE FROM projects;",
    "DELETE FROM timeline_skills;",
    "DELETE FROM timeline_achievements;",
    "DELETE FROM timeline;",
    "DELETE FROM skills;",
    "",
  ];

  // 1. Gather all unique skills/technologies
  const skillSet = new Set<string>();
  PROJECTS.forEach((p: any) => p.technologies?.forEach((t: any) => skillSet.add(t)));
  EXPERIENCES.forEach((e: any) => e.technologies?.forEach((t: any) => skillSet.add(t)));
  EVENTS.forEach((ev: any) => ev.technologies?.forEach((t: any) => skillSet.add(t)));

  const skillList = Array.from(skillSet).sort();
  const skillMap = new Map<string, number>();

  sqlLines.push("-- Insert Skills");
  skillList.forEach((skillName: string, index) => {
    const id = index + 1;
    skillMap.set(skillName, id);
    const category = techToCategoryMap[skillName] || "Others";
    sqlLines.push(
      `INSERT INTO skills (id, name, category) VALUES (${id}, ${escapeSql(skillName)}, ${escapeSql(category)});`,
    );
  });
  sqlLines.push("");

  // 2. Insert Projects
  sqlLines.push("-- Insert Projects & Achievements");
  PROJECTS.forEach((proj: any, index) => {
    const projectId = index + 1;
    const githubUrl = proj.githubUrl || null;
    const videoUrl = proj.videoUrl || null;
    const imageUrl = proj.imageUrl || null;
    const category = proj.category || "open-source"; // Match project categories

    sqlLines.push(
      `INSERT INTO projects (id, category, title, subtitle, description, github_url, video_url, image_url, sort_order) VALUES (${projectId}, ${escapeSql(category)}, ${escapeSql(proj.title)}, ${escapeSql(proj.subtitle)}, ${escapeSql(proj.description)}, ${escapeSql(githubUrl)}, ${escapeSql(videoUrl)}, ${escapeSql(imageUrl)}, ${projectId});`,
    );

    // Achievements
    proj.achievements?.forEach((achievement: string) => {
      sqlLines.push(
        `INSERT INTO project_achievements (project_id, content) VALUES (${projectId}, ${escapeSql(achievement)});`,
      );
    });

    // Project Skills Junction
    proj.technologies?.forEach((techName: string) => {
      const skillId = skillMap.get(techName);
      if (skillId) {
        sqlLines.push(
          `INSERT INTO project_skills (project_id, skill_id) VALUES (${projectId}, ${skillId});`,
        );
      }
    });
  });
  sqlLines.push("");

  // 3. Insert Timeline items (Experiences & Events combined)
  sqlLines.push("-- Insert Timeline Items");
  let timelineIdCounter = 1;

  // Track map to populate junction skills for experiences
  EXPERIENCES.forEach((exp: any) => {
    const timelineId = timelineIdCounter++;
    const category = exp.id.startsWith("edu-") ? "education" : "internship";
    const isFeatured = 0; // Default to false (0) for experiences

    sqlLines.push(
      `INSERT INTO timeline (id, title, subtitle, date_display, description, category, outcome, sort_key, is_featured) VALUES (${timelineId}, ${escapeSql(exp.role)}, ${escapeSql(exp.company)}, ${escapeSql(exp.period)}, ${escapeSql(exp.description)}, ${escapeSql(category)}, NULL, ${exp.sortKey}, ${isFeatured});`,
    );

    // Achievements
    exp.achievements?.forEach((achievement: string) => {
      sqlLines.push(
        `INSERT INTO timeline_achievements (timeline_id, content) VALUES (${timelineId}, ${escapeSql(achievement)});`,
      );
    });

    // Skills
    exp.technologies?.forEach((techName: string) => {
      const skillId = skillMap.get(techName);
      if (skillId) {
        sqlLines.push(
          `INSERT INTO timeline_skills (timeline_id, skill_id) VALUES (${timelineId}, ${skillId});`,
        );
      }
    });
  });

  // Events
  EVENTS.forEach((evt: any) => {
    const timelineId = timelineIdCounter++;
    const isFeatured = evt.featured ? 1 : 0;

    sqlLines.push(
      `INSERT INTO timeline (id, title, subtitle, date_display, description, category, outcome, sort_key, is_featured) VALUES (${timelineId}, ${escapeSql(evt.title)}, ${escapeSql(evt.event)}, ${escapeSql(evt.date)}, ${escapeSql(evt.description)}, ${escapeSql(evt.category)}, ${escapeSql(evt.outcome)}, ${evt.sortKey}, ${isFeatured});`,
    );

    // Skills
    evt.technologies?.forEach((techName: string) => {
      const skillId = skillMap.get(techName);
      if (skillId) {
        sqlLines.push(
          `INSERT INTO timeline_skills (timeline_id, skill_id) VALUES (${timelineId}, ${skillId});`,
        );
      }
    });
  });

  // Write out the SQL file
  fs.writeFileSync(path.join(process.cwd(), "seed.sql"), sqlLines.join("\n"));
  console.log("✅ Generated packages/db/seed.sql successfully!");
}

main();
