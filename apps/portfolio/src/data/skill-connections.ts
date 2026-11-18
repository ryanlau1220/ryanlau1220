import { EVENTS, type EventItem, type Experience, type Project } from "./registry";

// Event skills describe the associated hackathon project. Education and work
// entries cover broader experience, so their skills must not be attributed back
// to one project automatically.
export function projectSkills(project: Project, events: EventItem[] = EVENTS): string[] {
  const event = events.find((item) => item.id === project.timelineId);
  return event
    ? [...new Set([...project.technologies, ...event.technologies])]
    : project.technologies;
}

export function projectMatchesSkill(
  project: Project,
  skill: string,
  events?: EventItem[],
): boolean {
  return projectSkills(project, events).includes(skill) || project.domains.includes(skill);
}

export function timelineSkills(
  item: Experience | EventItem,
  projects: Project[],
  events: EventItem[] = EVENTS,
): string[] {
  return [
    ...new Set([
      ...item.technologies,
      ...projects
        .filter((project) => project.timelineId === item.id)
        .flatMap((project) => projectSkills(project, events)),
    ]),
  ];
}
