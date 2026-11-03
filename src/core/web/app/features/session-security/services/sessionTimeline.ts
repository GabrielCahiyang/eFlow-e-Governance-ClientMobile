export type InactivityPhase = "active" | "warning" | "expired";

export interface InactivityState {
  phase: InactivityPhase;
  idleForMs: number;
  remainingMs: number;
}

export function getInactivityState(lastActivityAt: number, now: number, timeoutMs: number, warningLeadMs: number): InactivityState {
  const idleForMs = Math.max(0, now - lastActivityAt);
  const remainingMs = Math.max(0, timeoutMs - idleForMs);
  const phase: InactivityPhase = remainingMs <= 0 ? "expired" : remainingMs <= warningLeadMs ? "warning" : "active";
  return { phase, idleForMs, remainingMs };
}

export function isMeaningfulKeyboardEvent(event: Pick<KeyboardEvent, "key" | "repeat">): boolean {
  if (event.repeat) return false;
  return !["Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock", "ScrollLock"].includes(event.key);
}

export function readActivityTimestamp(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

