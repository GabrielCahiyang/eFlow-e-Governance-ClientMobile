import {nativeWindow as __nativeWindow} from '../../../../../../platform/webRuntime';
import { useSyncExternalStore } from 'react';
import { NAVIGATION_LOCATION_EVENT } from '../../../shared/navigationHistory';
const subscribe = (notify: () => void) => { __nativeWindow.addEventListener(NAVIGATION_LOCATION_EVENT, notify); __nativeWindow.addEventListener('popstate', notify); return () => { __nativeWindow.removeEventListener(NAVIGATION_LOCATION_EVENT, notify); __nativeWindow.removeEventListener('popstate', notify); }; };
/** Reads the existing route; there is no separate category selection authority. */
export function useInboxCategory(page: string, role: string) {
    const selected = useSyncExternalStore(subscribe, () => __nativeWindow.location.pathname === '/inbox' ? new URLSearchParams(__nativeWindow.location.search).get('page') || page : page, () => page);
    return selected === 'Updates' || selected === 'Inbox' && role === 'admin' ? 'updates' : 'actions';
}
