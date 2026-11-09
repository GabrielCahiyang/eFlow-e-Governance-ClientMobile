import { createPostgresChannel } from "../../shared/postgresChannel";
import {
  clearDisplayCache,
  setDisplayCacheActor,
} from "../../shared/displayCache";
import {
  AccountActionContext,
  type AccountActionAccess,
} from "../../shared/AccountActionAccess";
import { readWithTimeout } from "../../shared/readTimeout";
import { isConnectionFailure } from "../../shared/userMessages";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../platform/supabase";
import { unregisterPushBeforeSignOut } from "../../../platform/push";
import { resetAuthCaches } from "../../../core/web/app/shared/authCacheReset";
import { normalizeUserRole } from "../../../core/web/app/shared/roles";
import { isMobileRole, MOBILE_ROLE_NOTICE } from "../../shared/mobileRoles";
import { resolvePermissions } from "../../../core/web/app/features/permissions/selectors";
import type { UserProfile, Organization } from "../../../core/web/app/types";

type AuthValue = {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  checkingAccess: boolean;
  accessError?: Error;
  error?: Error;
  permissions: Set<string>;
  can: (key: string) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);
function temporaryFailure(error: unknown) {
  const failure = error as { status?: number; name?: string } | null;
  if (failure?.status === 401 || failure?.status === 403) return false;
  return (
    isConnectionFailure(error) ||
    failure?.name === "AuthRetryableFetchError" ||
    (typeof failure?.status === "number" && failure.status >= 500)
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<UserProfile | null>(null),
    [organization, setOrganization] = useState<Organization | null>(null),
    [permissions, setPermissions] = useState(new Set<string>()),
    [loading, setLoading] = useState(true),
    [checkingAccess, setCheckingAccess] = useState(false),
    [accessError, setAccessError] = useState<Error>(),
    [error, setError] = useState<Error>();
  const version = useRef(0),
    accessSignature = useRef(""),
    identity = useRef<string | null>(null),
    current = useRef<User | null>(null),
    verifiedProfile = useRef<UserProfile | null>(null),
    appState = useRef(AppState.currentState),
    needsResumeCheck = useRef(AppState.currentState === "background"),
    actionAccess = useRef<AccountActionAccess>({ actor: null, ready: false }),
    pending = useRef<{
      actor: string;
      promise: Promise<void>;
      again: boolean;
    } | null>(null);

  const requestRefresh = useCallback((invalidate = false): Promise<void> => {
    const actor = current.current;
    if (!actor) return Promise.resolve();
    actionAccess.current = { actor: actor.id, ready: false };
    if (pending.current?.actor === actor.id) {
      if (invalidate) {
        ++version.current;
        pending.current.again = true;
      }
      return pending.current.promise;
    }
    const job = { actor: actor.id, promise: Promise.resolve(), again: false };
    pending.current = job;
    job.promise = (async () => {
      do {
        job.again = false;
        const revision = ++version.current;
        const isCurrent = () =>
          revision === version.current && current.current?.id === actor.id;
        setLoading(!verifiedProfile.current);
        setCheckingAccess(true);
        setAccessError(undefined);
        setError(undefined);
        try {
          const access = await readWithTimeout(async () => {
            const verified = await supabase.auth.getUser();
            if (verified.error) throw verified.error;
            if (verified.data.user?.id !== actor.id)
              throw new Error("Your session changed. Sign in again.");
            const result = await supabase
              .from("profiles")
              .select("*")
              .eq("id", actor.id)
              .single();
            if (result.error) throw result.error;
            if (!result.data.is_active)
              throw new Error(
                "This account is inactive. Contact your Office Head or Admin.",
              );
            const role = normalizeUserRole(result.data.role);
            if (!isMobileRole(role)) throw new Error(MOBILE_ROLE_NOTICE);
            const [defaults, overrides, org] = await Promise.all([
              supabase.from("role_permissions").select("*").eq("role", role),
              supabase
                .from("user_permission_overrides")
                .select("*")
                .eq("user_id", actor.id),
              result.data.org_id
                ? supabase
                    .from("organizations")
                    .select("*")
                    .eq("id", result.data.org_id)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            ]);
            if (defaults.error) throw defaults.error;
            if (overrides.error) throw overrides.error;
            if (org.error) throw org.error;
            const resolved = resolvePermissions(
              role,
              (defaults.data || []).map((r) => ({
                role: r.role,
                permission: r.permission,
                allowed: r.allowed,
              })),
              (overrides.data || []).map((r) => ({
                userId: r.user_id,
                permission: r.permission,
                allowed: r.allowed,
                setBy: r.set_by,
              })),
            );
            return {
              profile: {
                ...result.data,
                role,
                uid: result.data.id,
                fullName: result.data.full_name,
                departmentId: result.data.org_id,
                department: result.data.org_id,
              } as UserProfile,
              org: org.data as Organization | null,
              permissions: resolved,
            };
          });
          if (!isCurrent()) continue;
          const signature = JSON.stringify([
            actor.id,
            access.profile.role,
            access.profile.org_id,
            [...access.permissions].sort(),
          ]);
          setDisplayCacheActor(actor.id);
          if (accessSignature.current && accessSignature.current !== signature)
            clearDisplayCache("access");
          accessSignature.current = signature;
          verifiedProfile.current = access.profile;
          setProfile(access.profile);
          setOrganization(access.org);
          setPermissions(access.permissions);
          actionAccess.current = {
            actor: actor.id,
            ready: appState.current !== "background" && !job.again,
          };
        } catch (reason) {
          if (!isCurrent()) continue;
          const failure =
            reason instanceof Error
              ? reason
              : new Error("Could not verify your account access.");
          if (verifiedProfile.current && temporaryFailure(reason)) {
            // Last verified display context remains readable; it cannot authorize writes.
            setAccessError(failure);
          } else {
            verifiedProfile.current = null;
            setDisplayCacheActor(null);
            setProfile(null);
            setOrganization(null);
            setPermissions(new Set());
            setError(failure);
          }
        }
      } while (
        job.again &&
        current.current?.id === actor.id &&
        appState.current !== "background"
      );
    })().finally(() => {
      if (pending.current === job) {
        pending.current = null;
        setCheckingAccess(false);
        setLoading(false);
      }
    });
    return job.promise;
  }, []);
  const refresh = useCallback(() => requestRefresh(), [requestRefresh]);

  useEffect(() => {
    let alive = true;
    const receive = (next: User | null) => {
      if (!alive) return;
      const nextId = next?.id || null;
      if (identity.current !== nextId) {
        ++version.current;
        pending.current = null;
        actionAccess.current = { actor: nextId, ready: false };
        verifiedProfile.current = null;
        accessSignature.current = "";
        resetAuthCaches();
        setDisplayCacheActor(nextId);
        setProfile(null);
        setOrganization(null);
        setPermissions(new Set());
        setAccessError(undefined);
        setError(undefined);
        setCheckingAccess(false);
        setLoading(!!next);
        identity.current = nextId;
      }
      current.current = next;
      setUser(next);
      if (!next) setLoading(false);
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      receive(session?.user || null),
    );
    const initialVersion = version.current;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive || initialVersion !== version.current) return;
      if (error) {
        setError(error);
        setLoading(false);
      } else receive(data.session?.user || null);
    });
    return () => {
      alive = false;
      ++version.current;
      pending.current = null;
      actionAccess.current.ready = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    void refresh();
    const accessChanged = () => {
      actionAccess.current.ready = false;
      clearDisplayCache("access");
      void requestRefresh(true);
    };
    let subscribed = false;
    const channel = createPostgresChannel("native-access-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: "id=eq." + user.id,
        },
        accessChanged,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_permission_overrides",
          filter: "user_id=eq." + user.id,
        },
        accessChanged,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_permissions" },
        accessChanged,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (subscribed) accessChanged();
          subscribed = true;
        }
      });
    const fallback = setInterval(() => {
      if (
        appState.current === "active" &&
        verifiedProfile.current?.employee_id === `GUEST-${user.id}`
      )
        void requestRefresh(true);
    }, 60_000);
    const app = AppState.addEventListener("change", (state) => {
      appState.current = state;
      if (state === "background") {
        needsResumeCheck.current = true;
        ++version.current;
        actionAccess.current.ready = false;
      }
      if (state === "active" && needsResumeCheck.current) {
        needsResumeCheck.current = false;
        void requestRefresh(true);
      }
    });
    return () => {
      clearInterval(fallback);
      app.remove();
      void supabase.removeChannel(channel);
    };
  }, [user?.id, refresh, requestRefresh]);
  const signOut = async () => {
    current.current = null;
    actionAccess.current.ready = false;
    ++version.current;
    pending.current = null;
    verifiedProfile.current = null;
    setDisplayCacheActor(null);
    setProfile(null);
    setOrganization(null);
    setPermissions(new Set());
    setError(undefined);
    setAccessError(undefined);
    setLoading(false);
    setCheckingAccess(false);
    resetAuthCaches();
    if (profile) await unregisterPushBeforeSignOut(profile.id);
    const result = await supabase.auth.signOut({ scope: "local" });
    if (result.error) throw result.error;
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organization,
        permissions,
        loading,
        checkingAccess,
        accessError,
        error,
        refresh,
        signOut,
        can: (key) => !!profile?.is_active && permissions.has(key),
      }}
    >
      <AccountActionContext.Provider value={actionAccess}>
        {children}
      </AccountActionContext.Provider>
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}
