import {nativeWindow as __nativeWindow} from '../../../../../platform/webRuntime';
import { isNavigationLocked } from "../../shared/navigationLock";
import { hasDirtyNavigation, requestNavigation } from '../../shared/navigationGuard';
import { NAVIGATION_LOCATION_EVENT, replaceNavigationHistory } from '../../shared/navigationHistory';
import { useCallback, useEffect, useRef, useState } from "react";
import { getDefaultSection } from "./roleNavigation";
import { claimNavigationIdentity, isForeignNavigationActor } from '../../shared/navigationIdentity';
import { readNavigationLocation, type NavigationLocation, writeNavigationLocation, } from "./navigationUrl";
export function useRoleNavigationState(role: string, getInitialPage: (section: string) => string | undefined, actorId?: string) {
    const readLocation = () => {
        const differentActor = actorId && typeof __nativeWindow !== 'undefined' && isForeignNavigationActor(actorId, role);
        const section = getDefaultSection(role);
        return differentActor ? { section, page: getInitialPage(section) } : readNavigationLocation(role, getInitialPage);
    };
    const [activeSection, setActiveSection] = useState(() => {
        if (typeof __nativeWindow === "undefined")
            return getDefaultSection(role);
        return readLocation().section;
    });
    const [activePage, setActivePage] = useState<string | undefined>(() => {
        if (typeof __nativeWindow === "undefined")
            return getInitialPage(getDefaultSection(role));
        return readLocation().page;
    });
    const currentLocation = useRef<NavigationLocation>({ section: activeSection, page: activePage });
    useEffect(() => {
        let currentHref = __nativeWindow.location.href;
        let currentIndex = __nativeWindow.history.state?.eflowIndex ?? 0;
        let restoring = false;
        let replaying = false;
        let waitingForRestore: (() => void) | undefined;
        const syncFromUrl = () => {
            if (isNavigationLocked()) {
                writeNavigationLocation(currentLocation.current.section, currentLocation.current.page, "replace");
                return;
            }
            if (actorId)
                claimNavigationIdentity(actorId, role);
            const next = readLocation();
            currentLocation.current = next;
            setActiveSection(next.section);
            setActivePage(next.page);
            writeNavigationLocation(next.section, next.page, "replace");
            currentHref = __nativeWindow.location.href;
            currentIndex = __nativeWindow.history.state?.eflowIndex ?? 0;
        };
        const onPopState = (event: PopStateEvent) => {
            if (restoring) {
                event.stopImmediatePropagation();
                restoring = false;
                waitingForRestore?.();
                return;
            }
            if (replaying) {
                replaying = false;
                syncFromUrl();
                __nativeWindow.dispatchEvent(new Event(NAVIGATION_LOCATION_EVENT));
                return;
            }
            if (!hasDirtyNavigation() && !isNavigationLocked()) {
                syncFromUrl();
                __nativeWindow.dispatchEvent(new Event(NAVIGATION_LOCATION_EVENT));
                return;
            }
            event.stopImmediatePropagation();
            const requestedHref = __nativeWindow.location.href;
            const requestedIndex = __nativeWindow.history.state?.eflowIndex;
            const delta = typeof requestedIndex === 'number' ? requestedIndex - currentIndex : 0;
            if (delta) {
                restoring = true;
                const restored = new Promise<void>(resolve => { waitingForRestore = resolve; });
                __nativeWindow.history.go(-delta);
                void restored.then(() => requestNavigation(() => { replaying = true; __nativeWindow.history.go(delta); }));
            }
            else {
                replaceNavigationHistory(currentHref);
                void requestNavigation(() => { replaceNavigationHistory(requestedHref); syncFromUrl(); __nativeWindow.dispatchEvent(new Event(NAVIGATION_LOCATION_EVENT)); });
            }
        };
        replaceNavigationHistory(__nativeWindow.location.href);
        syncFromUrl();
        __nativeWindow.addEventListener('popstate', onPopState, true);
        __nativeWindow.addEventListener(NAVIGATION_LOCATION_EVENT, syncFromUrl);
        return () => { __nativeWindow.removeEventListener('popstate', onPopState, true); __nativeWindow.removeEventListener(NAVIGATION_LOCATION_EVENT, syncFromUrl); };
    }, [getInitialPage, role, actorId]);
    const selectPageAsync = useCallback(async (section: string, page: string, context?: {
        project?: string;
        view?: string;
        parameters?: Record<string, string>;
        isCurrent?: () => boolean;
    }) => {
        let moved = false;
        const accepted = await requestNavigation(() => {
            if (context?.isCurrent?.() === false)
                return;
            moved = true;
            currentLocation.current = { section, page };
            setActiveSection(section);
            setActivePage(page);
            writeNavigationLocation(section, page, "push", context);
        });
        return accepted && moved;
    }, []);
    const selectPage = useCallback((section: string, page: string) => { void selectPageAsync(section, page); }, [selectPageAsync]);
    return { activePage, activeSection, selectPage, selectPageAsync };
}
