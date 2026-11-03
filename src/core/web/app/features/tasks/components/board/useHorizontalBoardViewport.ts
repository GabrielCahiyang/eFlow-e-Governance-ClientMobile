import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const INTERACTIVE_TARGETS = "button, input, select, textarea, a, [role='button'], [draggable='true'], [data-no-board-pan]";

export function useHorizontalBoardViewport() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest(INTERACTIVE_TARGETS)) return;
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsPanning(true);
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const movement = event.clientX - state.startX;
    if (Math.abs(movement) > 2) event.preventDefault();
    event.currentTarget.scrollLeft = state.scrollLeft - movement;
  }, []);

  const stopPanning = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragState.current = null;
    setIsPanning(false);
  }, []);

  const panByPage = useCallback((direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const distance = Math.max(viewport.clientWidth * 0.8, 260);
    viewport.scrollTo?.({ left: viewport.scrollLeft + direction * distance, behavior: "smooth" });
    if (typeof viewport.scrollTo !== "function") viewport.scrollLeft += direction * distance;
  }, []);

  const autoPanDuringTaskDrag = useCallback((clientX: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const bounds = viewport.getBoundingClientRect();
    const edge = Math.min(110, bounds.width * 0.18);
    if (clientX < bounds.left + edge) viewport.scrollLeft -= 22;
    else if (clientX > bounds.right - edge) viewport.scrollLeft += 22;
  }, []);

  return {
    viewportRef,
    isPanning,
    panByPage,
    autoPanDuringTaskDrag,
    viewportPointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stopPanning,
      onPointerCancel: stopPanning,
      onPointerLeave: stopPanning,
    },
  };
}
