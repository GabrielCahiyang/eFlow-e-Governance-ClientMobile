import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  agendaItems,
  groupOrder,
  useItemTimers,
  type AgendaItem,
} from "../components/agendaModel";
import { getCurrentTimestamp, type BroadcastEvent } from "../components/SessionBroadcast";
import type { SessionState } from "../components/AdjournmentControls";

export function useOrderOfBusiness() {
  const [items, setItems] = useState(agendaItems);
  const [sessionState, setSessionState] = useState<SessionState>("live");
  const [broadcastId, setBroadcastId] = useState<number | null>(4);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [, setFlashId] = useState<number | null>(null);

  // Fail-safe state
  const [showAdjournModal, setShowAdjournModal] = useState(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(300);
  const graceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDeferredRef = useRef<{ id: number; originalGroup: string; originalStatus: AgendaItem["status"] }[]>([]);
  const preAdjournItemsRef = useRef<AgendaItem[]>([]);
  const preSuspendBroadcastRef = useRef<number | null>(null);

  // Drawer form state
  const [drawerType, setDrawerType] = useState("First Reading");
  const [drawerRef, setDrawerRef] = useState("");
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerSponsor, setDrawerSponsor] = useState("");
  const [drawerDuration, setDrawerDuration] = useState("15 mins");
  const [drawerGroup, setDrawerGroup] = useState("Reference of Business (First Readings)");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Interruption modal state
  const [interruptTarget, setInterruptTarget] = useState<number | null>(null);

  // Broadcast audit trail
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastEvent[]>([
    { id: 1, itemId: 1, itemTitle: "Call to Order", action: "broadcast", timestamp: "10:00:00" },
    { id: 2, itemId: 1, itemTitle: "Call to Order", action: "concluded", timestamp: "10:02:12" },
    { id: 3, itemId: 2, itemTitle: "Roll Call & Determination of Quorum", itemRef: undefined, action: "broadcast", timestamp: "10:02:15" },
    { id: 4, itemId: 2, itemTitle: "Roll Call & Determination of Quorum", action: "concluded", timestamp: "10:05:08" },
    { id: 5, itemId: 3, itemTitle: "Approval of Minutes — 141st Regular Session", itemRef: "MIN-2026-141", action: "broadcast", timestamp: "10:05:12" },
    { id: 6, itemId: 3, itemTitle: "Approval of Minutes — 141st Regular Session", itemRef: "MIN-2026-141", action: "concluded", timestamp: "10:10:05" },
    { id: 7, itemId: 4, itemTitle: "ORD-2026-046: Digital Governance and eFlow Implementation Fund", itemRef: "ORD-2026-046", action: "broadcast", timestamp: "10:10:08" },
  ]);
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);
  const eventIdRef = useRef(8);

  // Batch conclude modal
  const [batchConcludeGroup, setBatchConcludeGroup] = useState<string | null>(null);

  // End-of-session checklist
  const [showChecklist, setShowChecklist] = useState(false);

  const isLive = sessionState === "live";
  const isSuspended = sessionState === "suspended";
  const isAdjourned = sessionState === "adjourned";
  const isGrace = sessionState === "grace";
  const isPreSession = sessionState === "pre";

  const { formatTime } = useItemTimers(items, isLive);

  const logEvent = useCallback((action: BroadcastEvent["action"], item?: AgendaItem) => {
    const ev: BroadcastEvent = {
      id: eventIdRef.current++,
      itemId: item?.id ?? 0,
      itemTitle: item?.title ?? "—",
      itemRef: item?.ref,
      action,
      timestamp: getCurrentTimestamp(),
    };
    setBroadcastHistory(prev => [...prev, ev]);
  }, []);

  const pendingCount = useMemo(() => items.filter(i => i.status === "pending" || i.status === "broadcasting" || i.status === "paused").length, [items]);

  // Grace period countdown
  useEffect(() => {
    if (isGrace) {
      setGraceSecondsLeft(300);
      graceTimerRef.current = setInterval(() => {
        setGraceSecondsLeft(prev => {
          if (prev <= 1) {
            if (graceTimerRef.current) clearInterval(graceTimerRef.current);
            setSessionState("adjourned");
            autoDeferredRef.current = [];
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    
  return () => {
        if (graceTimerRef.current) clearInterval(graceTimerRef.current);
      };
    }
  }, [isGrace]);

  // === DECOUPLED BROADCAST: Just switches the projector, doesn't finalize anything ===
  const executeBroadcastSwitch = useCallback((id: number) => {
    setItems(prev => {
      const currentBroadcasting = prev.find(i => i.status === "broadcasting");
      const targetItem = prev.find(i => i.id === id);
      // Log pause of current item
      if (currentBroadcasting && currentBroadcasting.id !== id) {
        logEvent("paused", currentBroadcasting);
      }
      // Log broadcast (or resume if it was paused)
      if (targetItem) {
        logEvent(targetItem.status === "paused" ? "resumed" : "broadcast", targetItem);
      }
      return prev.map(item => ({
        ...item,
        status: item.id === id ? "broadcasting" as const :
          item.status === "broadcasting" ? "paused" as const : item.status,
      }));
    });
    setBroadcastId(id);
    setInterruptTarget(null);
  }, [logEvent]);

  const handleBroadcast = useCallback((id: number) => {
    // Check if there's an active item on the floor (broadcasting or paused but still live)
    const currentBroadcasting = items.find(i => i.status === "broadcasting");
    if (currentBroadcasting && currentBroadcasting.id !== id) {
      // Trigger interruption warning
      setInterruptTarget(id);
      return;
    }
    executeBroadcastSwitch(id);
  }, [items, executeBroadcastSwitch]);

  // === SEPARATE CONCLUDE: The only way to legally finish an item ===
  const handleConclude = useCallback((id: number) => {
    const item = items.find(i => i.id === id);
    if (item) logEvent("concluded", item);
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: "done" as const } : item
    ));
    if (broadcastId === id) setBroadcastId(null);
  }, [broadcastId, items, logEvent]);

  // === BATCH CONCLUDE ===
  const handleBatchConclude = useCallback((ids: number[]) => {
    ids.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) logEvent("concluded", item);
    });
    setItems(prev => prev.map(item =>
      ids.includes(item.id) ? { ...item, status: "done" as const } : item
    ));
    if (broadcastId !== null && ids.includes(broadcastId)) setBroadcastId(null);
    setBatchConcludeGroup(null);
  }, [broadcastId, items, logEvent]);

  const handleUpdateTitle = useCallback((id: number, newTitle: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, title: newTitle } : item
    ));
  }, []);

  // ===== FAIL-SAFE 1: Suspend / Recess =====
  const handleSuspend = useCallback(() => {
    preSuspendBroadcastRef.current = broadcastId;
    logEvent("suspended");
    setSessionState("suspended");
  }, [broadcastId, logEvent]);

  const handleResume = useCallback(() => {
    logEvent("session_resumed");
    setSessionState("live");
  }, [logEvent]);

  // ===== FAIL-SAFE 2: Adjourn (opens checklist first, then friction modal) =====
  const handleAdjournClick = useCallback(() => {
    const hasPaused = items.some(i => i.status === "paused");
    const hasBroadcasting = items.some(i => i.status === "broadcasting");
    if (hasPaused || hasBroadcasting) {
      setShowChecklist(true);
    } else {
      setShowAdjournModal(true);
    }
  }, [items]);

  const handleAdjournConfirm = useCallback(() => {
    // Save snapshot for undo
    preAdjournItemsRef.current = items.map(i => ({ ...i }));
    
    // Track what we're deferring
    const deferred: typeof autoDeferredRef.current = [];
    setItems(prev => prev.map(item => {
      if (item.status === "pending" || item.status === "broadcasting" || item.status === "paused") {
        deferred.push({ id: item.id, originalGroup: item.group, originalStatus: item.status });
        return { ...item, status: "deferred" as const, group: "Unfinished Business" };
      }
      return item;
    }));
    autoDeferredRef.current = deferred;
    logEvent("adjourned");
    setBroadcastId(null);
    setShowAdjournModal(false);
    setSessionState("grace"); // Start 5-min undo window
  }, [items, logEvent]);

  // ===== FAIL-SAFE 3: Undo Adjournment (grace period) =====
  const handleUndoAdjourn = useCallback(() => {
    if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    // Restore items from snapshot
    setItems(preAdjournItemsRef.current);
    setBroadcastId(preSuspendBroadcastRef.current);
    logEvent("undo_adjourn");
    autoDeferredRef.current = [];
    setSessionState("live");
  }, [logEvent]);

  // Start session from pre-session
  const handleStartSession = useCallback(() => {
    setSessionState("live");
  }, []);

  // Move item (drag and drop)
  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const flat = groupOrder.flatMap(g => prev.filter(i => i.group === g));
      const newFlat = [...flat];
      const [removed] = newFlat.splice(fromIndex, 1);
      newFlat.splice(toIndex, 0, removed);
      return newFlat;
    });
  }, []);

  // Add new agenda item from drawer
  const handleAddItem = () => {
    if (!drawerTitle.trim()) return;
    const newItem: AgendaItem = {
      id: items.length + 1,
      title: drawerTitle.trim(),
      type: drawerType,
      ref: drawerRef || undefined,
      author: drawerSponsor || undefined,
      status: "pending",
      group: drawerGroup,
      duration: drawerDuration || undefined,
    };
    setItems(prev => [...prev, newItem]);
    setFlashId(newItem.id);
    setTimeout(() => setFlashId(null), 1500);
    setDrawerOpen(false);
    setDrawerTitle("");
    setDrawerRef("");
    setDrawerSponsor("");
    setDrawerDuration("15 mins");
  };

  const doneCount = items.filter(i => i.status === "done").length;
  const totalCount = items.length;
  const currentItem = items.find(i => i.status === "broadcasting");

  return {
    items,
    setItems,
    sessionState,
    setSessionState,
    broadcastId,
    setBroadcastId,
    drawerOpen,
    setDrawerOpen,
    showAdjournModal,
    setShowAdjournModal,
    graceSecondsLeft,
    drawerType,
    setDrawerType,
    drawerRef,
    setDrawerRef,
    drawerTitle,
    setDrawerTitle,
    drawerSponsor,
    setDrawerSponsor,
    drawerDuration,
    setDrawerDuration,
    drawerGroup,
    setDrawerGroup,
    draggedIdx,
    setDraggedIdx,
    interruptTarget,
    setInterruptTarget,
    broadcastHistory,
    timelineCollapsed,
    setTimelineCollapsed,
    batchConcludeGroup,
    setBatchConcludeGroup,
    showChecklist,
    setShowChecklist,
    isLive,
    isSuspended,
    isAdjourned,
    isGrace,
    isPreSession,
    formatTime,
    pendingCount,
    handleBroadcast,
    executeBroadcastSwitch,
    handleConclude,
    handleBatchConclude,
    handleUpdateTitle,
    handleSuspend,
    handleResume,
    handleAdjournClick,
    handleAdjournConfirm,
    handleUndoAdjourn,
    handleStartSession,
    moveItem,
    handleAddItem,
    doneCount,
    totalCount,
    currentItem,
    autoDeferredCount: autoDeferredRef.current.length,
  };
}
