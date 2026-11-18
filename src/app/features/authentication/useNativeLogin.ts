import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { rememberSession } from "../../../platform/authStorage";
import { signInOnMobile } from "./mobileSignIn";
import { validateLoginFields } from "../../../core/web/app/features/authentication/services/loginValidation";
import type { MarkState } from "../../components/brand/EFlowMark";
import { loginErrorMessage } from "./loginError";
export function useNativeLogin() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<{ email?: string; password?: string }>({}),
    [shake, setShake] = useState(0),
    [notice, setNotice] = useState("");
  const pending = useRef(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!busy) return;
    const timer = setTimeout(() => setSlow(true), 8_000);
    return () => clearTimeout(timer);
  }, [busy]);
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
      if (net.isConnected === false || net.isInternetReachable === false)
        throw new Error(
          "No network connection. Check your internet connection.",
        );
      await rememberSession(remember);
      await signInOnMobile(loginEmail, loginPassword);
    } catch (e) {
      setError(loginErrorMessage(e));
      setShake((old) => old + 1);
    } finally {
      pending.current = false;
      setBusy(false);
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
    slow,
    error,
    setError,
    errors,
    setErrors,
    shake,
    recovery: false,
    notice,
    setNotice,
    signIn,
    markState,
  };
}
