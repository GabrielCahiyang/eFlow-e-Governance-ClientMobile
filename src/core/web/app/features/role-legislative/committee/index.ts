import type { ComponentType } from "react";


export const committeePages: Record<string, Record<string, ComponentType>> = {
  committee: {
    "Proposed Municipal Budget": ProposedMunicipalBudget,
    "Budget Legislation": BudgetLegislation,
    "Committee Chairmanships": CommitteeChairmanships,
    "Working Documents": WorkingDocuments,
  },
};


export const committeeDefaultPages: Record<string, string> = {
  committee: "Proposed Municipal Budget",
};