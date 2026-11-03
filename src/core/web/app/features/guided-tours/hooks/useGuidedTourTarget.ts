import {nativeWindow as __nativeWindow,nativeDocument as __nativeDocument} from '../../../../../../platform/webRuntime';
import { useEffect, useState } from "react";
import type { GuidedTourStep } from "../types";
export interface TourTargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}
function findTarget(step: GuidedTourStep): HTMLElement | null {
    return typeof step.target === "function"
        ? step.target()
        : __nativeDocument.querySelector<HTMLElement>(step.target);
}
function toRect(element: HTMLElement): TourTargetRect {
    const rect = element.getBoundingClientRect();
    const padding = 7;
    return {
        top: Math.max(8, rect.top - padding),
        left: Math.max(8, rect.left - padding),
        width: Math.min(__nativeWindow.innerWidth - 16, rect.width + padding * 2),
        height: Math.min(__nativeWindow.innerHeight - 16, rect.height + padding * 2),
    };
}
export function useGuidedTourTarget(step: GuidedTourStep): TourTargetRect | null {
    const [rect, setRect] = useState<TourTargetRect | null>(null);
    useEffect(() => {
        let cancelled = false;
        let animationFrame = 0;
        let settleTimer = 0;
        let cleanupListeners = () => { };
        const reveal = async () => {
            await step.beforeShow?.();
            let target: HTMLElement | null = null;
            for (let attempt = 0; attempt < 12 && !target && !cancelled; attempt += 1) {
                target = findTarget(step);
                if (!target)
                    await new Promise((resolve) => __nativeWindow.setTimeout(resolve, 80));
            }
            if (cancelled)
                return;
            target ||= __nativeDocument.querySelector<HTMLElement>("[data-tour-page-content]");
            if (!target)
                return;
            const prefersReducedMotion = __nativeWindow.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
            const update = () => {
                __nativeWindow.cancelAnimationFrame(animationFrame);
                animationFrame = __nativeWindow.requestAnimationFrame(() => {
                    if (!cancelled && target?.isConnected)
                        setRect(toRect(target));
                });
            };
            __nativeWindow.addEventListener("resize", update);
            __nativeWindow.addEventListener("scroll", update, true);
            update();
            target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center", inline: "center" });
            settleTimer = __nativeWindow.setTimeout(update, prefersReducedMotion ? 0 : 420);
            cleanupListeners = () => {
                __nativeWindow.cancelAnimationFrame(animationFrame);
                __nativeWindow.clearTimeout(settleTimer);
                __nativeWindow.removeEventListener("resize", update);
                __nativeWindow.removeEventListener("scroll", update, true);
            };
        };
        void reveal();
        return () => {
            cancelled = true;
            cleanupListeners();
        };
    }, [step]);
    return rect;
}
