import {nativeWindow as __nativeWindow} from '../../../../../../platform/webRuntime';
import { useCallback, useEffect } from 'react';
import { NAVIGATION_LOCATION_EVENT, pushNavigationHistory } from '../../../shared/navigationHistory';
export type ProjectPlanningView = 'portfolio' | 'drafts' | 'signoff';
export function readProjectPlanningView(): ProjectPlanningView {
    const params = new URLSearchParams(__nativeWindow.location.search);
    if (__nativeWindow.location.pathname !== '/projects' || params.has('project'))
        return 'portfolio';
    return params.get('plans') === 'saved' ? 'drafts' : params.get('plans') === 'review' ? 'signoff' : 'portfolio';
}
/** Contextual proposal workflows retain refresh/history without becoming sidebar destinations. */
export function useProjectPlanningLocation(onView: (view: ProjectPlanningView) => void) {
    useEffect(() => {
        const restore = () => { if (__nativeWindow.location.pathname === '/projects')
            onView(readProjectPlanningView()); };
        restore();
        __nativeWindow.addEventListener(NAVIGATION_LOCATION_EVENT, restore);
        return () => __nativeWindow.removeEventListener(NAVIGATION_LOCATION_EVENT, restore);
    }, [onView]);
    return useCallback((view: 'drafts' | 'signoff') => {
        const url = new URL(__nativeWindow.location.href);
        url.pathname = '/projects';
        url.searchParams.set('page', 'Projects');
        for (const key of ['project', 'view', 'proposal', 'proposalView', 'people'])
            url.searchParams.delete(key);
        url.searchParams.set('plans', view === 'drafts' ? 'saved' : 'review');
        pushNavigationHistory(`${url.pathname}${url.search}${url.hash}`);
    }, []);
}
