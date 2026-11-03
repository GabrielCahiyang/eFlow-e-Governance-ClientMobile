import {nativeWindow as __nativeWindow} from '../../../../platform/webRuntime';
import { replaceNavigationHistory } from './navigationHistory';
/** UI ownership only. Permissions are always checked independently. */
export function isForeignNavigationActor(actorId: string, role: string) {
    const state = __nativeWindow.history.state;
    return !!(state?.eflowActorId && (state.eflowActorId !== actorId || state.eflowActorRole && state.eflowActorRole !== role));
}
export function claimNavigationIdentity(actorId: string, role: string) {
    if (isForeignNavigationActor(actorId, role))
        replaceNavigationHistory('/');
    __nativeWindow.history.replaceState({ ...__nativeWindow.history.state, eflowActorId: actorId, eflowActorRole: role }, '', __nativeWindow.location.href);
}
