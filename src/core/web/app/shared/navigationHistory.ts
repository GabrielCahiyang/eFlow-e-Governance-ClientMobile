import {nativeWindow as __nativeWindow} from '../../../../platform/webRuntime';
export const NAVIGATION_LOCATION_EVENT = 'eflow:locationchange';
export function replaceNavigationHistory(url: string) {
    __nativeWindow.history.replaceState({ ...__nativeWindow.history.state, eflowIndex: __nativeWindow.history.state?.eflowIndex ?? 0 }, '', url);
}
export function pushNavigationHistory(url: string) {
    if (__nativeWindow.history.state?.eflowIndex === undefined)
        replaceNavigationHistory(__nativeWindow.location.href);
    __nativeWindow.history.pushState({ ...__nativeWindow.history.state, eflowNavigation: true, eflowIndex: __nativeWindow.history.state.eflowIndex + 1 }, '', url);
    __nativeWindow.dispatchEvent(new Event(NAVIGATION_LOCATION_EVENT));
}
