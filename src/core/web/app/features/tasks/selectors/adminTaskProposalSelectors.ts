import type { Task } from "../taskTypes";
import { isOverdue } from "./lifecycle";

export interface AdminTaskProjectGroup {
  id: string;
  title: string;
  tasks: Task[];
  completedCount: number;
  overdueCount: number;
  reviewCount: number;
  progress: number;
}

export interface AdminTaskProgramGroup {
  id: string;
  title: string;
  projects: AdminTaskProjectGroup[];
}

export interface AdminTaskProposalGroup {
  id: string;
  title: string;
  orgId?: string;
  source: "imported" | "manual";
  programs: AdminTaskProgramGroup[];
  projectCount: number;
  taskCount: number;
  completedCount: number;
  overdueCount: number;
  reviewCount: number;
  progress: number;
  latestActivityAt: number;
}

interface TaskCollectionMetrics {
  completedCount: number;
  overdueCount: number;
  reviewCount: number;
  progress: number;
}

const normalizedKey = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";

function taskMetrics(tasks: Task[]): TaskCollectionMetrics {
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const overdueCount = tasks.filter((task) => isOverdue(task)).length;
  const reviewCount = tasks.filter((task) => task.status === "for_review").length;
  const progress = tasks.length
    ? Math.round(tasks.reduce((total, task) => total + Math.max(0, Math.min(100, task.percentComplete ?? 0)), 0) / tasks.length)
    : 0;
  return { completedCount, overdueCount, reviewCount, progress };
}

function proposalIdentity(task: Task): { id: string; title: string; source: AdminTaskProposalGroup["source"] } {
  const title = task.proposalTitle?.trim();
  if (!title) {
    return {
      id: `standalone-${task.orgId || "unassigned"}`,
      title: "Standalone operational work",
      source: "manual",
    };
  }
  return {
    id: task.proposalId || task.importBatchId || `proposal-${normalizedKey(title)}`,
    title,
    source: task.importBatchId ? "imported" : "manual",
  };
}

function programIdentity(task: Task): { id: string; title: string } {
  const title = task.programTitle?.trim() || "Uncategorized program";
  return { id: task.programId || `program-${normalizedKey(title)}`, title };
}

function projectIdentity(task: Task): { id: string; title: string } {
  const title = task.projectTitle?.trim() || "General / unlinked project";
  return {
    id: task.linkedProjectId || task.projectId || `project-${normalizedKey(title)}`,
    title,
  };
}

function hierarchyPosition(id: string, level: "program" | "project"): number | undefined {
  const match = id.match(new RegExp(`(?:^|-)${level}-(\\d+)(?:-|$)`, "i"));
  if (!match) return undefined;
  const position = Number(match[1]);
  return Number.isFinite(position) ? position : undefined;
}

function compareHierarchy(a: { id: string; title: string }, b: { id: string; title: string }, level: "program" | "project"): number {
  const aPosition = hierarchyPosition(a.id, level);
  const bPosition = hierarchyPosition(b.id, level);
  if (aPosition !== undefined || bPosition !== undefined) {
    if (aPosition === undefined) return 1;
    if (bPosition === undefined) return -1;
    if (aPosition !== bPosition) return aPosition - bPosition;
  }
  return a.title.localeCompare(b.title);
}

export function buildAdminTaskProposalGroups(tasks: Task[]): AdminTaskProposalGroup[] {
  const proposalMap = new Map<string, AdminTaskProposalGroup>();

  tasks.forEach((task) => {
    const proposal = proposalIdentity(task);
    const proposalKey = `${task.orgId || "unassigned"}:${proposal.id}`;
    let proposalGroup = proposalMap.get(proposalKey);
    if (!proposalGroup) {
      proposalGroup = {
        id: proposalKey,
        title: proposal.title,
        orgId: task.orgId,
        source: proposal.source,
        programs: [],
        projectCount: 0,
        taskCount: 0,
        completedCount: 0,
        overdueCount: 0,
        reviewCount: 0,
        progress: 0,
        latestActivityAt: task.updatedAt,
      };
      proposalMap.set(proposalKey, proposalGroup);
    }

    const program = programIdentity(task);
    let programGroup = proposalGroup.programs.find((candidate) => candidate.id === program.id);
    if (!programGroup) {
      programGroup = { ...program, projects: [] };
      proposalGroup.programs.push(programGroup);
    }

    const project = projectIdentity(task);
    let projectGroup = programGroup.projects.find((candidate) => candidate.id === project.id);
    if (!projectGroup) {
      projectGroup = { ...project, tasks: [], completedCount: 0, overdueCount: 0, reviewCount: 0, progress: 0 };
      programGroup.projects.push(projectGroup);
    }
    projectGroup.tasks.push(task);
    proposalGroup.latestActivityAt = Math.max(proposalGroup.latestActivityAt, task.updatedAt);
  });

  return Array.from(proposalMap.values())
    .map((proposal) => {
      const proposalTasks = proposal.programs.flatMap((program) => program.projects.flatMap((project) => project.tasks));
      const proposalMetrics = taskMetrics(proposalTasks);
      const programs = proposal.programs
        .map((program) => ({
          ...program,
          projects: program.projects
            .map((project) => ({
              ...project,
              tasks: [...project.tasks].sort((a, b) => b.updatedAt - a.updatedAt),
              ...taskMetrics(project.tasks),
            }))
            .sort((a, b) => compareHierarchy(a, b, "project")),
        }))
        .sort((a, b) => compareHierarchy(a, b, "program"));
      return {
        ...proposal,
        ...proposalMetrics,
        programs,
        projectCount: programs.reduce((total, program) => total + program.projects.length, 0),
        taskCount: proposalTasks.length,
      };
    })
    .sort((a, b) => b.latestActivityAt - a.latestActivityAt || a.title.localeCompare(b.title));
}
