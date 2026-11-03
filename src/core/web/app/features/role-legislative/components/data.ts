import { stableHashes } from "./primitives";

export interface Measure {
  trackingNo: string;
  title: string;
  author: string;
  authorInitials: string;
  dateReceived: string;
  stage: string;
  committee?: string;
  type: "Ordinance" | "Resolution";
  budget?: number;
}

export const measures: Measure[] = [
  { trackingNo: "ORD-2026-042", title: "An Ordinance Establishing the Ormoc City Sustainable Tourism and Eco-Park Zone", author: "Hon. R. Almario", authorInitials: "RA", dateReceived: "2026-03-05", stage: "Mayoral Approval", committee: "Committee on Tourism & Environment", type: "Ordinance", budget: 450 },
  { trackingNo: "ORD-2026-043", title: "An Ordinance Regulating Single-Use Plastics within Ormoc City Limits", author: "Hon. M. Delgado", authorInitials: "MD", dateReceived: "2026-03-10", stage: "Third Reading", committee: "Committee on Environment", type: "Ordinance" },
  { trackingNo: "ORD-2026-044", title: "An Ordinance Appropriating ₱5M for the Marine Litter Interception Program", author: "Hon. L. Santos", authorInitials: "LS", dateReceived: "2026-03-12", stage: "Second Reading", committee: "Committee on Appropriations", type: "Ordinance", budget: 5 },
  { trackingNo: "RES-2026-018", title: "Resolution Endorsing the City's Application for Green City Certification", author: "Hon. C. Torres", authorInitials: "CT", dateReceived: "2026-03-18", stage: "Committee Level", committee: "Committee on Tourism & Environment", type: "Resolution" },
  { trackingNo: "ORD-2026-045", title: "An Ordinance Amending the Ormoc City Revenue Code — Real Property Tax Adjustments", author: "Hon. J. Cruz", authorInitials: "JC", dateReceived: "2026-03-22", stage: "Committee Level", committee: "Committee on Appropriations", type: "Ordinance", budget: 0 },
  { trackingNo: "ORD-2026-046", title: "An Ordinance Creating the Ormoc City Digital Governance and eFlow Implementation Fund", author: "Hon. B. Navarro", authorInitials: "BN", dateReceived: "2026-03-28", stage: "First Reading", type: "Ordinance", budget: 8 },
  { trackingNo: "RES-2026-019", title: "Resolution Commending the Ormoc City Fire Department for Outstanding Service", author: "Hon. A. Reyes", authorInitials: "AR", dateReceived: "2026-04-01", stage: "First Reading", type: "Resolution" },
  { trackingNo: "ORD-2026-047", title: "An Ordinance Establishing a City-Wide CCTV Surveillance Network", author: "Hon. P. Garcia", authorInitials: "PG", dateReceived: "2026-04-05", stage: "First Reading", type: "Ordinance", budget: 12 },
  { trackingNo: "ORD-2026-048", title: "An Ordinance Mandating Disaster Preparedness Training in All Barangays", author: "Hon. E. Lim", authorInitials: "EL", dateReceived: "2026-04-08", stage: "Committee Level", committee: "Committee on Public Safety", type: "Ordinance", budget: 3 },
  { trackingNo: "RES-2026-020", title: "Resolution Urging DPWH to Expedite the Ormoc-Kananga Road Widening Project", author: "Hon. R. Almario", authorInitials: "RA", dateReceived: "2026-04-10", stage: "First Reading", type: "Resolution" },
];

export const adoptedOrdinances = [
  { number: "ORD-2025-038", title: "An Ordinance Imposing Fines for Illegal Dumping within the Eco-Park Zone", dateEnacted: "2025-12-15", status: "Active", hash: stableHashes[0], author: "Hon. R. Almario" },
  { number: "ORD-2025-035", title: "An Ordinance Establishing the Anti-Littering Program (#SHInEOrmoc)", dateEnacted: "2025-11-20", status: "Active", hash: stableHashes[1], author: "Hon. M. Delgado" },
  { number: "ORD-2025-031", title: "An Ordinance Appropriating the Annual Budget for FY 2026 — General Fund", dateEnacted: "2025-10-28", status: "Active", hash: stableHashes[2], author: "Hon. L. Santos" },
  { number: "ORD-2025-028", title: "An Ordinance Regulating Tricycle Operations within the City Center", dateEnacted: "2025-09-15", status: "Amended", hash: stableHashes[3], author: "Hon. C. Torres" },
  { number: "ORD-2025-024", title: "An Ordinance Granting Tax Incentives for Ormoc City-based Startups", dateEnacted: "2025-08-02", status: "Active", hash: stableHashes[4], author: "Hon. J. Cruz" },
  { number: "ORD-2024-055", title: "An Ordinance Prohibiting the Sale of Alcohol within 200m of Schools", dateEnacted: "2024-06-18", status: "Active", hash: stableHashes[5], author: "Hon. B. Navarro" },
  { number: "ORD-2024-048", title: "An Ordinance Creating the Ormoc City Scholarship Fund", dateEnacted: "2024-04-22", status: "Active", hash: "0xA2B4C6D8E0F1A3B5C7D9E1F3A5B7C9D1E3F5A7B9C0D2E4F6A8B0C2D4E6F8A0", author: "Hon. A. Reyes" },
  { number: "ORD-2024-041", title: "An Ordinance Declaring Ormoc City as a Plastic-Free Zone (Original)", dateEnacted: "2024-02-14", status: "Repealed", hash: "0xB3C5D7E9F1A2B4C6D8E0F2A4B6C8D0E2F4A6B8C1D3E5F7A9B1C3D5E7F9A1B3", author: "Hon. M. Delgado" },
];

// ==================== 6.1 PARENT: ACTIVE MEASURES PIPELINE ====================

export const stageColors: Record<string, string> = {
  "First Reading": "#3B82F6",
  "Committee Level": "#8B5CF6",
  "Second Reading": "#F59E0B",
  "Third Reading": "#F97316",
  "Mayoral Approval": "#06B6D4",
};
