import type { Project } from "./data/registry";

export function getProjectPreviewUrl(project: Project) {
  return project.previewImageUrl ?? project.imageUrl?.replace("image.png", "preview.webp");
}

export function getMobileProjectPreviewUrl(project: Project) {
  return (
    project.mobilePreviewImageUrl ??
    project.previewImageUrl ??
    project.imageUrl?.replace("image.png", "preview-mobile.webp")
  );
}

// Intrinsic size of each project's image.png, used as the screenshot's width/height hint.
// tests/unit/project-images.test.ts keeps this table in sync with the registry.
export const PROJECT_IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "apu-asc": { width: 1920, height: 947 },
  openchain: { width: 1920, height: 947 },
  gammashield: { width: 1440, height: 900 },
  "nexus-net": { width: 1440, height: 900 },
  trustrun: { width: 1440, height: 900 },
  "wake-me-up": { width: 1280, height: 720 },
  promptplay: { width: 1440, height: 900 },
  buildforward: { width: 1440, height: 900 },
  "quora-chat": { width: 1919, height: 948 },
  "analog-blindspot": { width: 1440, height: 900 },
  grocerly: { width: 1080, height: 2250 },
  "llm-wiki": { width: 1920, height: 947 },
  ledgertrace: { width: 1920, height: 947 },
  umhackathon: { width: 1279, height: 1079 },
  "myai-future": { width: 1920, height: 947 },
  kitahack: { width: 1618, height: 844 },
  greatmalaysiaai: { width: 1129, height: 559 },
  devmatch: { width: 1920, height: 947 },
  futurehack: { width: 1920, height: 947 },
};
