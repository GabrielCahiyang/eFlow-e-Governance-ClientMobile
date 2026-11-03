export const pillarData = [
  { name: "Infrastructure", value: 38, color: "#2563EB" },
  { name: "Health", value: 22, color: "#10B981" },
  { name: "Eco-Tourism", value: 18, color: "#F59E0B" },
  { name: "Education", value: 12, color: "#8B5CF6" },
  { name: "Governance", value: 10, color: "#EC4899" },
];

export const projectBatteries = [
  { project: "Lake Danao Road Expansion", completion: 64, workforce: 142, status: "On Track", phases: [{ name: "Planning", pct: 100, color: "#10B981" }, { name: "Procurement", pct: 100, color: "#2563EB" }, { name: "Execution", pct: 45, color: "#F59E0B" }, { name: "Liquidation", pct: 0, color: "#9CA3AF" }] },
  { project: "Ormoc Smart Clinic Network", completion: 41, workforce: 87, status: "At Risk", phases: [{ name: "Planning", pct: 100, color: "#10B981" }, { name: "Procurement", pct: 78, color: "#2563EB" }, { name: "Execution", pct: 12, color: "#F59E0B" }, { name: "Liquidation", pct: 0, color: "#9CA3AF" }] },
  { project: "Eco-Park Revitalization", completion: 82, workforce: 203, status: "On Track", phases: [{ name: "Planning", pct: 100, color: "#10B981" }, { name: "Procurement", pct: 100, color: "#2563EB" }, { name: "Execution", pct: 89, color: "#F59E0B" }, { name: "Liquidation", pct: 38, color: "#9CA3AF" }] },
  { project: "Digital Public Records System", completion: 28, workforce: 34, status: "Delayed", phases: [{ name: "Planning", pct: 100, color: "#10B981" }, { name: "Procurement", pct: 52, color: "#2563EB" }, { name: "Execution", pct: 0, color: "#F59E0B" }, { name: "Liquidation", pct: 0, color: "#9CA3AF" }] },
];

export const burnDownData = [
  { month: "Jan", advanced: 120, liquidated: 45 },
  { month: "Feb", advanced: 185, liquidated: 92 },
  { month: "Mar", advanced: 240, liquidated: 148 },
  { month: "Apr", advanced: 310, liquidated: 201 },
  { month: "May", advanced: 365, liquidated: 255 },
  { month: "Jun", advanced: 420, liquidated: 310 },
  { month: "Jul", advanced: 488, liquidated: 368 },
  { month: "Aug", advanced: 540, liquidated: 412 },
  { month: "Sep", advanced: 595, liquidated: 465 },
  { month: "Oct", advanced: 640, liquidated: 502 },
];

export const deptEfficiency = [
  { dept: "Engineering", velocity: 94, pending: "₱2.1M", status: "Fast", daysAvg: 4.2 },
  { dept: "Health", velocity: 88, pending: "₱3.4M", status: "Fast", daysAvg: 5.1 },
  { dept: "BPLO", velocity: 76, pending: "₱5.8M", status: "Moderate", daysAvg: 8.7 },
  { dept: "Social Welfare", velocity: 71, pending: "₱4.2M", status: "Moderate", daysAvg: 9.3 },
  { dept: "Eco-Tourism", velocity: 62, pending: "₱8.1M", status: "Slow", daysAvg: 14.2 },
  { dept: "Agriculture", velocity: 58, pending: "₱6.7M", status: "Slow", daysAvg: 16.8 },
  { dept: "General Services", velocity: 45, pending: "₱12.3M", status: "Slow", daysAvg: 22.1 },
];

export const bottleneckCards = [
  { project: "Smart Clinic Network", stuckAt: "Finance Scrutiny", duration: 14, assignee: "M. Reyes", dept: "Finance", severity: "Critical", sla: "7 days" },
  { project: "Lake Danao Access Road", stuckAt: "BAC Evaluation", duration: 21, assignee: "J. Santos", dept: "BAC Secretariat", severity: "Critical", sla: "10 days" },
  { project: "Digital Records Phase 2", stuckAt: "IT Security Audit", duration: 9, assignee: "R. Cruz", dept: "MIS", severity: "Warning", sla: "5 days" },
  { project: "Eco-Park Restroom Facility", stuckAt: "Mayor's Approval", duration: 6, assignee: "Office of the Mayor", dept: "Executive", severity: "Warning", sla: "3 days" },
  { project: "Mobile Health Unit Procurement", stuckAt: "COA Pre-Audit", duration: 18, assignee: "L. Tan", dept: "COA Liaison", severity: "Critical", sla: "7 days" },
  { project: "BPLO System Upgrade", stuckAt: "Vendor Negotiation", duration: 11, assignee: "P. Garcia", dept: "BPLO", severity: "Warning", sla: "10 days" },
];

export const kanbanCols = ["Finance Scrutiny", "BAC / Procurement", "Approval Pending"];
