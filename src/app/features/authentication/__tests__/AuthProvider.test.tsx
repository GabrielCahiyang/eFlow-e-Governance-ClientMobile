import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { AuthProvider, useAuth } from "../AuthProvider";
import { useAccountActionAccess } from "../../../shared/AccountActionAccess";
import { supabase } from "../../../../platform/supabase";
import {
  setDisplayCacheActor,
  subscribeDisplayCache,
} from "../../../shared/displayCache";

const actor = { id: "member-a" };
let mockProfile: {
  id: string;
  role: string;
  is_active: boolean;
  org_id: string;
  custom_role_key?: string | null;
} = {
  id: "member-a",
  role: "member",
  is_active: true,
  org_id: "office-a",
};
let mockReceive: (event: string, session: unknown) => void;
let mockAccessChanged: () => void;
let mockSubscribeStatus: ((status: string) => void) | undefined;
let mockListeners: {
  table?: string;
  filter?: string;
  callback?: () => void;
}[] = [];
let mockCustomRole: {
  key: string;
  label: string;
  description: string;
  base_role: string;
} | null;
let mockRoleRows: { role: string; permission: string; allowed: boolean }[] = [];
let mockOverrides: { user_id: string; permission: string; allowed: boolean }[] =
  [];
let mockTables: string[] = [];
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: typeof mockReceive) => {
        mockReceive = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: "member-a" } } },
        error: null,
      })),
      getUser: jest.fn<() => Promise<unknown>>(),
      signOut: jest.fn(async () => ({ error: null })),
    },
    from: (table: string) => {
      mockTables.push(table);
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        single: async () => ({ data: mockProfile, error: null }),
        maybeSingle: async () => ({
          data:
            table === "custom_roles"
              ? mockCustomRole
              : { id: "office-a", name: "QA Office" },
          error: null,
        }),
        then: (resolve: (value: unknown) => void) =>
          resolve({
            data: table === "role_permissions" ? mockRoleRows : mockOverrides,
            error: null,
          }),
      };
    },
    removeChannel: jest.fn(),
  },
}));
jest.mock("../../../shared/postgresChannel", () => ({
  createPostgresChannel: () => ({
    on(
      _event: string,
      filter: { table?: string; filter?: string },
      callback: () => void,
    ) {
      mockListeners.push({ ...filter, callback });
      mockAccessChanged = callback;
      return this;
    },
    subscribe(callback?: (status: string) => void) {
      mockSubscribeStatus = callback;
      return this;
    },
  }),
}));
jest.mock("../../../../core/web/app/shared/authCacheReset", () => ({
  resetAuthCaches() {},
}));
jest.mock("../../../../platform/push", () => ({
  unregisterPushBeforeSignOut: async () => {},
}));

let foreground: (state: AppStateStatus) => void;
beforeEach(() => {
  mockListeners = [];
  mockTables = [];
  mockRoleRows = [];
  mockOverrides = [];
  mockCustomRole = {
    key: "field_worker",
    label: "Field Worker",
    description: "",
    base_role: "member",
  };
  mockProfile = {
    id: "member-a",
    role: "member",
    is_active: true,
    org_id: "office-a",
  };
  jest
    .mocked(supabase.auth.getUser)
    .mockResolvedValue({ data: { user: actor }, error: null } as never);
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, callback) => {
      foreground = callback;
      return { remove() {} };
    });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  setDisplayCacheActor(null);
});
const setup = () =>
  renderHook(() => ({ auth: useAuth(), assert: useAccountActionAccess() }), {
    wrapper: AuthProvider,
  });
const deferred = () => {
  let resolve!: (value: never) => void, reject!: (value: Error) => void;
  const promise = new Promise<never>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
test("resume retains verified context, coalesces retries, and gates actions until verified", async () => {
  const view = await setup();
  await waitFor(() =>
    expect(view.result.current.auth.profile?.id).toBe(actor.id),
  );
  const pending = deferred();
  jest
    .mocked(supabase.auth.getUser)
    .mockImplementationOnce(() => pending.promise);
  await act(async () => {
    foreground("background");
    foreground("inactive");
    foreground("active");
  });
  expect(view.result.current.auth.loading).toBe(false);
  expect(view.result.current.auth.checkingAccess).toBe(true);
  expect(view.result.current.auth.profile?.id).toBe(actor.id);
  expect(() => view.result.current.assert()).toThrow("Please wait");
  let one!: Promise<void>, two!: Promise<void>;
  await act(async () => {
    one = view.result.current.auth.refresh();
    two = view.result.current.auth.refresh();
  });
  expect(one).toBe(two);
  expect(supabase.auth.getUser).toHaveBeenCalledTimes(2);
  await act(async () =>
    pending.resolve({ data: { user: actor }, error: null } as never),
  );
  expect(view.result.current.auth.checkingAccess).toBe(false);
  expect(() => view.result.current.assert()).not.toThrow();
});
test("a transient resume failure keeps readable context read-only, then Retry recovers", async () => {
  const view = await setup();
  await waitFor(() => expect(view.result.current.auth.profile).not.toBeNull());
  jest
    .mocked(supabase.auth.getUser)
    .mockRejectedValueOnce(new TypeError("Network request failed"));
  await act(async () => {
    foreground("background");
    foreground("active");
  });
  expect(view.result.current.auth.profile?.id).toBe(actor.id);
  expect(view.result.current.auth.error).toBeUndefined();
  expect(view.result.current.auth.accessError).toBeDefined();
  expect(() => view.result.current.assert()).toThrow();
  await act(async () => view.result.current.auth.refresh());
  expect(view.result.current.auth.accessError).toBeUndefined();
  expect(() => view.result.current.assert()).not.toThrow();
});
test("inactive-only transitions do not trigger an account refresh; definitive denial clears context", async () => {
  const view = await setup();
  await waitFor(() => expect(view.result.current.auth.profile).not.toBeNull());
  await act(async () => {
    foreground("inactive");
    foreground("active");
  });
  expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
  mockProfile.is_active = false;
  await act(async () => view.result.current.auth.refresh());
  expect(view.result.current.auth.profile).toBeNull();
  expect(view.result.current.auth.error).toBeDefined();
  expect(() => view.result.current.assert()).toThrow();
});
test("access changes during a read queue a new check before allowing actions", async () => {
  const view = await setup();
  await waitFor(() => expect(view.result.current.auth.profile).not.toBeNull());
  const pending = deferred();
  jest
    .mocked(supabase.auth.getUser)
    .mockImplementationOnce(() => pending.promise);
  let refresh!: Promise<void>;
  await act(async () => {
    refresh = view.result.current.auth.refresh();
  });
  await act(async () => mockAccessChanged());
  mockProfile.is_active = false;
  await act(async () => {
    pending.resolve({ data: { user: actor }, error: null } as never);
    await refresh;
  });
  expect(supabase.auth.getUser).toHaveBeenCalledTimes(3);
  expect(view.result.current.auth.profile).toBeNull();
});
test("sign-out during a read prevents a delayed response restoring access", async () => {
  mockProfile.custom_role_key = "field_worker";
  const view = await setup();
  await waitFor(() => expect(view.result.current.auth.profile).not.toBeNull());
  const pending = deferred();
  jest
    .mocked(supabase.auth.getUser)
    .mockImplementationOnce(() => pending.promise);
  await act(async () => {
    void view.result.current.auth.refresh();
  });
  await act(async () => {
    mockReceive("SIGNED_OUT", null);
  });
  await act(async () =>
    pending.resolve({ data: { user: actor }, error: null } as never),
  );
  expect(view.result.current.auth.profile).toBeNull();
  expect(view.result.current.auth.user).toBeNull();
  expect(view.result.current.auth.customRole).toBeNull();
  expect(() => view.result.current.assert()).toThrow();
});
test("realtime reconnect refreshes access without clearing display cache when access is unchanged", async () => {
  const cacheClears: string[] = [];
  const unsubscribe = subscribeDisplayCache((reason) =>
    cacheClears.push(reason),
  );
  try {
    const view = await setup();
    await waitFor(() =>
      expect(view.result.current.auth.profile?.id).toBe(actor.id),
    );
    cacheClears.length = 0;

    await act(async () => mockSubscribeStatus?.("SUBSCRIBED"));
    expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
    expect(cacheClears).toEqual([]);

    // Reconnect with unchanged role/org/permissions checks server without clearing display cache.
    await act(async () => mockSubscribeStatus?.("SUBSCRIBED"));
    await waitFor(() => expect(supabase.auth.getUser).toHaveBeenCalledTimes(2));
    expect(cacheClears).toEqual([]);

    // If role/access actually changed on reconnect, display cache clears fail-closed.
    mockProfile = { ...mockProfile, role: "head" };
    await act(async () => mockSubscribeStatus?.("SUBSCRIBED"));
    await waitFor(() =>
      expect(view.result.current.auth.profile?.role).toBe("head"),
    );
    expect(cacheClears).toEqual(["access"]);
  } finally {
    unsubscribe();
  }
});
test("role defaults are watched only for the actor's own role, never the whole table", async () => {
  const view = await setup();
  await waitFor(() =>
    expect(view.result.current.auth.profile?.id).toBe(actor.id),
  );
  const roleListeners = mockListeners.filter(
    (listener) => listener.table === "role_permissions",
  );
  expect(roleListeners).toEqual([
    expect.objectContaining({ filter: "role=eq.member" }),
  ]);
  // Personal access sources stay scoped to the actor.
  expect(mockListeners).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ table: "profiles", filter: "id=eq.member-a" }),
      expect.objectContaining({
        table: "user_permission_overrides",
        filter: "user_id=eq.member-a",
      }),
    ]),
  );
  // A role-default change for the actor's role re-verifies access.
  await act(async () => mockAccessChanged());
  await waitFor(() => expect(supabase.auth.getUser).toHaveBeenCalledTimes(2));
});

test.each(["member", "head", "accounting_staff"])(
  "%s custom role uses its own rows, base fallback and individual overrides",
  async (role) => {
    mockProfile = { ...mockProfile, role, custom_role_key: "field_worker" };
    mockCustomRole = { ...mockCustomRole!, base_role: role };
    mockRoleRows = [
      { role, permission: "navigation.projects", allowed: true },
      {
        role: "field_worker",
        permission: "navigation.projects",
        allowed: false,
      },
      { role: "field_worker", permission: "reports.export", allowed: false },
      { role: "field_worker", permission: "tasks.assign", allowed: true },
    ];
    mockOverrides = [
      { user_id: actor.id, permission: "reports.export", allowed: true },
      { user_id: actor.id, permission: "tasks.assign", allowed: false },
    ];
    const view = await setup();
    await waitFor(() =>
      expect(view.result.current.auth.customRole?.label).toBe("Field Worker"),
    );
    expect(view.result.current.auth.profile?.role).toBe(role);
    expect(view.result.current.auth.can("navigation.projects")).toBe(false);
    expect(view.result.current.auth.can("reports.export")).toBe(true);
    expect(view.result.current.auth.can("tasks.assign")).toBe(false);
    expect(view.result.current.auth.can("navigation.tasks")).toBe(true);
    expect(view.result.current.auth.can("accounting.release_cash")).toBe(
      role === "accounting_staff",
    );
    expect(mockListeners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "role_permissions",
          filter: "role=eq.field_worker",
        }),
        expect.objectContaining({
          table: "custom_roles",
          filter: "key=eq.field_worker",
        }),
      ]),
    );
  },
);

test("base accounts do not require a custom_roles query", async () => {
  const view = await setup();
  await waitFor(() =>
    expect(view.result.current.auth.can("navigation.projects")).toBe(true),
  );
  expect(mockTables).not.toContain("custom_roles");
  expect(view.result.current.auth.customRole).toBeNull();
});

test.each(["missing", "mismatched", "admin"])(
  "%s custom definition fails closed without granting base defaults",
  async (kind) => {
    mockProfile.custom_role_key = "field_worker";
    mockCustomRole =
      kind === "missing"
        ? null
        : {
            ...mockCustomRole!,
            base_role: kind === "admin" ? "admin" : "head",
          };
    const view = await setup();
    await waitFor(() => expect(view.result.current.auth.error).toBeDefined());
    expect(view.result.current.auth.profile).toBeNull();
    expect(view.result.current.auth.customRole).toBeNull();
    expect(view.result.current.auth.can("navigation.projects")).toBe(false);
    expect(view.result.current.auth.permissions.size).toBe(0);
    expect(() => view.result.current.assert()).toThrow();
  },
);

test("role permission revocation gates stale callbacks immediately and stays read-only offline", async () => {
  mockProfile.custom_role_key = "field_worker";
  const view = await setup();
  await waitFor(() =>
    expect(view.result.current.auth.can("navigation.projects")).toBe(true),
  );
  const staleCan = view.result.current.auth.can;
  const pending = deferred();
  jest
    .mocked(supabase.auth.getUser)
    .mockImplementationOnce(() => pending.promise);
  const listener = mockListeners.find(
    (item) => item.table === "role_permissions",
  )!;
  await act(async () => {
    listener.callback!();
    expect(staleCan("navigation.projects")).toBe(false);
  });
  expect(view.result.current.auth.permissions.size).toBe(0);
  expect(() => view.result.current.assert()).toThrow();
  expect(
    view.result.current.auth.canDisplayDestination("navigation.projects"),
  ).toBe(true);
  await act(async () =>
    pending.reject(new TypeError("Network request failed")),
  );
  expect(view.result.current.auth.profile?.id).toBe(actor.id);
  expect(view.result.current.auth.accessError).toBeDefined();
  expect(view.result.current.auth.can("navigation.projects")).toBe(false);
  expect(
    view.result.current.auth.canDisplayDestination("navigation.projects"),
  ).toBe(true);
  mockRoleRows = [
    { role: "field_worker", permission: "navigation.projects", allowed: false },
  ];
  await act(async () => view.result.current.auth.refresh());
  expect(view.result.current.auth.can("navigation.projects")).toBe(false);
  expect(staleCan("navigation.projects")).toBe(false);
  expect(
    view.result.current.auth.canDisplayDestination("navigation.projects"),
  ).toBe(false);
  expect(() => view.result.current.assert()).not.toThrow();
});

test("custom definition rename, same-base reassignment and removal reverify names and access", async () => {
  mockProfile.custom_role_key = "field_worker";
  const view = await setup();
  await waitFor(() =>
    expect(view.result.current.auth.customRole?.key).toBe("field_worker"),
  );
  mockCustomRole!.label = "Field Coordinator";
  await act(async () =>
    mockListeners.find((item) => item.table === "custom_roles")!.callback!(),
  );
  expect(view.result.current.auth.customRole?.label).toBe("Field Coordinator");
  mockProfile.custom_role_key = "research_worker";
  mockCustomRole = {
    ...mockCustomRole!,
    key: "research_worker",
    label: "Research Worker",
  };
  await act(async () =>
    mockListeners.find((item) => item.table === "profiles")!.callback!(),
  );
  expect(view.result.current.auth.customRole?.label).toBe("Research Worker");
  expect(mockListeners).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        table: "role_permissions",
        filter: "role=eq.research_worker",
      }),
      expect.objectContaining({
        table: "custom_roles",
        filter: "key=eq.research_worker",
      }),
    ]),
  );
  mockProfile.custom_role_key = null; // Server's ON DELETE SET NULL, same as Web.
  await act(async () =>
    mockListeners.find((item) => item.table === "profiles")!.callback!(),
  );
  expect(view.result.current.auth.customRole).toBeNull();
  expect(view.result.current.auth.can("navigation.projects")).toBe(true);
});

test("periodic active refresh reconciles missed custom role changes for regular accounts", async () => {
  jest.useFakeTimers();
  mockProfile.custom_role_key = "field_worker";
  const view = await setup();
  await waitFor(() =>
    expect(view.result.current.auth.customRole?.key).toBe("field_worker"),
  );
  await act(async () => foreground("active"));
  mockRoleRows = [
    { role: "field_worker", permission: "navigation.projects", allowed: false },
  ];
  await act(async () => jest.advanceTimersByTime(60_000));
  expect(view.result.current.auth.can("navigation.projects")).toBe(false);
  expect(supabase.auth.getUser).toHaveBeenCalledTimes(2);
});

test("definition deletion with a still-assigned key revokes access instead of falling back", async () => {
  mockProfile.custom_role_key = "field_worker";
  const view = await setup();
  await waitFor(() =>
    expect(view.result.current.auth.customRole?.key).toBe("field_worker"),
  );
  mockCustomRole = null;
  await act(async () =>
    mockListeners.find((item) => item.table === "custom_roles")!.callback!(),
  );
  expect(view.result.current.auth.customRole).toBeNull();
  expect(view.result.current.auth.permissions.size).toBe(0);
  expect(() => view.result.current.assert()).toThrow();
});
