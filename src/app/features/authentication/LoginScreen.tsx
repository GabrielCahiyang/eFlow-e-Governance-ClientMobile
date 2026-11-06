import { useNativeLogin } from "./useNativeLogin";
import { SignInProgressNotice } from "./SignInProgressNotice";
import { validateLoginFields } from "../../../core/web/app/features/authentication/services/loginValidation";
import { loginStyles as s } from "./loginStyles";
import {
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Pressable, ScrollView, View } from "../../components/ui/Primitives";
import { SafeAreaView } from "../../components/ui/Primitives";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import Info from "lucide-react-native/icons/info";
import LockKeyhole from "lucide-react-native/icons/lock-keyhole";
import {
  Button,
  Choice,
  ErrorState,
  Field,
  Notice,
  Sheet,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { EFlowMark } from "../../components/brand/EFlowMark";
import { ErrorShake, MotionView } from "../../shared/motion";
import { configurationError } from "../../../platform/config";

export function LoginScreen() {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const linkColor = palette.blue;
  const { width } = useWindowDimensions(),
    wide = width >= 1200,
    small = width < 768;
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
    scenarios,
    setScenarios,
    selected,
    setSelected,
    signIn,
    openScenarios,
    markState,
  } = useNativeLogin();

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.page, wide && { flexDirection: "row" }]}
        >
          <View
            style={[
              s.auth,
              wide && { width: "34%", minWidth: 380 },
              small && { paddingHorizontal: 20, paddingVertical: 24 },
            ]}
          >
            <View style={[s.form, small && { maxWidth: "100%" }]}>
              <View style={s.mobileBrand}>
                <EFlowMark variant="white" height={36} state={markState} />
                <Text style={s.mobileCity}>LGU Ormoc City</Text>
              </View>
              <MotionView
                kind="login"
                index={0}
                style={{ gap: 6, marginBottom: 6 }}
              >
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
              {!!notice && <Notice>{notice}</Notice>}
              <SignInProgressNotice waiting={busy && slow} />
              <MotionView kind="login" index={1}>
                <ErrorShake trigger={errors.email ? shake : 0}>
                  <Field
                    label="Email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    value={email}
                    editable={!busy}
                    error={errors.email}
                    onChangeText={setEmail}
                    onBlur={() =>
                      setErrors((previous) => ({
                        ...previous,
                        email: validateLoginFields(email, password).email,
                      }))
                    }
                  />
                </ErrorShake>
              </MotionView>
              {!recovery && (
                <MotionView kind="login" index={2}>
                  <ErrorShake trigger={!errors.email ? shake : 0}>
                    <View>
                      <Field
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!show}
                        editable={!busy}
                        autoComplete="current-password"
                        error={errors.password}
                        style={{ paddingRight: 54 }}
                        onBlur={() =>
                          setErrors((previous) => ({
                            ...previous,
                            password: validateLoginFields(email, password)
                              .password,
                          }))
                        }
                        onSubmitEditing={() => void signIn()}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          show ? "Hide password" : "Show password"
                        }
                        disabled={busy}
                        onPress={() => setShow(!show)}
                        style={s.reveal}
                      >
                        {show ? (
                          <EyeOff color={palette.mutedLabel} size={19} />
                        ) : (
                          <Eye color={palette.mutedLabel} size={19} />
                        )}
                      </Pressable>
                    </View>
                  </ErrorShake>
                </MotionView>
              )}
              <MotionView
                kind="login"
                index={3}
                style={{
                  gap: 8,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {!recovery && (
                  <Pressable
                    accessibilityRole="checkbox"
                    aria-checked={remember}
                    accessibilityLabel="Remember me"
                    accessibilityState={{ checked: remember, disabled: busy }}
                    disabled={busy}
                    onPress={() => setRemember(!remember)}
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      minHeight: 44,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderWidth: 1.5,
                        borderColor: remember ? linkColor : palette.mutedLabel,
                        backgroundColor: remember ? linkColor : palette.surface,
                        borderRadius: 4,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {!!remember && (
                        <Text
                          style={{
                            color: isDark ? palette.onPrimary : "#fff",
                            fontSize: 14,
                            fontWeight: "700",
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, color: palette.muted }}>
                      Remember me
                    </Text>
                  </Pressable>
                )}
                <Button
                  variant="ghost"
                  textStyle={{ color: linkColor, fontSize: 13 }}
                  disabled={busy}
                  onPress={() => {
                    setError("");
                    setErrors({});
                    setNotice(
                      "Please contact your office IT administrator or Admin to reset your password.",
                    );
                  }}
                >
                  Forgot your password?
                </Button>
              </MotionView>
              <MotionView kind="login" index={4}>
                <Button
                  style={[
                    s.submit,
                    { backgroundColor: isDark ? palette.primary : linkColor },
                  ]}
                  textStyle={{ fontSize: 15, fontWeight: "700" }}
                  busy={busy}
                  disabled={!!configurationError}
                  onPress={() => void signIn()}
                  icon={
                    recovery ? (
                      <LockKeyhole color={palette.onPrimary} size={18} />
                    ) : undefined
                  }
                >
                  {recovery
                    ? "Send recovery link"
                    : error.includes("locked")
                      ? "Try signing in again"
                      : "Log in"}
                </Button>
              </MotionView>
              {!!(__DEV__ && !recovery) && (
                <MotionView kind="login" index={5}>
                  <Button
                    variant="ghost"
                    textStyle={{ color: palette.blue }}
                    disabled={busy}
                    icon={<Info color={palette.blue} size={16} />}
                    onPress={() => void openScenarios()}
                  >
                    Usage scenarios
                  </Button>
                </MotionView>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Sheet
        open={!!scenarios}
        title="Usage scenarios"
        description="Choose an existing development account."
        busy={busy}
        onClose={() => setScenarios(undefined)}
        footer={
          <Button
            busy={busy}
            disabled={!selected}
            onPress={() => {
              const account = scenarios?.find((a) => a.email === selected);
              if (account) {
                setEmail(account.email);
                setPassword(account.password);
                setScenarios(undefined);
                void signIn(account.email, account.password);
              }
            }}
          >
            Use selected account
          </Button>
        }
      >
        <Choice
          label="Development account"
          value={selected}
          onChange={setSelected}
          options={(scenarios || []).map((a) => ({
            value: a.email,
            label: a.label,
            description: a.roleLabel,
          }))}
        />
      </Sheet>
    </SafeAreaView>
  );
}
