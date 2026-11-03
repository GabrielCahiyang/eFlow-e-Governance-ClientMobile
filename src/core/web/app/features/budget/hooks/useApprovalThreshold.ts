import {nativeWindow as __nativeWindow} from '../../../../../../platform/webRuntime';
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_APPROVAL_TIER_THRESHOLD } from "../constants";
const THRESHOLD_EVENT = "eflow-approval-threshold-changed";
function getStorageKey(orgId?: string): string {
    return orgId ? `eflow_approval_threshold_${orgId}` : "eflow_approval_threshold_default";
}
export function readApprovalThreshold(orgId?: string): number {
    if (typeof __nativeWindow === "undefined")
        return DEFAULT_APPROVAL_TIER_THRESHOLD;
    try {
        const raw = __nativeWindow.localStorage.getItem(getStorageKey(orgId));
        if (!raw)
            return DEFAULT_APPROVAL_TIER_THRESHOLD;
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_APPROVAL_TIER_THRESHOLD;
    }
    catch {
        return DEFAULT_APPROVAL_TIER_THRESHOLD;
    }
}
export function writeApprovalThreshold(threshold: number, orgId?: string): void {
    if (typeof __nativeWindow === "undefined")
        return;
    try {
        __nativeWindow.localStorage.setItem(getStorageKey(orgId), String(threshold));
        __nativeWindow.dispatchEvent(new CustomEvent(THRESHOLD_EVENT, { detail: { orgId, threshold } }));
    }
    catch {
        // Ignore storage write errors
    }
}
export function useApprovalThreshold(orgId?: string) {
    const [threshold, setThresholdState] = useState<number>(() => readApprovalThreshold(orgId));
    useEffect(() => {
        setThresholdState(readApprovalThreshold(orgId));
        const handleCustomEvent = (event: Event) => {
            const customEvent = event as CustomEvent<{
                orgId?: string;
                threshold: number;
            }>;
            if (!customEvent.detail || customEvent.detail.orgId === orgId) {
                setThresholdState(readApprovalThreshold(orgId));
            }
        };
        const handleStorageEvent = (event: StorageEvent) => {
            if (event.key === getStorageKey(orgId)) {
                setThresholdState(readApprovalThreshold(orgId));
            }
        };
        __nativeWindow.addEventListener(THRESHOLD_EVENT, handleCustomEvent);
        __nativeWindow.addEventListener("storage", handleStorageEvent);
        return () => {
            __nativeWindow.removeEventListener(THRESHOLD_EVENT, handleCustomEvent);
            __nativeWindow.removeEventListener("storage", handleStorageEvent);
        };
    }, [orgId]);
    const updateThreshold = useCallback((newAmount: number) => {
        const validated = Math.max(1, Math.round(newAmount));
        writeApprovalThreshold(validated, orgId);
        setThresholdState(validated);
    }, [orgId]);
    const resetThreshold = useCallback(() => {
        updateThreshold(DEFAULT_APPROVAL_TIER_THRESHOLD);
    }, [updateThreshold]);
    return {
        threshold,
        setThreshold: updateThreshold,
        resetThreshold,
        defaultThreshold: DEFAULT_APPROVAL_TIER_THRESHOLD,
    };
}
