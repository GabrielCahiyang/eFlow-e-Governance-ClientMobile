export interface CampaignTask {
  activity: string;
  date: string;
  participation: number;
  budget: string;
  status: string;
  nlpUpdated: boolean;
}

export const campaignData: Record<string, CampaignTask[]> = {
  "Brgy. Ipil": [
    { activity: "Coastal Cleanup Drive", date: "Apr 8, 2026", participation: 127, budget: "₱45K", status: "Completed", nlpUpdated: true },
    { activity: "Information Drive — Plastic Ban", date: "Apr 14, 2026", participation: 0, budget: "₱18K", status: "Upcoming", nlpUpdated: false },
  ],
  "Brgy. Punta": [
    { activity: "River Cleanup + Sorting", date: "Apr 6, 2026", participation: 89, budget: "₱52K", status: "Completed", nlpUpdated: true },
    { activity: "School Eco-Education Module", date: "Apr 12, 2026", participation: 210, budget: "₱15K", status: "Working on it", nlpUpdated: false },
  ],
  "Brgy. Can-adieng": [
    { activity: "Mangrove Planting", date: "Apr 10, 2026", participation: 65, budget: "₱38K", status: "Completed", nlpUpdated: true },
    { activity: "Waste Audit Workshop", date: "Apr 16, 2026", participation: 0, budget: "₱22K", status: "Upcoming", nlpUpdated: false },
  ],
  "Brgy. Lao": [
    { activity: "Coastline Assessment", date: "Apr 11, 2026", participation: 42, budget: "₱28K", status: "Working on it", nlpUpdated: true },
  ],
};

export const businessRegistry = [
  { name: "Ormoc Downtown Market Corp.", zone: "Zone 1", lastInspection: "Mar 28, 2026", status: "Passed", inspector: "Insp. D. Reyes", violations: 0 },
  { name: "LakeMall Commercial Center", zone: "Zone 1", lastInspection: "Mar 15, 2026", status: "Warning", inspector: "Insp. D. Reyes", violations: 2 },
  { name: "Green Valley Grocery", zone: "Zone 2", lastInspection: "Apr 2, 2026", status: "Passed", inspector: "Insp. A. Lim", violations: 0 },
  { name: "Punta Seafood Restaurant", zone: "Zone 3", lastInspection: "Feb 20, 2026", status: "Fined", inspector: "Insp. M. Torres", violations: 5 },
  { name: "Ipil Hardware & Supply", zone: "Zone 2", lastInspection: "Mar 30, 2026", status: "Passed", inspector: "Insp. A. Lim", violations: 0 },
  { name: "City Center Food Court", zone: "Zone 1", lastInspection: "Apr 5, 2026", status: "Warning", inspector: "Insp. D. Reyes", violations: 1 },
  { name: "Eco-Friendly Packaging Co.", zone: "Zone 3", lastInspection: "Apr 8, 2026", status: "Passed", inspector: "Insp. M. Torres", violations: 0 },
  { name: "Ormoc Bay Hotel", zone: "Zone 3", lastInspection: "Jan 15, 2026", status: "Fined", inspector: "Insp. M. Torres", violations: 3 },
];

export interface TrapLocation {
  id: string;
  name: string;
  river: string;
  kgWeekly: number;
  capacity: number;
  clearingTeam: string;
  status: string;
  lat: number;
  lng: number;
}

export const trashTraps: TrapLocation[] = [
  { id: "TT1", name: "Bao River — Brgy. Ipil Bridge", river: "Bao River", kgWeekly: 285, capacity: 78, clearingTeam: "Team Alpha", status: "Warning", lat: 11.01, lng: 124.61 },
  { id: "TT2", name: "Bao River — Downtown Weir", river: "Bao River", kgWeekly: 420, capacity: 92, clearingTeam: "Team Alpha", status: "Near Full", lat: 11.00, lng: 124.60 },
  { id: "TT3", name: "Pagsangaan River — Confluence", river: "Pagsangaan River", kgWeekly: 180, capacity: 45, clearingTeam: "Team Bravo", status: "Normal", lat: 10.99, lng: 124.62 },
  { id: "TT4", name: "Malbasag Creek — School Zone", river: "Malbasag Creek", kgWeekly: 95, capacity: 32, clearingTeam: "Team Charlie", status: "Normal", lat: 11.02, lng: 124.59 },
  { id: "TT5", name: "Lao River — Barangay Hall", river: "Lao River", kgWeekly: 340, capacity: 85, clearingTeam: "Team Bravo", status: "Warning", lat: 10.98, lng: 124.63 },
  { id: "TT6", name: "Pagsangaan River — Coastal Outlet", river: "Pagsangaan River", kgWeekly: 510, capacity: 95, clearingTeam: "Team Charlie", status: "Near Full", lat: 10.97, lng: 124.64 },
];

export const weatherForecast = [
  { day: "Mon", rain: 12, trapRisk: "TT2, TT6" },
  { day: "Tue", rain: 35, trapRisk: "TT1, TT2, TT5, TT6" },
  { day: "Wed", rain: 48, trapRisk: "ALL — Heavy Rain Alert" },
  { day: "Thu", rain: 22, trapRisk: "TT2, TT6" },
  { day: "Fri", rain: 8, trapRisk: "TT6" },
];
