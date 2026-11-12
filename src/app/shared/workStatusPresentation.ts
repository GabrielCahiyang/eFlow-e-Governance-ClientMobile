import { createContext, useContext } from "react";
import {
  builtInStatuses,
  resolveStatus,
  type StatusDefinition,
} from "../../core/web/app/features/work-status/statusDefinitions";
import { statusLabel } from "./statusLabels";

export const emptyWorkStatusCatalog = {
  definitions: [] as readonly StatusDefinition[],
  ready: false,
};
export const WorkStatusCatalog = createContext(emptyWorkStatusCatalog);

export function useWorkStatusCatalog() {
  return useContext(WorkStatusCatalog);
}

export function useWorkStatus() {
  const { definitions } = useWorkStatusCatalog();
  return (status: string, customId?: string | null) => {
    const code = status === "done" ? "completed" : status;
    const fallback = Object.prototype.hasOwnProperty.call(builtInStatuses, code)
      ? builtInStatuses[code as keyof typeof builtInStatuses]
      : statusLabel(code);
    return resolveStatus(definitions, code, fallback, customId);
  };
}
