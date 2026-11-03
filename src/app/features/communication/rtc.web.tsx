import { View } from "../../components/ui/Primitives";
import { useEffect, useRef } from "react";
export const RTCPeerConnection = globalThis.RTCPeerConnection,
  RTCSessionDescription = globalThis.RTCSessionDescription,
  RTCIceCandidate = globalThis.RTCIceCandidate;
export const mediaDevices = navigator.mediaDevices;
export function RTCView({
  stream,
  style,
  mirror,
}: {
  stream?: MediaStream;
  style?: any;
  mirror?: boolean;
  streamURL?: string;
  objectFit?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  return (
    <View style={style}>
      <video
        ref={ref}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: mirror ? "scaleX(-1)" : undefined,
        }}
      />
    </View>
  );
}
