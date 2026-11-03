import {nativeWindow as __nativeWindow} from '../../../../platform/webRuntime';
import { useEffect, useState } from 'react';
export function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(() => typeof __nativeWindow !== 'undefined' && Boolean(__nativeWindow.matchMedia?.(query).matches));
    useEffect(() => {
        const media = __nativeWindow.matchMedia(query);
        const update = () => setMatches(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, [query]);
    return matches;
}
