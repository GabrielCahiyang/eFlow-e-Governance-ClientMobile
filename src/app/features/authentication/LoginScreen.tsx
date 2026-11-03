import { useNativeLogin } from "./useNativeLogin";
import { validateLoginFields } from "../../../core/web/app/features/authentication/services/loginValidation";
import { loginStyles as s } from "./loginStyles";
import {KeyboardAvoidingView,Platform,useWindowDimensions} from "react-native";
import {Pressable,ScrollView,View} from '../../components/ui/Primitives';
import {SafeAreaView} from '../../components/ui/Primitives';
import { LinearGradient } from "expo-linear-gradient";
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
import { EFlowMark } from "../../components/brand/EFlowMark";
import { ErrorShake, MotionView } from "../../shared/motion";
import { configurationError } from "../../../platform/config";
import { LivingBoard } from "./LivingBoard";

export function LoginScreen() {
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
              {!!small && (
                <View style={s.mobileBrand}>
                  <EFlowMark variant="white" height={36} state={markState} />
                  <Text style={s.mobileCity}>LGU Ormoc City</Text>
                </View>
              )}
              <MotionView
                kind="login"
                index={0}
                style={{ gap: 6, marginBottom: 6 }}
              >
                <Text accessibilityRole="header" style={s.heading}>
                  {recovery ? "Recover your account" : "Sign in to eFlow"}
                </Text>
                <Text style={s.subhead}>
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
                          <EyeOff color="#64748b" size={19} />
                        ) : (
                          <Eye color="#64748b" size={19} />
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
                        borderColor: remember ? "#0073ea" : "#cbd5e1",
                        backgroundColor: remember ? "#0073ea" : "#fff",
                        borderRadius: 4,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {!!remember && (
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: "700",
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, color: "#334155" }}>
                      Remember me
                    </Text>
                  </Pressable>
                )}
                <Button
                  variant="ghost"
                  textStyle={{ color: "#0073ea", fontSize: 13 }}
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
                  style={s.submit}
                  textStyle={{ fontSize: 15, fontWeight: "700" }}
                  busy={busy}
                  disabled={!!configurationError}
                  onPress={() => void signIn()}
                  icon={
                    recovery ? (
                      <LockKeyhole color="#fff" size={18} />
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
                    textStyle={{ color: "#0073ea" }}
                    disabled={busy}
                    icon={<Info color="#0073ea" size={16} />}
                    onPress={() => void openScenarios()}
                  >
                    Usage scenarios
                  </Button>
                </MotionView>
              )}
            </View>
          </View>
          <LinearGradient
            colors={["#0073ea", "#004ea0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              s.hero,
              wide && {
                flex: 1,
                borderTopLeftRadius: 28,
                borderBottomLeftRadius: 28,
                marginTop: 14,
                marginRight: 14,
                marginBottom: 14,
              },
              small && {
                paddingHorizontal: 10,
                paddingTop: 22,
                paddingBottom: 28,
              },
            ]}
          >
            <MotionView kind="hero" style={s.heroContent}>
              {!small && (
                <View style={s.heroBrand}>
                  <EFlowMark variant="white" height={50} state={markState} />
                  <View style={s.divider} />
                  <Text style={s.heroCity}>LGU Ormoc City</Text>
                </View>
              )}
              {!!small && <Text style={s.boardHint}>Project preview</Text>}
              <LivingBoard />
            </MotionView>
          </LinearGradient>
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
