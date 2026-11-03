import { supabase } from "../../lib/supabase";

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "active" | "ended" | "declined" | "missed";

export interface ActiveCall {
  id: string;
  channelId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  callType: CallType;
  status: CallStatus;
}

function getIceServers() {
  const servers = [{ urls: process.env.EXPO_PUBLIC_STUN_URL }];
  if (process.env.EXPO_PUBLIC_TURN_URL) {
    servers.push({
      urls: process.env.EXPO_PUBLIC_TURN_URL,
      username: process.env.EXPO_PUBLIC_TURN_USERNAME,
      credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
    } as any);
  }
  return servers;
}

// ─── initiateCall ────────────────────────────────────────────────────
// Creates the `calls` row (this is what IncomingCallListener on the
// other end picks up via realtime) and returns the call id.
export async function initiateCall(
  channelId: string,
  callerId: string,
  callerName: string,
  calleeId: string,
  calleeName: string,
  callType: CallType,
): Promise<string> {
  const { data, error } = await supabase
    .from("calls")
    .insert({
      channel_id: channelId,
      caller_id: callerId,
      caller_name: callerName,
      callee_id: calleeId,
      callee_name: calleeName,
      call_type: callType,
      status: "ringing",
    })
    .select()
    .single();
  if (error) throw error;
  return data.id;
}

export async function answerCall(callId: string): Promise<void> {
  await supabase.from("calls").update({ status: "active", answered_at: new Date().toISOString() }).eq("id", callId);
}

export async function declineCall(callId: string): Promise<void> {
  await supabase.from("calls").update({ status: "declined", ended_at: new Date().toISOString() }).eq("id", callId);
}

export async function endCall(callId: string): Promise<void> {
  await supabase.from("calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", callId);
}

// ─── subscribeToIncomingCalls ────────────────────────────────────────
// Global listener — mounted once, high in the app tree, regardless of
// what panel the user is currently looking at.
export function subscribeToIncomingCalls(
  userId: string,
  callback: (call: ActiveCall) => void,
): () => void {
  const channel = supabase
    .channel(`incoming-calls-${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as any;
        if (row.status === "ringing") {
          callback({
            id: row.id,
            channelId: row.channel_id,
            callerId: row.caller_id,
            callerName: row.caller_name,
            calleeId: row.callee_id,
            calleeName: row.callee_name,
            callType: row.call_type,
            status: row.status,
          });
        }
      },
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ─── WebRTCSession ────────────────────────────────────────────────────
// Wraps RTCPeerConnection + the signaling broadcast channel for one
// call. Both caller and callee construct one of these; role determines
// who creates the offer vs. waits for one.
export class WebRTCSession {
  private pc: RTCPeerConnection;
  private signalChannel: ReturnType<typeof supabase.channel>;
  public onRemoteStream?: (stream: MediaStream) => void;
  public onHangup?: () => void;

  constructor(
    callId: string,
    private isCaller: boolean,
  ) {
    this.pc = new RTCPeerConnection({ iceServers: getIceServers() as any });
    this.signalChannel = supabase.channel(`call-signal-${callId}`);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalChannel.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate },
        });
      }
    };

    this.pc.ontrack = (event) => {
      this.onRemoteStream?.(event.streams[0]);
    };

    this.signalChannel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (this.isCaller) return; // caller doesn't listen for offers
        await this.pc.setRemoteDescription(payload.sdp);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.signalChannel.send({ type: "broadcast", event: "answer", payload: { sdp: answer } });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (!this.isCaller) return;
        await this.pc.setRemoteDescription(payload.sdp);
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        try {
          await this.pc.addIceCandidate(payload.candidate);
        } catch (err) {
          console.error("Failed to add ICE candidate:", err);
        }
      })
      .on("broadcast", { event: "hangup" }, () => {
        this.onHangup?.();
      })
      .subscribe();
  }

  async start(localStream: MediaStream): Promise<void> {
    localStream.getTracks().forEach((track) => this.pc.addTrack(track, localStream));
    if (this.isCaller) {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.signalChannel.send({ type: "broadcast", event: "offer", payload: { sdp: offer } });
    }
  }

  hangup(): void {
    this.signalChannel.send({ type: "broadcast", event: "hangup", payload: {} });
    this.pc.close();
    supabase.removeChannel(this.signalChannel);
  }
}

export async function getLocalMedia(callType: CallType): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callType === "video",
  });
}
