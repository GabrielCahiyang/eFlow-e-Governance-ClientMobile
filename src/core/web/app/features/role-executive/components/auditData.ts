export const stableHashes = [
  "0x8F2A4C1D6E9B0F7A3D5E8C2B4A1F6D9E0C7B3A2D5F8E1C4B7A9D6F0E3C8B91",
  "0x3E7D2A9F5B8C0E1D6A4F7B3C9E2D5A8F0B7C4E1D6A9F3B5C8E2A7D0F4C6B12",
  "0xA1B5C9D3E7F0A2B6C0D4E8F1A5B9C3D7E0F4A8B2C6D0E3F7A1B5C9D3E7F0A4",
  "0x7C4E9B2D5F8A1C6E3B0D7F4A9C2E5B8D1F6A3C0E7B4D9F2A5C8E1B6D3F0A7",
  "0x2D8F4A6C0E3B9D5F1A7C4E0B6D2F8A3C9E5B1D7F0A6C2E8B4D0F5A1C7E3B9",
  "0xF0E5B8D2A7C3E9B5D1F6A0C4E8B2D7F3A9C5E1B0D6F2A8C4E0B5D9F1A3C7E6",
  "0x5A9C3E7B1D5F0A4C8E2B6D0F3A7C1E5B9D4F8A2C6E0B3D7F1A5C9E4B8D2F0",
  "0x1F6A3C9E5B0D8F2A4C7E1B3D6F9A0C5E8B2D4F7A1C3E6B9D0F5A8C2E4B7D1",
  "0xC8E4B0D6F2A5C9E3B7D1F0A4C8E2B6D9F3A7C1E5B0D4F8A2C6E0B3D7F1A5C9",
  "0x6B1D7F3A9C5E2B8D4F0A6C2E8B4D1F5A0C7E3B9D5F2A8C4E1B6D0F3A9C5E7",
  "0xD4F0A6C2E8B5D1F7A3C9E5B2D8F4A0C6E3B9D5F1A7C4E0B6D2F8A4C0E6B3D9",
  "0x9E3B7D1F5A0C4E8B2D6F0A3C7E1B5D9F4A8C2E6B0D3F7A1C5E9B4D8F2A6C0",
];

export const disbursements = [
  { id: "DV-2026-0412", timestamp: "2026-04-16 09:14:22 UTC", payee: "Engr. R. Almeda", initials: "RA", amount: 450000, bpaOrigin: "LEDIPO Master Program", hash: stableHashes[0], status: "Verified", tampered: false },
  { id: "DV-2026-0411", timestamp: "2026-04-15 14:32:08 UTC", payee: "Dr. L. Reyes", initials: "LR", amount: 125000, bpaOrigin: "Health Services Workflow", hash: stableHashes[1], status: "Verified", tampered: false },
  { id: "DV-2026-0410", timestamp: "2026-04-15 11:05:44 UTC", payee: "ABC Construction Corp.", initials: "AC", amount: 2800000, bpaOrigin: "Eco-Park Phase 2 Procurement", hash: stableHashes[2], status: "Verified", tampered: false },
  { id: "DV-2026-0409", timestamp: "2026-04-14 16:48:11 UTC", payee: "Dir. J. Navarro", initials: "JN", amount: 85000, bpaOrigin: "Agriculture Extension CA", hash: stableHashes[3], status: "Verified", tampered: false },
  { id: "DV-2026-0408", timestamp: "2026-04-14 10:22:37 UTC", payee: "Green Solutions Inc.", initials: "GS", amount: 1650000, bpaOrigin: "Marine Litter Trap Procurement", hash: stableHashes[4], status: "Flagged", tampered: true },
  { id: "DV-2026-0407", timestamp: "2026-04-13 15:09:55 UTC", payee: "Dir. M. Garcia", initials: "MG", amount: 50000, bpaOrigin: "CSWDO Emergency Relief", hash: stableHashes[5], status: "Verified", tampered: false },
  { id: "DV-2026-0406", timestamp: "2026-04-12 09:44:19 UTC", payee: "Ormoc Power Corp.", initials: "OP", amount: 980000, bpaOrigin: "Utility Payment Batch #14", hash: stableHashes[6], status: "Verified", tampered: false },
  { id: "DV-2026-0405", timestamp: "2026-04-11 13:28:02 UTC", payee: "Juan Dela Cruz", initials: "JC", amount: 15000, bpaOrigin: "Field Cash Advance", hash: stableHashes[7], status: "Verified", tampered: false },
  { id: "DV-2026-0404", timestamp: "2026-04-10 08:55:30 UTC", payee: "Metro Builders Inc.", initials: "MB", amount: 3200000, bpaOrigin: "Road Network Phase 2", hash: stableHashes[8], status: "Verified", tampered: false },
  { id: "DV-2026-0403", timestamp: "2026-04-09 17:11:48 UTC", payee: "Dir. C. Flores", initials: "CF", amount: 72000, bpaOrigin: "ENRO Field Operations", hash: stableHashes[9], status: "Verified", tampered: false },
];

export const liquidations = [
  { id: "LQ-2026-0088", advanceRef: "CA-2026-0155", payee: "Juan Dela Cruz", dept: "City Engineering", amount: 15000, liquidated: 12800, returned: 2200, hash: stableHashes[0], fileHash: "sha256:a4f2e8…c91d", fileType: "Official Receipt", uploadedAt: "2026-04-14 10:05:22 UTC", uploadedBy: "Juan Dela Cruz (Field)", geoTag: "11.0044° N, 124.6075° E — Ormoc City Hall", status: "Verified", imageValid: true },
  { id: "LQ-2026-0087", advanceRef: "CA-2026-0148", payee: "Maria Santos", dept: "Health Office", amount: 25000, liquidated: 24200, returned: 800, hash: stableHashes[1], fileHash: "sha256:b8d3f1…e42a", fileType: "Delivery Receipt + Photo", uploadedAt: "2026-04-13 14:22:08 UTC", uploadedBy: "Maria Santos (Field)", geoTag: "11.0052° N, 124.6092° E — Brgy. District 14", status: "Verified", imageValid: true },
  { id: "LQ-2026-0086", advanceRef: "CA-2026-0142", payee: "Pedro Reyes", dept: "Agriculture Office", amount: 8000, liquidated: 5500, returned: 2500, hash: stableHashes[2], fileHash: "sha256:c2a7d4…f03b", fileType: "Official Receipt", uploadedAt: "2026-04-12 09:38:44 UTC", uploadedBy: "Pedro Reyes (Field)", geoTag: "11.0088° N, 124.5941° E — Municipal Agri Office", status: "Verified", imageValid: true },
  { id: "LQ-2026-0085", advanceRef: "CA-2026-0139", payee: "Carlos Garcia", dept: "Health Office", amount: 20000, liquidated: 15200, returned: 4800, hash: stableHashes[3], fileHash: "sha256:d5f0e9…a81c", fileType: "Geo-tagged Purchase Photo", uploadedAt: "2026-04-11 16:11:55 UTC", uploadedBy: "Carlos Garcia (Field)", geoTag: "11.0031° N, 124.6118° E — Ormoc District Hospital", status: "Flagged", imageValid: false },
  { id: "LQ-2026-0084", advanceRef: "CA-2026-0133", payee: "Ana Torres", dept: "CSWDO", amount: 12000, liquidated: 11800, returned: 200, hash: stableHashes[4], fileHash: "sha256:e9b1c3…d47f", fileType: "Official Receipt", uploadedAt: "2026-04-10 11:28:02 UTC", uploadedBy: "Ana Torres (Field)", geoTag: "11.0067° N, 124.6005° E — CSWDO Office", status: "Verified", imageValid: true },
  { id: "LQ-2026-0083", advanceRef: "CA-2026-0127", payee: "Elena Cruz", dept: "ENRO", amount: 18000, liquidated: 17500, returned: 500, hash: stableHashes[5], fileHash: "sha256:f3d8a2…b56e", fileType: "Delivery Receipt", uploadedAt: "2026-04-09 08:52:30 UTC", uploadedBy: "Elena Cruz (Field)", geoTag: "11.0095° N, 124.5978° E — ENRO Field Station", status: "Verified", imageValid: true },
];

export const returnedFunds = [
  { id: "RF-2026-0044", advanceRef: "CA-2026-0155", payee: "Juan Dela Cruz", original: 15000, liquidated: 12800, returned: 2200, expected: 2200, sealed: true, treasurySigned: true, hash: stableHashes[7], cycleStatus: "Cycle Sealed" as const },
  { id: "RF-2026-0043", advanceRef: "CA-2026-0148", payee: "Maria Santos", original: 25000, liquidated: 24200, returned: 800, expected: 800, sealed: true, treasurySigned: true, hash: stableHashes[1], cycleStatus: "Cycle Sealed" as const },
  { id: "RF-2026-0042", advanceRef: "CA-2026-0142", payee: "Pedro Reyes", original: 8000, liquidated: 5500, returned: 2500, expected: 2500, sealed: true, treasurySigned: true, hash: stableHashes[2], cycleStatus: "Cycle Sealed" as const },
  { id: "RF-2026-0041", advanceRef: "CA-2026-0139", payee: "Carlos Garcia", original: 20000, liquidated: 15200, returned: 4799, expected: 4800, sealed: false, treasurySigned: false, hash: stableHashes[3], cycleStatus: "Audit Mismatch" as const },
  { id: "RF-2026-0040", advanceRef: "CA-2026-0133", payee: "Ana Torres", original: 12000, liquidated: 11800, returned: 200, expected: 200, sealed: true, treasurySigned: true, hash: stableHashes[4], cycleStatus: "Cycle Sealed" as const },
  { id: "RF-2026-0039", advanceRef: "CA-2026-0127", payee: "Elena Cruz", original: 18000, liquidated: 17500, returned: 500, expected: 500, sealed: true, treasurySigned: true, hash: stableHashes[5], cycleStatus: "Cycle Sealed" as const },
  { id: "RF-2026-0038", advanceRef: "CA-2026-0121", payee: "Luz Navarro", original: 10000, liquidated: 9800, returned: 200, expected: 200, sealed: true, treasurySigned: true, hash: stableHashes[9], cycleStatus: "Cycle Sealed" as const },
];

// ==================== 5.1 PARENT: CRYPTOGRAPHIC LEDGER ====================
