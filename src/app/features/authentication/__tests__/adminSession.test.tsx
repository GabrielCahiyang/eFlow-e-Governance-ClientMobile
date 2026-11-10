import { test, expect, jest } from "@jest/globals";
import { render, waitFor, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useAuth } from "../AuthProvider";
import { supabase } from "../../../../platform/supabase";
jest.mock("../../../../platform/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: "restored-admin" } } },
        error: null,
      })),
      getUser: jest.fn(async () => ({
        data: { user: { id: "restored-admin" } },
        error: null,
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(async () => ({
            data: {
              id: "restored-admin",
              is_active: true,
              role: "super_admin",
            },
            error: null,
          })),
        })),
      })),
    })),
    channel: jest.fn(() => {
      const c = { on: jest.fn(() => c), subscribe: jest.fn(() => c) };
      return c;
    }),
    removeChannel: jest.fn(),
  },
}));
jest.mock("../../../../core/web/app/shared/authCacheReset", () => ({
  resetAuthCaches: jest.fn(),
}));
function SessionProbe() {
  const auth = useAuth();
  return (
    <Text>
      {auth.error?.message || auth.profile?.role || "No mobile profile"}
    </Text>
  );
}
test("restoring a legacy Admin session fails closed before loading permissions or rendering a mobile profile", async () => {
  await render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(
      screen.getByText("Email or password is incorrect."),
    ).toBeOnTheScreen(),
  );
  expect(supabase.from).toHaveBeenCalledTimes(1);
  expect(supabase.from).toHaveBeenCalledWith("profiles");
  expect(screen.queryByText("admin")).toBeNull();
});
