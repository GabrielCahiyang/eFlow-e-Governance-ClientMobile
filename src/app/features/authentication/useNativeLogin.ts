import { useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { rememberSession } from "../../../platform/authStorage";
import { signInWithAccountProtection } from "../../../core/web/app/features/authentication/services/accountLogin";
import { validateLoginFields } from "../../../core/web/app/features/authentication/services/loginValidation";
import type { QuickLoginAccount } from "../../../core/web/app/shared/quickLoginAccounts";
import type { MarkState } from "../../components/brand/EFlowMark";
export function useNativeLogin() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<{ email?: string; password?: string }>({}),
    [shake, setShake] = useState(0),
    [notice, setNotice] = useState(""),
    [scenarios, setScenarios] = useState<readonly QuickLoginAccount[]>(),
    [selected, setSelected] = useState("");
  const pending = useRef(false);
  const signIn = async (loginEmail = email, loginPassword = password) => {
    if (pending.current) return;
    const invalid = validateLoginFields(loginEmail, loginPassword);
    setErrors(invalid);
    if (invalid.email || invalid.password) {
      setShake((old) => old + 1);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const net = await NetInfo.fetch();
      if (net.isConnected === false)
        throw new Error(
          "No network connection. Check your internet connection.",
        );
      await rememberSession(remember);
      await signInWithAccountProtection(loginEmail, loginPassword);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to sign in right now. Please try again.",
      );
      setShake((old) => old + 1);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const openScenarios = async () => {
    if (__DEV__) {
      const module =
        await import("../../../core/web/app/shared/quickLoginAccounts");
      setScenarios(
        module.QUICK_LOGIN_ACCOUNTS.filter(
          (account) => account.roleLabel.toLowerCase() !== "admin",
        ),
      );
    }
  };
  const markState: MarkState = busy
    ? "submitting"
    : error || errors.email || errors.password
      ? "error"
      : "idle";
  return {
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
    recovery: false,
    notice,
    setNotice,
    scenarios,
    setScenarios,
    selected,
    setSelected,
    signIn,
    openScenarios,
    markState,
  };
}
