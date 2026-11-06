import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { AuthProvider, useAuth } from "../AuthProvider";
import { useAccountActionAccess } from "../../../shared/AccountActionAccess";
import { supabase } from "../../../../platform/supabase";
import { setDisplayCacheActor } from "../../../shared/displayCache";

const actor = { id: "member-a" };
let mockProfile = {
  id: "member-a",
  role: "member",
  is_active: true,
  org_id: "office-a",
};
let mockReceive: (event: string, session: unknown) => void;
let mockAccessChanged: () => void;
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
    from: (table: string) => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      single: async () => ({ data: mockProfile, error: null }),
      maybeSingle: async () => ({
        data: { id: "office-a", name: "QA Office" },
        error: null,
      }),
      then: (resolve: (value: unknown) => void) =>
        resolve({ data: [], error: null }),
    }),
    removeChannel: jest.fn(),
  },
}));
jest.mock("../../../shared/postgresChannel", () => ({
  createPostgresChannel: () => ({
    on(_event: string, _filter: unknown, callback: () => void) {
      mockAccessChanged = callback;
      return this;
    },
    subscribe() {
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
  expect(() => view.result.current.assert()).toThrow();
});
