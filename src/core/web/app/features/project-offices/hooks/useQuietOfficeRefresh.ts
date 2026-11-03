import {nativeWindow as __nativeWindow,nativeDocument as __nativeDocument} from '../../../../../../platform/webRuntime';
import { useEffect, useRef } from 'react';
/** Retry background reads with backoff, and recover promptly on reconnect. */
export function useQuietOfficeRefresh(refresh: () => Promise<unknown>, needsRetry: boolean, scope: string) {
    const latest = useRef(refresh);
    latest.current = refresh;
    const attempt = useRef(0);
    useEffect(() => { attempt.current = 0; }, [scope]);
    useEffect(() => {
        if (!needsRetry) {
            attempt.current = 0;
            return;
        }
        let active = true, pending = false;
        let timer: ReturnType<typeof __nativeWindow.setTimeout>;
        const delay = () => Math.min(30000, 1500 * 2 ** Math.min(attempt.current++, 5));
        const retry = () => {
            if (pending || !active)
                return;
            pending = true;
            __nativeWindow.clearTimeout(timer);
            void latest.current().catch(() => { }).finally(() => {
                pending = false;
                if (active)
                    timer = __nativeWindow.setTimeout(retry, delay());
            });
        };
        timer = __nativeWindow.setTimeout(retry, delay());
        const visible = () => { if (__nativeDocument.visibilityState === 'visible')
            retry(); };
        __nativeWindow.addEventListener('online', retry);
        __nativeWindow.addEventListener('focus', retry);
        __nativeDocument.addEventListener('visibilitychange', visible);
        return () => {
            active = false;
            __nativeWindow.clearTimeout(timer);
            __nativeWindow.removeEventListener('online', retry);
            __nativeWindow.removeEventListener('focus', retry);
            __nativeDocument.removeEventListener('visibilitychange', visible);
        };
    }, [needsRetry, refresh, scope]);
}
