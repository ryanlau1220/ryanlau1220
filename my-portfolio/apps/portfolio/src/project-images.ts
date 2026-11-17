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
