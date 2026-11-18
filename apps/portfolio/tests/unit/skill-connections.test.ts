import { describe, expect, it } from "vitest";
import { EVENTS, EXPERIENCES, PROJECTS, TECHNOLOGY_CATEGORIES } from "../../src/data/registry";

describe("skill connections", () => {
  it("connects every displayed skill to a project or timeline entry", () => {
    const entries = [...PROJECTS, ...EXPERIENCES, ...EVENTS];
    const unconnected = Object.keys(TECHNOLOGY_CATEGORIES).filter(
      (skill) =>
        !entries.some((entry) => entry.technologies.some((technology) => technology === skill)),
    );
    expect(unconnected).toEqual([]);
  });
});
