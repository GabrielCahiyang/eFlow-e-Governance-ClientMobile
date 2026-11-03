import { createPostgresChannel } from "../../shared/postgresChannel";
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
  error?: Error;
  permissions: Set<string>;
  can: (key: string) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<UserProfile | null>(null),
    [organization, setOrganization] = useState<Organization | null>(null),
    [permissions, setPermissions] = useState(new Set<string>()),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<Error>();
  const version = useRef(0),
    identity = useRef<string | null>(null),
    current = useRef<User | null>(null);
  current.current = user;
  const refresh = useCallback(async () => {
    const actor = current.current;
    if (!actor) {
      setLoading(false);
      return;
    }
    const revision = ++version.current;
    setLoading(true);
    setError(undefined);
    try {
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
      if (revision !== version.current || current.current?.id !== actor.id)
        return;
      setPermissions(
        resolvePermissions(
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
        ),
      );
      setProfile({
        ...result.data,
        role,
        uid: result.data.id,
        fullName: result.data.full_name,
        departmentId: result.data.org_id,
        department: result.data.org_id,
      } as UserProfile);
      setOrganization(org.data as Organization | null);
    } catch (e) {
      if (revision === version.current) {
        setProfile(null);
        setOrganization(null);
        setPermissions(new Set());
        setError(
          e instanceof Error
            ? e
            : new Error("Could not verify your account access."),
        );
      }
    } finally {
      if (revision === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    const receive = (next: User | null) => {
      if (!alive) return;
      if (identity.current !== next?.id) {
        ++version.current;
        resetAuthCaches();
        setProfile(null);
        setOrganization(null);
        setPermissions(new Set());
        identity.current = next?.id || null;
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
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error && alive) {
        setError(error);
        setLoading(false);
      } else receive(data.session?.user || null);
    });
    return () => {
      alive = false;
      ++version.current;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    void refresh();
    const channel = createPostgresChannel("native-access-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: "id=eq." + user.id,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_permission_overrides",
          filter: "user_id=eq." + user.id,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_permissions" },
        () => void refresh(),
      )
      .subscribe();
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      app.remove();
      void supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);
  const signOut = async () => {
    if (profile) await unregisterPushBeforeSignOut(profile.id);
    ++version.current;
    setProfile(null);
    setPermissions(new Set());
    resetAuthCaches();
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
        error,
        refresh,
        signOut,
        can: (key) => !!profile?.is_active && permissions.has(key),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}
