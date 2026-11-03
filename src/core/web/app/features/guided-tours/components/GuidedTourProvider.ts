// Type declarations extracted from the web presentation module.
import type {ReactNode} from "react";
import type { GuidedTourKind, GuidedTourProgress, GuidedTourSection, GuidedTourStep } from "../types";
interface GuidedTourContextValue {
    isTourActive: boolean;
    startSystemTour: () => void;
    startPageTour: () => void;
}
type BeginTour = (kind: GuidedTourKind, steps: GuidedTourStep[], startIndex?: number, section?: string, page?: string) => void;