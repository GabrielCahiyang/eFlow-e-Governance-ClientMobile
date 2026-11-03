import type { ComponentType } from "react";
import { PortfolioCompletionRates, BudgetBurnDown, CriticalBottlenecks, CityProjectPulse } from "./components/PortfolioHealthPages";
import { PredictiveInsightCards, ProcurementDelayAlerts } from "./components/PortfolioInsightPages";
import { ActionableIntelligence, StrategicAIInsights } from "./components/IntelligencePages";
import { InfrastructurePage, SustainableTourismOverview } from "./components/InfrastructurePages";
import { EnvironmentalProtection, RevenueProjections } from "./components/EnvironmentalRevenuePages";
import { SHInEOrmocInitiative, PlasticRegulationCompliance, TrashTrapInterception, MarineLitterOverview } from "./components/CircularEconomyPages";
import { MasterBudgetExecution, ExpenditureVsApproved } from "./components/BudgetExecutionPages";
import { OverspendingRisk, UnderutilizationAlerts } from "./components/SpendingRiskPages";
import { UnliquidatedCashAdvances, OutstandingFunds } from "./components/OutstandingFundsPages";
import { LeaderTracking, StalledFundsAlert } from "./components/EnforcementPages";
import { CryptographicLedger } from "./components/CryptographicLedger";
import { FinancialDisbursements } from "./components/FinancialDisbursements";
import { ProjectLiquidations } from "./components/ProjectLiquidations";
import { ReturnedFunds } from "./components/ReturnedFunds";

export type ExecutivePageSections = Record<string, Record<string, ComponentType>>;

export const transformPages: ExecutivePageSections = { transform: {
  "Sustainable Tourism & Eco-Resorts": SustainableTourismOverview,
  "Infrastructure (â‚±450M)": InfrastructurePage,
  "Environmental Protection (â‚±170M)": EnvironmentalProtection,
  "Revenue Projections": RevenueProjections,
  "Marine Litter & Circular Economy": MarineLitterOverview,
  "#SHInEOrmoc Initiative": SHInEOrmocInitiative,
  "Plastic Regulation Compliance": PlasticRegulationCompliance,
  "Trash Trap Interception Rates": TrashTrapInterception,
} };

export const financialPages: ExecutivePageSections = { financial: {
  "Master Budget Execution": MasterBudgetExecution,
  "Expenditure vs Approved": ExpenditureVsApproved,
  "Overspending Risk": OverspendingRisk,
  "Underutilization Alerts": UnderutilizationAlerts,
  "Unliquidated Cash Advances": UnliquidatedCashAdvances,
  "Outstanding Funds": OutstandingFunds,
  "Leader Tracking": LeaderTracking,
  "Stalled Funds Alert": StalledFundsAlert,
} };

export const auditPages: ExecutivePageSections = { audit: {
  "Cryptographic Ledger": CryptographicLedger,
  "Financial Disbursements": FinancialDisbursements,
  "Project Liquidations": ProjectLiquidations,
  "Returned Funds": ReturnedFunds,
} };

export const executivePages: ExecutivePageSections = {
  portfolio: {
    "City Project Pulse": CityProjectPulse,
    "Portfolio Completion Rates": PortfolioCompletionRates,
    "Budget Burn-Down": BudgetBurnDown,
    "Critical Bottlenecks": CriticalBottlenecks,
    "Strategic AI Insights": StrategicAIInsights,
    "Predictive Insight Cards": PredictiveInsightCards,
    "Procurement Delay Alerts": ProcurementDelayAlerts,
    "Actionable Intelligence": ActionableIntelligence,
  },
  ...transformPages,
  ...financialPages,
  ...auditPages,
};

export const executiveDefaultPages: Record<string, string> = {
  portfolio: "City Project Pulse",
  transform: "Sustainable Tourism & Eco-Resorts",
  financial: "Master Budget Execution",
  audit: "Cryptographic Ledger",
};
