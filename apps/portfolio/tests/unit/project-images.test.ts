import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PROJECTS } from "../../src/data/registry";
import { PROJECT_IMAGE_DIMENSIONS } from "../../src/project-images";

const PUBLIC_DIR = fileURLToPath(new URL("../../public", import.meta.url));

// A PNG stores its width and height as big-endian integers at bytes 16-23 of the IHDR chunk.
function readPngSize(publicPath: string) {
  const header = readFileSync(`${PUBLIC_DIR}${publicPath}`).subarray(0, 24);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

describe("project image dimensions", () => {
  const projectsWithImages = PROJECTS.filter((project) => project.imageUrl);

  it("lists dimensions for exactly the projects that have a screenshot", () => {
    expect(Object.keys(PROJECT_IMAGE_DIMENSIONS).sort()).toEqual(
      projectsWithImages.map((project) => project.id).sort(),
    );
  });

  it("matches the intrinsic size of each screenshot", () => {
    for (const project of projectsWithImages) {
      expect(PROJECT_IMAGE_DIMENSIONS[project.id], project.id).toEqual(
        readPngSize(project.imageUrl!),
      );
    }
  });
});
