export interface TranscriptEntry {
  id: number;
  speaker: string;
  initials: string;
  role: string;
  text: string;
  timestamp: string;
  isOfficial?: boolean;
  editedBySecretariat?: boolean;
}

export const liveTranscript: TranscriptEntry[] = [
  { id: 1, speaker: "Vice Mayor F. Reyes", initials: "FR", role: "Presiding Officer", text: "The 142nd Regular Session of the Sangguniang Panlungsod ng Ormoc City is hereby called to order. Madam Secretary, kindly call the roll.", timestamp: "10:00:12" },
  { id: 2, speaker: "Sec. A. Mendoza", initials: "AM", role: "SP Secretary", text: "Thank you, Your Honor. Calling the roll… Hon. Almario?", timestamp: "10:00:28" },
  { id: 3, speaker: "Hon. R. Almario", initials: "RA", role: "Councilor", text: "Present.", timestamp: "10:00:35" },
  { id: 4, speaker: "Sec. A. Mendoza", initials: "AM", role: "SP Secretary", text: "Hon. Delgado?", timestamp: "10:00:37" },
  { id: 5, speaker: "Hon. M. Delgado", initials: "MD", role: "Councilor", text: "Present.", timestamp: "10:00:39" },
  { id: 6, speaker: "Sec. A. Mendoza", initials: "AM", role: "SP Secretary", text: "Your Honor, all 12 members are present. We have a quorum.", timestamp: "10:01:15" },
  { id: 7, speaker: "Vice Mayor F. Reyes", initials: "FR", role: "Presiding Officer", text: "Very well. The Chair recognizes the presence of a quorum. We shall now proceed to the approval of the minutes from the 141st Regular Session. Are there any corrections or amendments? Hearing none, the minutes are deemed approved.", timestamp: "10:01:32" },
  { id: 8, speaker: "Vice Mayor F. Reyes", initials: "FR", role: "Presiding Officer", text: "We now move to the Reference of Business. Madam Secretary, please read the first measure.", timestamp: "10:04:55" },
  { id: 9, speaker: "Sec. A. Mendoza", initials: "AM", role: "SP Secretary", text: "First measure: Proposed Ordinance Number 2026-046, authored by Honorable B. Navarro, entitled — An Ordinance Creating the Ormoc City Digital Governance and eFlow Implementation Fund, appropriating Eight Million Pesos therefor.", timestamp: "10:05:08" },
  { id: 10, speaker: "Hon. B. Navarro", initials: "BN", role: "Councilor", text: "Mr. Presiding Officer, I respectfully move that Proposed Ordinance 2026-046 be referred to the Committee on Appropriations and the Committee on Good Government for joint deliberation.", timestamp: "10:05:42" },
  { id: 11, speaker: "Hon. L. Santos", initials: "LS", role: "Councilor", text: "I second the motion, Your Honor.", timestamp: "10:05:58" },
  { id: 12, speaker: "Vice Mayor F. Reyes", initials: "FR", role: "Presiding Officer", text: "It has been moved and duly seconded. Is there any objection? Hearing none, the motion is approved. ORD-2026-046 is hereby referred to the Committee on Appropriations and the Committee on Good Government.", timestamp: "10:06:05", isOfficial: true },
];

// Session summaries

export const sessionSummaries = [
  {
    id: "SUM-142",
    session: "142nd Regular Session",
    date: "2026-04-16",
    status: "AI Generated" as const,
    duration: "3h 42m",
    motionsPassed: [
      "Referral of ORD-2026-046 (eFlow Fund) to Committee on Appropriations",
      "Referral of RES-2026-019 (Fire Dept. Commendation) to Committee on Good Government",
      "Referral of ORD-2026-047 (CCTV Network) to Committee on Public Safety",
      "Committee Report CR-2026-017 received and noted (Favorable for Marine Litter Interception)",
      "ORD-2026-044 (Marine Litter) passed on Second Reading with 3 amendments",
      "ORD-2026-043 (Single-Use Plastics) passed on Third Reading — Vote: 9-2-1",
    ],
    measuresDeferred: [
      "ORD-2026-041 (Barangay Disaster Preparedness) — deferred to 143rd Session due to pending DILG consultation",
    ],
    keyDebates: [
      { topic: "Marine Litter Appropriation Increase", summary: "Hon. Santos proposed increasing appropriation from ₱5M to ₱7.5M to cover Ormoc Bay coastal operations. Hon. Cruz raised fiscal concerns citing Q2 revenue shortfall. Motion to increase carried 8-3-1.", dissenting: "Hon. Cruz, Hon. Ong, Hon. Tan" },
      { topic: "CCTV Surveillance Privacy Concerns", summary: "Hon. Lim raised concerns about civil liberties and data retention periods. Requested the inclusion of a data destruction clause in committee deliberations.", dissenting: "Motion to defer was defeated 4-7-1" },
    ],
    attendees: 12,
    totalAttendees: 12,
  },
  {
    id: "SUM-141",
    session: "141st Regular Session",
    date: "2026-04-09",
    status: "Finalized" as const,
    duration: "4h 15m",
    motionsPassed: [
      "ORD-2026-042 (Sustainable Tourism & Eco-Park) passed on Third Reading — Vote: 9-2-1",
      "Referral of ORD-2026-048 (Disaster Preparedness) to Committee on Public Safety",
    ],
    measuresDeferred: [
      "ORD-2026-041 (Barangay Disaster Preparedness) — deferred pending DILG input",
    ],
    keyDebates: [
      { topic: "Eco-Park Budget Allocation", summary: "Extended debate on the ₱450M multi-year commitment. Committee on Appropriations presented fiscal impact assessment. AI NPV analysis cited favorably by the Committee Chair.", dissenting: "Hon. Cruz (fiscal concerns), Hon. Ong (timeline concerns)" },
    ],
    attendees: 12,
    totalAttendees: 12,
  },
];

// Archived sessions for search

export const archivedSessions = [
  { session: "140th", date: "2026-04-02", measures: 8, duration: "3h 18m" },
  { session: "139th", date: "2026-03-26", measures: 6, duration: "2h 55m" },
  { session: "138th", date: "2026-03-19", measures: 11, duration: "4h 42m" },
  { session: "137th", date: "2026-03-12", measures: 7, duration: "3h 05m" },
  { session: "136th", date: "2026-03-05", measures: 9, duration: "3h 38m" },
  { session: "135th", date: "2026-02-26", measures: 5, duration: "2h 20m" },
];

// ==================== ORDER OF BUSINESS ====================

// Councilor data for dropdowns
