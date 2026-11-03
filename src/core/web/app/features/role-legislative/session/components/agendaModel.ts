import {nativeWindow as __nativeWindow} from '../../../../../../../platform/webRuntime';
import { useEffect, useRef, useState } from "react";
export interface AgendaItem {
    id: number;
    title: string;
    type: string;
    ref?: string;
    author?: string;
    status: "done" | "broadcasting" | "pending" | "deferred" | "paused";
    group: string;
    duration?: string;
}
export const agendaItems: AgendaItem[] = [
    // Preliminary Matters
    { id: 1, title: "Call to Order", type: "Procedural", status: "done", group: "Preliminary Matters", duration: "2 min" },
    { id: 2, title: "Roll Call & Determination of Quorum", type: "Procedural", status: "done", group: "Preliminary Matters", duration: "3 min" },
    { id: 3, title: "Approval of Minutes — 141st Regular Session", type: "Procedural", ref: "MIN-2026-141", status: "done", group: "Preliminary Matters", duration: "5 min" },
    // Reference of Business
    { id: 4, title: "ORD-2026-046: Digital Governance and eFlow Implementation Fund", type: "First Reading", ref: "ORD-2026-046", author: "Hon. B. Navarro", status: "broadcasting", group: "Reference of Business (First Readings)" },
    { id: 5, title: "RES-2026-019: Commending the Ormoc City Fire Department", type: "First Reading", ref: "RES-2026-019", author: "Hon. A. Reyes", status: "pending", group: "Reference of Business (First Readings)" },
    { id: 6, title: "ORD-2026-047: City-Wide CCTV Surveillance Network", type: "First Reading", ref: "ORD-2026-047", author: "Hon. P. Garcia", status: "pending", group: "Reference of Business (First Readings)" },
    { id: 7, title: "RES-2026-020: Urging DPWH — Ormoc-Kananga Road Widening", type: "First Reading", ref: "RES-2026-020", author: "Hon. R. Almario", status: "pending", group: "Reference of Business (First Readings)" },
    // Committee Reports
    { id: 8, title: "Committee Report: Favorable — ORD-2026-044 Marine Litter Interception", type: "Committee Report", ref: "CR-2026-017", author: "Committee on Appropriations", status: "pending", group: "Committee Reports" },
    // Second Reading
    { id: 9, title: "ORD-2026-044: Marine Litter Interception Program (Amended)", type: "Second Reading", ref: "ORD-2026-044", author: "Hon. L. Santos", status: "pending", group: "Second Reading (Floor Debate)" },
    // Third Reading
    { id: 10, title: "ORD-2026-043: Regulating Single-Use Plastics", type: "Third Reading", ref: "ORD-2026-043", author: "Hon. M. Delgado", status: "pending", group: "Third Reading (Final Vote)" },
    // Unfinished Business
    { id: 11, title: "ORD-2026-041: Barangay Disaster Preparedness Training (Deferred from 141st)", type: "Unfinished Business", ref: "ORD-2026-041", status: "deferred", group: "Unfinished Business" },
    // Closing
    { id: 12, title: "Privilege Speeches", type: "Procedural", status: "pending", group: "Closing Matters" },
    { id: 13, title: "Adjournment", type: "Procedural", status: "pending", group: "Closing Matters" },
];
export const groupOrder = [
    "Preliminary Matters",
    "Reference of Business (First Readings)",
    "Committee Reports",
    "Second Reading (Floor Debate)",
    "Third Reading (Final Vote)",
    "Unfinished Business",
    "Closing Matters",
];
export const groupColors: Record<string, string> = {
    "Preliminary Matters": "#94A3B8",
    "Reference of Business (First Readings)": "#3B82F6",
    "Committee Reports": "#8B5CF6",
    "Second Reading (Floor Debate)": "#F59E0B",
    "Third Reading (Final Vote)": "#F97316",
    "Unfinished Business": "#EF4444",
    "Closing Matters": "#6B7280",
};
// Transcript data
export const councilorAvatars = [
    { name: "Hon. R. Almario", initials: "RA" },
    { name: "Hon. M. Delgado", initials: "MD" },
    { name: "Hon. L. Santos", initials: "LS" },
    { name: "Hon. C. Torres", initials: "CT" },
    { name: "Hon. J. Cruz", initials: "JC" },
    { name: "Hon. B. Navarro", initials: "BN" },
    { name: "Hon. A. Reyes", initials: "AR" },
    { name: "Hon. P. Garcia", initials: "PG" },
    { name: "Hon. E. Lim", initials: "EL" },
    { name: "Hon. D. Fernandez", initials: "DF" },
    { name: "Hon. S. Ong", initials: "SO" },
    { name: "Hon. G. Tan", initials: "GT" },
];
export const drawerItemTypes = ["Procedural", "First Reading", "Committee Report", "Second Reading", "Third Reading", "Unfinished Business", "Privilege Speech", "Resolution"];
// Per-item accumulated timer system — tracks elapsed seconds per item, resumes on re-broadcast
export function useItemTimers(items: AgendaItem[], sessionActive: boolean) {
    // accumulated[id] = total seconds this item has been on floor across all broadcast windows
    const [accumulated, setAccumulated] = useState<Record<number, number>>({});
    const intervalRef = useRef<number | null>(null);
    // Find the currently broadcasting item
    const broadcastingId = items.find(i => i.status === "broadcasting")?.id ?? null;
    useEffect(() => {
        if (broadcastingId !== null && sessionActive) {
            intervalRef.current = __nativeWindow.setInterval(() => {
                setAccumulated(prev => ({
                    ...prev,
                    [broadcastingId]: (prev[broadcastingId] || 0) + 1,
                }));
            }, 1000);
        }
        else {
            if (intervalRef.current) {
                __nativeWindow.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
        return () => {
            if (intervalRef.current)
                __nativeWindow.clearInterval(intervalRef.current);
        };
    }, [broadcastingId, sessionActive]);
    const formatTime = (id: number) => {
        const secs = accumulated[id] || 0;
        const mm = String(Math.floor(secs / 60)).padStart(2, "0");
        const ss = String(secs % 60).padStart(2, "0");
        return `${mm}:${ss}`;
    };
    return { accumulated, formatTime, broadcastingId };
}
// Interruption Warning Modal — fires when switching broadcast while another item is still active/paused
