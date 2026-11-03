import type { Organization } from "../../../types";
import type { Task } from "../../tasks";
import type { Project, ProjectSourceType } from "../services/types";
import { deriveProposalTargetDate, getPortfolioDeadlineState } from "./deadlines";

export interface ProposalProgramGroup {
  id: string;
  title: string;
  projects: Project[];
}

export interface ProposalPortfolioGroup {
  id: string;
  proposalId: string;
  title: string;
  orgId?: string;
  sourceType: ProjectSourceType;
  sourceFileName?: string;
  sourceCollaborationDraftId?: string;
  programs: ProposalProgramGroup[];
  projectCount: number;
  taskCount: number;
  completedTaskCount: number;
  completedProjectCount: number;
  progress: number;
  targetDate?: string;
  deadlineTone: "none" | "on_track" | "due_soon" | "overdue" | "completed";
  deadlineLabel: string;
  completionRecommended: boolean;
  latestActivityAt: number;
}

interface ProjectHierarchyIdentity {
  proposalId: string;
  proposalTitle: string;
  programId: string;
  programTitle: string;
  sourceType: ProjectSourceType;
  sourceFileName?: string;
}

function hierarchyPosition(id: string, level: "program" | "project"): number | undefined {
  const match = id.match(new RegExp(`(?:^|-)${level}-(\\d+)(?:-|$)`, "i"));
  if (!match) return undefined;
  const position = Number(match[1]);
  return Number.isFinite(position) ? position : undefined;
}

function projectScheduleTime(project: Project): number {
  const value = project.startDate || project.targetDate;
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function compareProjectsByPlanOrder(a: Project, b: Project): number {
  const aPosition = hierarchyPosition(a.id, "project");
  const bPosition = hierarchyPosition(b.id, "project");
  if (aPosition !== undefined || bPosition !== undefined) {
    if (aPosition === undefined) return 1;
    if (bPosition === undefined) return -1;
    if (aPosition !== bPosition) return aPosition - bPosition;
  }

  const scheduleDifference = projectScheduleTime(a) - projectScheduleTime(b);
  if (scheduleDifference !== 0) return scheduleDifference;
  return a.createdAt - b.createdAt || a.title.localeCompare(b.title);
}

function compareProgramsByPlanOrder(a: ProposalProgramGroup, b: ProposalProgramGroup): number {
  const aPosition = hierarchyPosition(a.id, "program");
  const bPosition = hierarchyPosition(b.id, "program");
  if (aPosition !== undefined || bPosition !== undefined) {
    if (aPosition === undefined) return 1;
    if (bPosition === undefined) return -1;
    if (aPosition !== bPosition) return aPosition - bPosition;
  }

  const firstProjectDifference = compareProjectsByPlanOrder(a.projects[0], b.projects[0]);
  return firstProjectDifference || a.title.localeCompare(b.title);
}

const normalizedKey = (value: string) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";

function descriptionProposalTitle(description: string): string {
  return description.match(/^(?:Imported via proposal|Manual plan):\s*(.+)$/i)?.[1]?.trim() || "";
}

export function resolveProjectHierarchyIdentity(project: Project, tasks: Task[]): ProjectHierarchyIdentity {
  const linkedTasks = tasks.filter((task) => task.linkedProjectId === project.id);
  const hierarchyTask = linkedTasks.find((task) => task.proposalTitle || task.proposalId || task.programTitle);
  const inferredProposalTitle = descriptionProposalTitle(project.description);
  const proposalTitle = project.proposalTitle || hierarchyTask?.proposalTitle || inferredProposalTitle;
  const sourceType = project.sourceType
    || (/^Imported via proposal:/i.test(project.description) ? "ai_pdf" : /^Manual plan:/i.test(project.description) ? "manual" : "standalone");
  const proposalId = project.proposalId || hierarchyTask?.proposalId || (proposalTitle ? `proposal-${normalizedKey(proposalTitle)}` : "standalone");
  const programTitle = project.programTitle || hierarchyTask?.programTitle || (sourceType === "standalone" ? "Standalone projects" : "Uncategorized program");
  const programId = project.programId || hierarchyTask?.programId || `program-${normalizedKey(programTitle)}`;
  const sourceFileName = project.sourceFileName || (sourceType === "ai_pdf" && proposalTitle ? `${proposalTitle.replace(/\.pdf$/i, "")}.pdf` : undefined);

  return {
    proposalId,
    proposalTitle: proposalTitle || "Standalone work",
    programId,
    programTitle,
    sourceType,
    sourceFileName,
  };
}

export function projectMatchesProposalQuery(project: Project, tasks: Task[], query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  const identity = resolveProjectHierarchyIdentity(project, tasks);
  return [project.title, project.description, identity.proposalTitle, identity.programTitle, identity.sourceFileName]
    .filter(Boolean)
    .some((value) => value!.toLocaleLowerCase().includes(normalizedQuery));
}

export function buildProposalPortfolioGroups(projects: Project[], tasks: Task[]): ProposalPortfolioGroup[] {
  const groups = new Map<string, ProposalPortfolioGroup>();

  projects.forEach((project) => {
    const identity = resolveProjectHierarchyIdentity(project, tasks);
    const groupId = `${project.orgId || "unassigned"}:${identity.proposalId}`;
    const linkedTasks = tasks.filter((task) => task.linkedProjectId === project.id && !task.archivedAt && task.status !== "cancelled");
    const completedTaskCount = linkedTasks.filter((task) => task.status === "completed").length;
    let group = groups.get(groupId);
    if (!group) {
      group = {
        id: groupId,
        proposalId: identity.proposalId,
        title: identity.proposalTitle,
        orgId: project.orgId,
        sourceType: identity.sourceType,
        sourceFileName: identity.sourceFileName,
        sourceCollaborationDraftId: project.sourceCollaborationDraftId,
        programs: [],
        projectCount: 0,
        taskCount: 0,
        completedTaskCount: 0,
        completedProjectCount: 0,
        progress: 0,
        deadlineTone: "none",
        deadlineLabel: "No target date",
        completionRecommended: false,
        latestActivityAt: project.updatedAt,
      };
      groups.set(groupId, group);
    }

    let program = group.programs.find((candidate) => candidate.id === identity.programId);
    if (!program) {
      program = { id: identity.programId, title: identity.programTitle, projects: [] };
      group.programs.push(program);
    }
    program.projects.push(project);
    group.projectCount += 1;
    group.taskCount += linkedTasks.length;
    group.completedTaskCount += completedTaskCount;
    if (project.status === "completed") group.completedProjectCount += 1;
    group.latestActivityAt = Math.max(group.latestActivityAt, project.updatedAt);
    if (!group.sourceCollaborationDraftId && project.sourceCollaborationDraftId) {
      group.sourceCollaborationDraftId = project.sourceCollaborationDraftId;
    }
  });

  return Array.from(groups.values())
    .map((group) => {
      const programs = group.programs
        .map((program) => ({
          ...program,
          projects: [...program.projects].sort(compareProjectsByPlanOrder),
        }))
        .sort(compareProgramsByPlanOrder);
      const targetDate = deriveProposalTargetDate(programs);
      const completed = group.projectCount > 0 && group.completedProjectCount === group.projectCount;
      const deadline = getPortfolioDeadlineState(targetDate, completed);
      return {
        ...group,
        progress: group.taskCount ? Math.round((group.completedTaskCount / group.taskCount) * 100) : 0,
        programs,
        targetDate,
        deadlineTone: deadline.tone,
        deadlineLabel: deadline.label,
        completionRecommended: !completed && group.taskCount > 0 && group.completedTaskCount === group.taskCount,
      };
    })
    .sort((a, b) => b.latestActivityAt - a.latestActivityAt);
}

export function organizationTypeLabel(type: Organization["org_type"]): string {
  return type === "lgu" ? "LGU" : `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}
