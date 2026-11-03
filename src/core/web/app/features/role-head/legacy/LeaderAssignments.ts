// Type declarations extracted from the web presentation module.
import type {RosterMember} from "./TeamAssignments";
type LeaderRole = {
    id: string;
    title: string;
    responsibilities: string[];
    permissions: string[];
    assignee?: RosterMember;
};