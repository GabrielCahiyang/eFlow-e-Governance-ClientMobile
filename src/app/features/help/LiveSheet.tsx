import { useEffect, useState } from "react";
import {StyleSheet,useWindowDimensions} from "react-native";
import {View} from '../../components/ui/Primitives';
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import Mic from "lucide-react-native/icons/mic";
import MicOff from "lucide-react-native/icons/mic-off";
import MessageSquare from "lucide-react-native/icons/message-square";
import {
  Button,
  ErrorState,
  Notice,
  Row,
  Sheet,
  colors,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useMotionPreferences } from "../../shared/motion";
import { HELP_STAGES } from "../../../core/web/app/features/help-assistant/constants";
import type {
  ConversationStage,
  HelpMessage,
} from "../../../core/web/app/features/help-assistant/types";
import type { useNativeVoice } from "./voice/useNativeVoice";
type Voice = ReturnType<typeof useNativeVoice>;
function VoiceOrb({ level, active }: { level: number; active: boolean }) {
  const { reduced } = useMotionPreferences(),
    phase = useSharedValue(0);
  useEffect(() => {
    phase.value =
      active && !reduced
        ? withRepeat(
            withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
            -1,
            true,
          )
        : withTiming(0);
    return () => cancelAnimation(phase);
  }, [active, reduced]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + phase.value * 0.025 }],
  }));
  return (
    <Animated.View style={[s.orbWrap, style]}>
      <LinearGradient
        colors={["#80e1c7", "#159b90", "#066e73"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={s.orb}
      >
        <View style={s.wave}>
          {[0.4, 0.7, 1, 0.6, 0.9, 0.5].map((amount, index) => (
            <View
              key={index}
              style={{
                width: 6,
                borderRadius: 4,
                backgroundColor: "#eafff9",
                height: Math.max(8, (active ? 18 : 10) + level * 50 * amount),
              }}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
export function LiveSheet({
  open,
  scope,
  voice,
  messages,
  stage,
  draft,
  error,
  onClose,
}: {
  open: boolean;
  scope: string;
  voice: Voice;
  messages: HelpMessage[];
  stage: ConversationStage;
  draft: string;
  error: string;
  onClose: () => void;
}) {
  const [transcript, setTranscript] = useState(false),
    { height } = useWindowDimensions(),
    latest = messages.filter((m) => m.role === "assistant").at(-1),
    status = voice.starting
      ? "Starting microphone"
      : voice.paused
        ? "Listening paused"
        : stage !== "idle"
          ? HELP_STAGES[stage]
          : voice.transcribing
            ? "Understanding your words"
            : voice.signal.ending
              ? "Finishing your turn"
              : voice.mode === "live"
                ? "Listening"
                : "Ready when you are";
  return (
    <Sheet
      open={open}
      title="eFlow Live"
      description="Talk through your work, one question at a time."
      maxWidth={1180}
      onClose={onClose}
      footer={
        <>
          <Row>
            <Button
              variant="outline"
              icon={<MessageSquare size={18} color={colors.primary} />}
              onPress={onClose}
            >
              Back to chat
            </Button>
            {voice.mode === "live" ? (
              <Button
                icon={
                  voice.paused ? (
                    <Mic size={18} color="#fff" />
                  ) : (
                    <MicOff size={18} color="#fff" />
                  )
                }
                onPress={voice.pause}
              >
                {voice.paused ? "Resume listening" : "Pause listening"}
              </Button>
            ) : (
              <Button
                busy={voice.starting}
                onPress={() => void voice.start("live")}
              >
                Start conversation
              </Button>
            )}
            <Button variant="outline" onPress={onClose}>
              End
            </Button>
            {!!(stage !== "idle") && (
              <Button variant="outline" onPress={voice.interrupt}>
                Interrupt answer
              </Button>
            )}
          </Row>
          <Text style={s.small}>
            AI can make mistakes. Pause affects listening; an answer already
            being prepared or spoken continues.
          </Text>
        </>
      }
    >
      <Text style={s.scope}>{scope} · Read only · English</Text>
      <View style={[s.stage, { minHeight: Math.min(430, height * 0.47) }]}>
        <VoiceOrb
          level={voice.signal.level}
          active={
            voice.signal.speaking === true ||
            stage === "speaking" ||
            stage === "preparing" ||
            stage === "thinking"
          }
        />
        <Text accessibilityLiveRegion="polite" style={s.status}>
          {status}
        </Text>
        <Text selectable style={s.answer}>
          {draft ||
            latest?.text ||
            "Ask a question about eFlow or the selected project."}
        </Text>
      </View>
      <View style={s.meter}>
        <View
          style={[
            s.meterFill,
            { width: `${Math.round(voice.signal.level * 100)}%` },
          ]}
        />
      </View>
      <Text style={s.small}>{voice.signal.label || "Microphone is off"}</Text>
      {!!voice.signal.warning && <Notice>{voice.signal.warning}</Notice>}
      {!!(voice.error || error) && <ErrorState error={voice.error || error} />}
      <Button variant="ghost" onPress={() => setTranscript((value) => !value)}>
        {transcript ? "Hide transcript" : "Show transcript"}
      </Button>
      {transcript &&
        messages.map((message) => (
          <View key={message.id} style={s.transcript}>
            <Text style={s.status}>
              {message.role === "user" ? "You" : "eFlow AI"}
            </Text>
            <Text selectable style={s.body}>
              {message.text}
            </Text>
          </View>
        ))}
    </Sheet>
  );
}
const s = StyleSheet.create({
  scope: { fontSize: 12, color: colors.muted },
  stage: {
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 22,
  },
  orbWrap: {
    padding: 13,
    borderWidth: 1,
    borderColor: "#159b9030",
    borderRadius: 140,
  },
  orb: {
    width: 176,
    height: 176,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  wave: { flexDirection: "row", alignItems: "center", gap: 7 },
  status: { fontSize: 14, fontWeight: "600", color: colors.muted },
  answer: {
    fontSize: 23,
    lineHeight: 34,
    textAlign: "center",
    color: colors.text,
    maxWidth: 840,
  },
  small: { fontSize: 12, lineHeight: 18, color: colors.muted },
  meter: {
    height: 5,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  meterFill: { height: 5, backgroundColor: colors.primary },
  transcript: {
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    gap: 6,
  },
  body: { fontSize: 15, lineHeight: 24, color: colors.text },
});
