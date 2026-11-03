import {nativeWindow as __nativeWindow} from '../../../../../../platform/webRuntime';
import { useEffect } from "react";
import { acquireNavigationLock } from "../../../shared/navigationLock";
export function useProcessingGuard(active: boolean, onProcessingChange?: (active: boolean) => void) {
    useEffect(() => {
        onProcessingChange?.(active);
        if (!active)
            return;
        const release = acquireNavigationLock();
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        __nativeWindow.addEventListener("beforeunload", warn);
        return () => { release(); __nativeWindow.removeEventListener("beforeunload", warn); onProcessingChange?.(false); };
    }, [active, onProcessingChange]);
}
