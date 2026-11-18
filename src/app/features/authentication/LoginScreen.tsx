import {
  forwardRef,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import { useNativeLogin } from "./useNativeLogin";
import { SignInProgressNotice } from "./SignInProgressNotice";
import { validateLoginFields } from "../../../core/web/app/features/authentication/services/loginValidation";
import { loginStyles as s } from "./loginStyles";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  useWindowDimensions,
  type TextInput as NativeTextInput,
  type TextInputProps,
} from "react-native";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  View,
} from "../../components/ui/Primitives";
import { LinearGradient } from "expo-linear-gradient";
import CirclePlay from "lucide-react-native/icons/circle-play";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import LockKeyhole from "lucide-react-native/icons/lock-keyhole";
import LogIn from "lucide-react-native/icons/log-in";
import { Button, ErrorState, Notice } from "../../components/ui";
import { Text, TextInput } from "../../components/ui/Typography";
import { brandColors, withOpacity } from "../../components/ui/theme";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { EFlowMark } from "../../components/brand/EFlowMark";
import { ErrorShake, MotionView } from "../../shared/motion";
import { userErrorMessage } from "../../shared/userMessages";
import { backendConfig, configurationError } from "../../../platform/config";
import { webHandoffUrl } from "../../../platform/webHandoff";

const PASSWORD_HELP_NOTICE =
  "Ask your Office IT team or eFlow administrator to reset your password.";

type LoginFieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  required?: boolean;
  error?: string;
  focused?: boolean;
  insetBackground: string;
  trailing?: ReactNode;
};

/** Shared login field shell keeping inset contrast and trailing controls aligned at high font scales. */
const LoginField = forwardRef<
  ComponentRef<typeof NativeTextInput>,
  LoginFieldProps
>(function LoginField(
  { label, required, error, focused, insetBackground, trailing, ...inputProps },
  ref,
) {
  const palette = useTheme();
  const borderColor = error
    ? palette.danger
    : focused
      ? palette.blue
      : palette.border;

  return (
    <View style={s.field}>
      <Text style={[s.fieldLabel, { color: palette.text }]}>
        {label}
        {required ? " *" : ""}
      </Text>
      <View
        style={[s.inputRow, { backgroundColor: insetBackground, borderColor }]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={required ? "Required" : undefined}
          placeholderTextColor={palette.mutedLabel}
          selectionColor={palette.blue}
          {...inputProps}
          style={[s.inputControl, { color: palette.text }]}
        />
        {trailing}
      </View>
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={[s.fieldError, { color: palette.danger }]}
        >
          {userErrorMessage(error, "action")}
        </Text>
      )}
    </View>
  );
});

export function LoginScreen() {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const walkthroughUrl = webHandoffUrl(
    { name: "walkthrough" },
    backendConfig.webOrigin,
  );
  const { width } = useWindowDimensions();
  const small = width < 768;
  const passwordRef = useRef<ComponentRef<typeof NativeTextInput>>(null);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(
    null,
  );
  const {
    email,
    setEmail,
    password,
    setPassword,
    show,
    setShow,
    remember,
    setRemember,
    busy,
    slow,
    error,
    setError,
    errors,
    setErrors,
    shake,
    recovery,
    notice,
    setNotice,
    signIn,
    markState,
  } = useNativeLogin();

  const insetFieldBg = isDark ? "#0d152d" : "#f7f9fd";
  const showWalkthrough = !recovery && !!walkthroughUrl;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: palette.background }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[
          withOpacity(
            isDark ? palette.primary : brandColors.blue,
            isDark ? 0.14 : 0.11,
          ),
          withOpacity(palette.background, 0),
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={s.ambientWash}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.page,
            small && { paddingHorizontal: 16, paddingVertical: 20 },
          ]}
        >
          <View style={s.column}>
            {/* Lightweight brand lockup */}
            <View style={s.brandRow}>
              <EFlowMark variant="default" height={28} state={markState} />
              <View
                importantForAccessibility="no"
                style={[s.brandDivider, { backgroundColor: palette.border }]}
              />
              <Text style={[s.brandOrg, { color: palette.muted }]}>
                LGU Ormoc City
              </Text>
            </View>

            {/* Floating elevated authentication surface card */}
            <View
              style={[
                s.card,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
                small && { paddingHorizontal: 18, paddingVertical: 22 },
                !isDark && s.cardShadowLight,
              ]}
            >
              <MotionView kind="login" index={0} style={s.headerGroup}>
                <Text
                  accessibilityRole="header"
                  style={[s.heading, { color: palette.text }]}
                >
                  {recovery ? "Recover your account" : "Sign in to eFlow"}
                </Text>
                <Text style={[s.subhead, { color: palette.muted }]}>
                  {recovery
                    ? "Use your official LGU account email."
                    : "Use your official LGU account."}
                </Text>
              </MotionView>

              {!!configurationError && (
                <ErrorState error={configurationError} />
              )}
              {!!error && (
                <MotionView key={shake} kind="enter">
                  <ErrorState error={error} />
                </MotionView>
              )}
              <SignInProgressNotice waiting={busy && slow} />

              <MotionView kind="login" index={1}>
                <ErrorShake trigger={errors.email ? shake : 0}>
                  <LoginField
                    label="Email address"
                    required
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType={recovery ? "go" : "next"}
                    value={email}
                    editable={!busy}
                    error={errors.email}
                    focused={focusedField === "email"}
                    insetBackground={insetFieldBg}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => {
                      setFocusedField((cur) => (cur === "email" ? null : cur));
                      setErrors((previous) => ({
                        ...previous,
                        email: validateLoginFields(email, password).email,
                      }));
                    }}
                    onSubmitEditing={() => {
                      if (!recovery) passwordRef.current?.focus();
                      else void signIn();
                    }}
                  />
                </ErrorShake>
              </MotionView>

              {!recovery && (
                <MotionView kind="login" index={2}>
                  <ErrorShake trigger={!errors.email ? shake : 0}>
                    <LoginField
                      ref={passwordRef}
                      label="Password"
                      required
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!show}
                      editable={!busy}
                      autoComplete="current-password"
                      returnKeyType="go"
                      error={errors.password}
                      focused={focusedField === "password"}
                      insetBackground={insetFieldBg}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => {
                        setFocusedField((cur) =>
                          cur === "password" ? null : cur,
                        );
                        setErrors((previous) => ({
                          ...previous,
                          password: validateLoginFields(email, password)
                            .password,
                        }));
                      }}
                      onSubmitEditing={() => void signIn()}
                      trailing={
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            show ? "Hide password" : "Show password"
                          }
                          disabled={busy}
                          hitSlop={4}
                          onPress={() => setShow(!show)}
                          style={s.reveal}
                        >
                          {show ? (
                            <EyeOff color={palette.mutedLabel} size={19} />
                          ) : (
                            <Eye color={palette.mutedLabel} size={19} />
                          )}
                        </Pressable>
                      }
                    />
                  </ErrorShake>
                </MotionView>
              )}

              <MotionView kind="login" index={3} style={s.utilityRow}>
                {!recovery && (
                  <Pressable
                    accessibilityRole="checkbox"
                    aria-checked={remember}
                    accessibilityLabel="Keep me signed in"
                    accessibilityState={{ checked: remember, disabled: busy }}
                    disabled={busy}
                    onPress={() => setRemember(!remember)}
                    style={s.rememberBtn}
                  >
                    <View
                      style={[
                        s.checkbox,
                        {
                          borderColor: remember
                            ? palette.primary
                            : palette.mutedLabel,
                          backgroundColor: remember
                            ? palette.primary
                            : palette.surface,
                        },
                      ]}
                    >
                      {!!remember && (
                        <Text
                          style={{
                            color: palette.onPrimary,
                            fontSize: 13,
                            fontWeight: "700",
                            lineHeight: 16,
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 13.5, color: palette.muted }}>
                      Keep me signed in
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  hitSlop={6}
                  onPress={() => {
                    setError("");
                    setErrors({});
                    setNotice((current) =>
                      current === PASSWORD_HELP_NOTICE
                        ? ""
                        : PASSWORD_HELP_NOTICE,
                    );
                  }}
                  style={({ pressed }) => [
                    s.helpLink,
                    busy ? { opacity: 0.45 } : pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[s.linkText, { color: palette.blue }]}>
                    Get password help
                  </Text>
                </Pressable>
              </MotionView>

              {!!notice && (
                <MotionView kind="enter">
                  <Notice>{notice}</Notice>
                </MotionView>
              )}

              <MotionView kind="login" index={4}>
                <Button
                  style={[
                    s.submit,
                    { backgroundColor: palette.primary },
                    !isDark && s.submitShadowLight,
                  ]}
                  textStyle={{ fontSize: 15, fontWeight: "700" }}
                  busy={busy}
                  disabled={!!configurationError}
                  onPress={() => void signIn()}
                  icon={
                    recovery ? (
                      <LockKeyhole color={palette.onPrimary} size={18} />
                    ) : (
                      <LogIn color={palette.onPrimary} size={18} />
                    )
                  }
                >
                  {recovery ? "Send recovery link" : "Sign in"}
                </Button>
              </MotionView>
            </View>

            {/* Quiet footer link below the card */}
            {showWalkthrough && (
              <MotionView kind="login" index={5} style={s.footer}>
                <View style={s.footerLinks}>
                  <Pressable
                    accessibilityRole="link"
                    disabled={busy}
                    hitSlop={6}
                    onPress={() => {
                      void Linking.openURL(walkthroughUrl).catch(() =>
                        setNotice(
                          "Could not open the eFlow Web walkthroughs.",
                        ),
                      );
                    }}
                    style={({ pressed }) => [
                      s.footerLink,
                      busy ? { opacity: 0.45 } : pressed && { opacity: 0.7 },
                    ]}
                  >
                    <CirclePlay size={15} color={palette.blue} />
                    <Text style={[s.linkText, { color: palette.blue }]}>
                      Watch the eFlow Web walkthroughs
                    </Text>
                  </Pressable>
                </View>
              </MotionView>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
