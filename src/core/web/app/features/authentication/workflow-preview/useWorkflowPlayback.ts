import {nativeWindow as __nativeWindow,nativeDocument as __nativeDocument} from '../../../../../../platform/webRuntime';
import { useEffect, useState } from "react";
export const WORKFLOW_STEP_DURATION = 9000;
export function useWorkflowPlayback(stepCount: number, readyToAdvance?: (index: number) => boolean) {
    const [stepIndex, setStepIndex] = useState(0);
    const [isPlaying, setPlaying] = useState(false);
    const lastIndex = Math.max(0, stepCount - 1);
    useEffect(() => {
        if (!isPlaying)
            return;
        let timer: number;
        const advanceWhenReady = () => {
            // Let the shared walkthrough voice finish before autoplay leaves this screen.
            if (readyToAdvance && !readyToAdvance(stepIndex)) {
                timer = __nativeWindow.setTimeout(advanceWhenReady, 250);
                return;
            }
            if (stepIndex >= lastIndex - 1)
                setPlaying(false);
            setStepIndex((current) => Math.min(lastIndex, current + 1));
        };
        timer = __nativeWindow.setTimeout(advanceWhenReady, WORKFLOW_STEP_DURATION);
        return () => __nativeWindow.clearTimeout(timer);
    }, [isPlaying, lastIndex, stepIndex, readyToAdvance]);
    useEffect(() => {
        const pauseWhenHidden = () => { if (__nativeDocument.hidden)
            setPlaying(false); };
        __nativeDocument.addEventListener("visibilitychange", pauseWhenHidden);
        return () => __nativeDocument.removeEventListener("visibilitychange", pauseWhenHidden);
    }, []);
    const seek = (index: number) => {
        setPlaying(false);
        setStepIndex(Math.max(0, Math.min(lastIndex, index)));
    };
    const togglePlay = () => {
        if (isPlaying) {
            setPlaying(false);
            return;
        }
        if (stepIndex === lastIndex)
            setStepIndex(0);
        setPlaying(true);
    };
    return { stepIndex, isPlaying, seek, togglePlay, previous: () => seek(stepIndex - 1), next: () => seek(stepIndex + 1) };
}
