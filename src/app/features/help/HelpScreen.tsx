import { useTheme } from "../../components/ui/Appearance";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {KeyboardAvoidingView,Platform,StyleSheet} from "react-native";
import {ScrollView,View} from '../../components/ui/Primitives';
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Volume2 from "lucide-react-native/icons/volume-2";
import Send from "lucide-react-native/icons/send";
import Mic from "lucide-react-native/icons/mic";
import AudioLines from "lucide-react-native/icons/audio-lines";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import {
  Button,
  Card,
  Choice,
  ErrorState,
  Field,
  Notice,
  Row,
  colors,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { EFlowMark } from "../../components/brand/EFlowMark";
import { useAuth } from "../authentication";
import type { Navigate } from "../../shared/routes";
import { useNativeHelp } from "./useNativeHelp";
import { loadHelpProjects } from "./services";
import type { HelpProject } from "../../../core/web/app/features/help-assistant/types";
import { HELP_STAGES } from "../../../core/web/app/features/help-assistant/constants";
import { useNativeVoice } from "./voice/useNativeVoice";
import { LiveSheet } from "./LiveSheet";
export function HelpScreen({ navigate }: { navigate: Navigate }) {
  const palette = useTheme();
  const { profile } = useAuth(),
    focused = useIsFocused(),
    insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<HelpProject[]>([]),
    [projectId, setProjectId] = useState(""),
    [draft, setDraft] = useState(""),
    [projectError, setProjectError] = useState<Error>(),
    [projectAttempt, setProjectAttempt] = useState(0),
    [live, setLive] = useState(false);
  const conversation = useNativeHelp(profile?.id || "", projectId, focused),
    scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const voice = useNativeVoice({
    actor: profile?.id || "",
    project: projectId,
    focused,
    draft,
    setDraft,
    sendLive: (text) => conversation.send(text, { mode: "live", speak: true }),
    stopReply: conversation.stop,
  });
  const endLive = () => {
    setLive(false);
    void voice.stop();
  };
  useEffect(() => {
    const controller = new AbortController();
    setProjectError(undefined);
    setProjects([]);
    void loadHelpProjects(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setProjects(result.projects);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setProjectError(error);
      });
    return () => controller.abort();
  }, [profile?.id, projectAttempt]);
  const submit = () => {
    if (!draft.trim() || conversation.busy || voice.mode !== "off") return;
    const question = draft;
    setDraft("");
    void conversation.send(question).then((saved) => {
      if (!saved) setDraft((current) => current || question);
    });
  };
  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.header}>
        <EFlowMark height={32} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text accessibilityRole="header" style={s.title}>
            Talk to eFlow AI
          </Text>
          <Text style={s.small}>
            Guidance for your work, with the records behind each answer.
          </Text>
        </View>
        <Button
          variant="outline"
          disabled={voice.mode === "dictation" || conversation.busy}
          icon={<AudioLines size={18} color={colors.primary} />}
          onPress={() => {
            setLive(true);
            void voice.start("live");
          }}
        >
          eFlow Live
        </Button>
      </View>
      <View style={s.scope}>
        <Choice
          label="Ask about"
          value={projectId}
          onChange={(id) => {
            if (!conversation.busy) {
              setDraft("");
              setProjectId(id);
            }
          }}
          disabled={conversation.busy || voice.mode !== "off"}
          options={[
            { value: "", label: "eFlow workflows" },
            ...projects.map((p) => ({ value: p.id, label: p.title })),
          ]}
        />
        <Text style={s.small}>Read only · English</Text>
      </View>
      <Notice>
        Lightweight AI can make mistakes. Verify important details in eFlow.
      </Notice>
      {!!projectError && (
        <ErrorState
          error={projectError}
          retry={() => setProjectAttempt((value) => value + 1)}
        />
      )}
      <ScrollView
        ref={scroll}
        contentContainerStyle={s.messages}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: false })
        }
      >
        {!conversation.messages.length && (
          <Card title="How can I help?">
            <Text style={s.body}>
              Ask how eFlow works, or choose a project to discuss the records
              you can access.
            </Text>
            {[
              "How does task funding affect Office Budget?",
              "How do I complete a task for review?",
              "How do invitations work in a project?",
            ].map((question) => (
              <Button
                key={question}
                variant="outline"
                onPress={() => setDraft(question)}
              >
                {question}
              </Button>
            ))}
          </Card>
        )}
        {conversation.messages.map((message) => (
          <View
            key={message.id}
            style={[s.bubble, message.role === "user" ? s.user : s.assistant]}
          >
            <Text style={s.label}>
              {message.role === "user" ? "You" : "eFlow AI"}
            </Text>
            <Text selectable style={s.body}>
              {message.text}
            </Text>
            {!!message.reply && (
              <>
                <Button
                  variant="ghost"
                  icon={<Volume2 size={17} color={colors.primary} />}
                  disabled={conversation.busy}
                  onPress={() => void conversation.speak(message.reply!)}
                >
                  Listen
                </Button>
                {!!message.reply.notice && (
                  <Text style={s.small}>{message.reply.notice}</Text>
                )}
                {message.reply.sources.map((source, index) => (
                  <View key={source.id + ":" + index} style={s.source}>
                    <Text style={s.label}>{source.title}</Text>
                    <Text selectable style={s.small}>
                      {source.text}
                    </Text>
                    {!!(source.taskId || source.projectId) && (
                      <Button
                        variant="ghost"
                        onPress={() =>
                          navigate(
                            source.taskId
                              ? {
                                  name: "task",
                                  id: source.taskId,
                                  projectId: source.projectId,
                                }
                              : { name: "project", id: source.projectId },
                          )
                        }
                      >
                        Open source
                      </Button>
                    )}
                  </View>
                ))}
                <Text style={s.small}>
                  Observed {new Date(message.reply.observedAt).toLocaleString()}{" "}
                  · {message.reply.knowledgeVersion}
                </Text>
              </>
            )}
          </View>
        ))}
        {!!conversation.error && <ErrorState error={conversation.error} />}
      </ScrollView>
      <View
        style={[s.composer, { paddingBottom: Math.max(10, insets.bottom) }]}
      >
        <Row>
          <Text accessibilityLiveRegion="polite" style={s.small}>
            {voice.mode === "dictation"
              ? voice.transcribing
                ? "Transcribing your words"
                : voice.signal.label || "Listening"
              : HELP_STAGES[conversation.stage]}
          </Text>
          {!!conversation.busy && (
            <Button variant="ghost" onPress={conversation.stop}>
              {conversation.stage === "thinking"
                ? "Cancel answer"
                : "Stop voice"}
            </Button>
          )}
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Field
              label="Your question"
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask about eFlow or this project…"
              multiline
              maxLength={2000}
              editable={!conversation.busy && voice.mode === "off"}
            />
          </View>
          <Button
            variant="outline"
            accessibilityLabel={
              voice.mode === "dictation"
                ? "Stop dictation"
                : "Dictate your question"
            }
            disabled={
              conversation.busy || voice.starting || voice.mode === "live"
            }
            icon={<Mic size={18} color={colors.primary} />}
            onPress={() =>
              void (voice.mode === "dictation"
                ? voice.finishDictation()
                : voice.start("dictation"))
            }
          >
            {voice.mode === "dictation" ? "Stop mic" : "Mic"}
          </Button>
          <Button
            accessibilityLabel="Send question"
            disabled={
              !draft.trim() || conversation.busy || voice.mode !== "off"
            }
            icon={<Send size={19} color={palette.onPrimary} />}
            onPress={submit}
          >
            Send
          </Button>
        </Row>
        {!!voice.error && <ErrorState error={voice.error} />}
        {!!(voice.mode === "dictation") && (
          <View
            style={{
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 3,
            }}
          >
            <View
              style={{
                height: 4,
                width: `${Math.round(voice.signal.level * 100)}%`,
                backgroundColor: colors.primary,
                borderRadius: 3,
              }}
            />
          </View>
        )}
        <Text style={s.small}>
          Read-only guidance. Answers do not change work or permissions.
        </Text>
      </View>
      <LiveSheet
        open={live}
        scope={
          projects.find((p) => p.id === projectId)?.title || "eFlow workflows"
        }
        voice={voice}
        messages={conversation.messages}
        stage={conversation.stage}
        draft={draft}
        error={conversation.error}
        onClose={endLive}
      />
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 21, fontWeight: "700", color: colors.text },
  small: { fontSize: 12, lineHeight: 18, color: colors.muted },
  scope: { padding: 12, gap: 5 },
  messages: { padding: 16, gap: 16 },
  bubble: {
    padding: 16,
    borderRadius: 14,
    gap: 10,
    maxWidth: 820,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assistant: { backgroundColor: colors.surface, alignSelf: "flex-start" },
  user: { backgroundColor: colors.primarySoft, alignSelf: "flex-end" },
  label: { fontSize: 12, fontWeight: "600", color: colors.muted },
  body: { fontSize: 15, lineHeight: 24, color: colors.text },
  source: {
    gap: 4,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
  },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 7,
    backgroundColor: colors.surface,
  },
});
