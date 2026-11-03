import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { View } from "../../components/ui/Primitives";
import { Button, ErrorState, Notice, Row, Sheet } from "../../components/ui";
import { useAuth } from "../authentication";
import { supabase } from "../../../platform/supabase";
import { createPostgresChannel } from "../../shared/postgresChannel";
import {
  initiateCall,
  type ActiveCall,
  type CallType,
} from "../../../core/web/app/services/callService";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCView,
  mediaDevices,
} from "./rtc";
import type { Channel } from "./services";
type Context = { start: (channel: Channel, type: CallType) => Promise<void> };
const Calls = createContext<Context>({ start: async () => {} });
export const useCalls = () => useContext(Calls);
export function CallProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth(),
    [call, setCall] = useState<ActiveCall>(),
    [error, setError] = useState(""),
    [local, setLocal] = useState<any>(),
    [remote, setRemote] = useState<any>(),
    [muted, setMuted] = useState(false),
    [camera, setCamera] = useState(true),
    [busy, setBusy] = useState(false),
    runtime = useRef<{
      call?: ActiveCall;
      stream?: any;
      pc?: any;
      signal?: ReturnType<typeof supabase.channel>;
      started: boolean;
      epoch: number;
    }>({ started: false, epoch: 0 });
  const cleanup = () => {
    const s = runtime.current;
    s.epoch++;
    s.pc?.close();
    s.stream?.getTracks().forEach((t: any) => t.stop());
    if (s.signal) void supabase.removeChannel(s.signal);
    s.pc = undefined;
    s.signal = undefined;
    s.stream = undefined;
    s.started = false;
    s.call = undefined;
    setLocal(undefined);
    setRemote(undefined);
    setCall(undefined);
    setBusy(false);
  };
  const change = async (status: string) => {
    const current = runtime.current.call;
    if (!current) return;
    const r = await supabase
      .from("calls")
      .update({
        status,
        ...(status === "active"
          ? { answered_at: new Date().toISOString() }
          : { ended_at: new Date().toISOString() }),
      })
      .eq("id", current.id);
    if (r.error) throw r.error;
  };
  const finish = async (status = "ended") => {
    setError("");
    try {
      await change(status);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The call status could not be saved.",
      );
    } finally {
      cleanup();
    }
  };
  const connect = async (current: ActiveCall) => {
    const s = runtime.current;
    if (s.started) return;
    s.started = true;
    const epoch = s.epoch;
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: current.callType === "video",
      });
      if (s.epoch !== epoch) {
        stream.getTracks().forEach((t: any) => t.stop());
        return;
      }
      s.stream = stream;
      setLocal(stream);
      const ice: any[] = [];
      if (process.env.EXPO_PUBLIC_STUN_URL)
        ice.push({ urls: process.env.EXPO_PUBLIC_STUN_URL });
      if (process.env.EXPO_PUBLIC_TURN_URL)
        ice.push({
          urls: process.env.EXPO_PUBLIC_TURN_URL,
          username: process.env.EXPO_PUBLIC_TURN_USERNAME,
          credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
        });
      const pc: any = new RTCPeerConnection({ iceServers: ice });
      s.pc = pc;
      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));
      const queued: any[] = [];
      const signal = supabase.channel("call-signal-" + current.id);
      s.signal = signal;
      const send = (event: string, payload: any) =>
        signal.send({ type: "broadcast", event, payload });
      pc.onicecandidate = (event: any) => {
        if (event.candidate)
          void send("ice-candidate", { candidate: event.candidate });
      };
      pc.ontrack = (event: any) => {
        if (s.epoch === epoch) setRemote(event.streams[0]);
      };
      const drain = async () => {
        for (const candidate of queued.splice(0))
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
      };
      signal
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (current.callerId === profile?.id || s.epoch !== epoch) return;
          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription(payload.sdp),
            );
            await drain();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await send("answer", { sdp: answer });
          } catch (e) {
            setError(String(e));
          }
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (current.callerId !== profile?.id || s.epoch !== epoch) return;
          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription(payload.sdp),
            );
            await drain();
          } catch (e) {
            setError(String(e));
          }
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (s.epoch !== epoch) return;
          try {
            if (pc.remoteDescription)
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            else queued.push(payload.candidate);
          } catch (e) {
            setError(String(e));
          }
        })
        .on("broadcast", { event: "hangup" }, () => cleanup());
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Call signaling timed out.")),
          15000,
        );
        signal.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(timer);
            resolve();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timer);
            reject(new Error("The call connection is unavailable."));
          }
        });
      });
      if (s.epoch !== epoch) return;
      if (current.callerId === profile?.id) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await send("offer", { sdp: offer });
      }
    } catch (e) {
      const reason =
        e instanceof Error
          ? e.message
          : "Microphone/camera access could not start.";
      await finish();
      setError(reason);
    }
  };
  useEffect(() => {
    if (!profile) return;
    const live = createPostgresChannel("native-incoming:" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: "callee_id=eq." + profile.id,
        },
        ({ new: row }: any) => {
          if (row.status !== "ringing" || runtime.current.call) return;
          const incoming: ActiveCall = {
            id: row.id,
            channelId: row.channel_id,
            callerId: row.caller_id,
            callerName: row.caller_name,
            calleeId: row.callee_id,
            calleeName: row.callee_name,
            callType: row.call_type,
            status: row.status,
          };
          runtime.current.call = incoming;
          setCall(incoming);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        ({ new: row }: any) => {
          const current = runtime.current.call;
          if (row.id !== current?.id) return;
          if (["ended", "declined", "missed"].includes(row.status)) cleanup();
          else if (row.status === "active") {
            const active = { ...current, status: "active" } as ActiveCall;
            runtime.current.call = active;
            setCall(active);
            void connect(active);
          }
        },
      )
      .subscribe();
    const app = AppState.addEventListener("change", (state) => {
      if (state === "background" && runtime.current.call) void finish();
    });
    return () => {
      app.remove();
      void supabase.removeChannel(live);
      cleanup();
    };
  }, [profile?.id]);
  useEffect(() => {
    if (call?.status !== "ringing") return;
    const timer = setTimeout(() => void finish("missed"), 60000);
    return () => clearTimeout(timer);
  }, [call?.id, call?.status]);
  const start = async (channel: Channel, type: CallType) => {
    if (runtime.current.call || busy || !profile || !channel.otherId) return;
    setBusy(true);
    setError("");
    try {
      const id = await initiateCall(
        channel.id,
        profile.id,
        profile.full_name,
        channel.otherId,
        channel.otherName || channel.name,
        type,
      );
      const next: ActiveCall = {
        id,
        channelId: channel.id,
        callerId: profile.id,
        callerName: profile.full_name,
        calleeId: channel.otherId,
        calleeName: channel.otherName || channel.name,
        callType: type,
        status: "ringing",
      };
      runtime.current.call = next;
      setCall(next);
      setMuted(false);
      setCamera(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const video = (stream: any, mirror = false) =>
    Platform.OS === "web" ? (
      <RTCView
        {...({ stream } as any)}
        style={{ height: 220, width: "100%" }}
        mirror={mirror}
      />
    ) : (
      <RTCView
        streamURL={stream.toURL()}
        style={{ height: 220, width: "100%" }}
        mirror={mirror}
      />
    );
  return (
    <Calls.Provider value={{ start }}>
      {children}
      <Sheet
        open={!!call || !!error}
        title={
          call
            ? `${call.callType === "video" ? "Video" : "Audio"} call`
            : "Call unavailable"
        }
        description={
          call?.callerId === profile?.id ? call?.calleeName : call?.callerName
        }
        onClose={() => void finish()}
      >
        <Notice>
          {call?.status === "ringing"
            ? "Ringing…"
            : "Connected call · Ends when the app enters background."}
        </Notice>
        {!!remote && video(remote)}
        {!!(local && call?.callType === "video") && video(local, true)}
        <Row>
          {call?.status === "ringing" && call.calleeId === profile?.id && (
            <>
              <Button
                onPress={() =>
                  void (async () => {
                    try {
                      await connect(call);
                      if (runtime.current.call) await change("active");
                    } catch (e) {
                      setError(String(e));
                    }
                  })()
                }
              >
                Answer
              </Button>
              <Button variant="outline" onPress={() => void finish("declined")}>
                Decline
              </Button>
            </>
          )}
          {!!local && (
            <>
              <Button
                variant="outline"
                onPress={() => {
                  const next = !muted;
                  local.getAudioTracks().forEach((t: any) => {
                    t.enabled = !next;
                  });
                  setMuted(next);
                }}
              >
                {muted ? "Unmute" : "Mute"}
              </Button>
              {call?.callType === "video" && (
                <Button
                  variant="outline"
                  onPress={() => {
                    local.getVideoTracks().forEach((t: any) => {
                      t.enabled = !camera;
                    });
                    setCamera(!camera);
                  }}
                >
                  {camera ? "Camera off" : "Camera on"}
                </Button>
              )}
            </>
          )}
          <Button variant="danger" onPress={() => void finish()}>
            End call
          </Button>
        </Row>
        {!!error && <ErrorState error={error} />}
      </Sheet>
    </Calls.Provider>
  );
}
