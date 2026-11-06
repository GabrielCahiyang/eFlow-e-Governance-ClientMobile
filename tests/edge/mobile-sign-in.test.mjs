import assert from "node:assert/strict";
import test from "node:test";
import { createMobileSignIn } from "../../supabase/functions/mobile-sign-in/handler.ts";

const base = "https://supabase.example.test";
const ready = { status: "ready", user_id: "account-id", lease: "lease-id" };
const locked = { ...ready, status: "locked" };
const tokens = { access_token: "test-access", refresh_token: "test-refresh" };
const valid = { ...tokens, user: { id: ready.user_id } };
const badPassword = { error_code: "invalid_credentials" };

async function attempt(
  replies,
  payload = { email: " Person@Example.test ", password: "test-value" },
) {
  const calls = [];
  const handler = createMobileSignIn(
    { url: base, serviceKey: "test-server-key" },
    async (url, request) => {
      const next = replies[calls.length];
      calls.push({
        path: url.slice(base.length),
        method: request.method,
        body: JSON.parse(request.body),
      });
      assert.equal(request.headers.apikey, "test-server-key");
      if (next instanceof Error) throw next;
      return Response.json(next[1], { status: next[0] });
    },
  );
  const response = await handler(
    new Request(base, { method: "POST", body: JSON.stringify(payload) }),
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls.length, replies.length);
  return { status: response.status, body: await response.json(), calls };
}

test("a confirmed success releases only the exact user's tokens", async () => {
  const { status, body, calls } = await attempt([
    [200, ready],
    [200, valid],
    [200, { status: "success" }],
  ]);
  assert.equal(status, 200);
  assert.deepEqual(body, tokens);
  assert.deepEqual(calls[0].body, { p_email: "person@example.test" });
  assert.equal(calls[1].path, "/auth/v1/token?grant_type=password");
  assert.deepEqual(calls[2].body, {
    p_user: ready.user_id,
    p_lease: ready.lease,
    p_outcome: "success",
  });
});

test("only a provider-confirmed bad password increments the shared counter", async () => {
  const { status, calls } = await attempt([
    [200, ready],
    [400, badPassword],
    [200, { status: "invalid_credentials" }],
  ]);
  assert.equal(status, 401);
  assert.equal(calls[2].body.p_outcome, "invalid_credentials");
  assert.equal(
    (
      await attempt([
        [200, { status: "unknown" }],
        [400, badPassword],
      ])
    ).status,
    401,
  );
});

test("the threshold applies a provider ban and saves its ownership receipt", async () => {
  const bannedUntil = "2126-01-01T00:00:00Z";
  const { status, calls } = await attempt([
    [200, ready],
    [400, badPassword],
    [200, locked],
    [200, { banned_until: bannedUntil }],
    [200, locked],
  ]);
  assert.equal(status, 423);
  assert.equal(calls[3].method, "PUT");
  assert.equal(calls[3].path, "/auth/v1/admin/users/account-id");
  assert.deepEqual(calls[4].body, {
    p_user: ready.user_id,
    p_lease: ready.lease,
    p_outcome: "ban",
    p_ban_until: bannedUntil,
  });
});

test("existing locks and concurrent attempts stop before password verification", async () => {
  assert.equal(
    (await attempt([[200, { status: "locked", user_id: ready.user_id }]]))
      .status,
    423,
  );
  assert.equal((await attempt([[200, { status: "busy" }]])).status, 429);
});

test("a failed ban remains locked and only releases the matching lease", async () => {
  const { status, calls } = await attempt([
    [200, locked],
    [503, {}],
    [200, locked],
  ]);
  assert.equal(status, 423);
  assert.equal(calls[1].method, "PUT");
  assert.equal(calls[2].body.p_outcome, "abort");
  assert.equal(calls[2].body.p_lease, ready.lease);
});

test("timeouts, provider limits, unconfirmed email and provider bans never count as bad passwords", async () => {
  for (const [upstream, expected] of [
    [new Error("network"), 503],
    [[429, {}], 429],
    [[400, { error_code: "email_not_confirmed" }], 403],
    [[400, { error_code: "user_banned" }], 403],
  ]) {
    const { status, calls } = await attempt([
      [200, ready],
      upstream,
      [200, { status: "aborted" }],
    ]);
    assert.equal(status, expected);
    assert.equal(calls[2].body.p_outcome, "abort");
  }
});

test("stale or mismatched success and an unavailable counter cannot issue a session", async () => {
  const aborted = [200, { status: "aborted" }];
  for (const sequence of [
    [[200, ready], [200, valid], [200, { status: "stale" }], aborted],
    [[200, ready], [200, { ...valid, user: { id: "different" } }], aborted],
    [[503, {}]],
  ]) {
    const { status, body } = await attempt(sequence);
    assert.equal(status, 503);
    assert.equal(body.access_token, undefined);
  }
});

test("unexpected or oversized inputs cannot report their own outcome or reach upstream", async () => {
  assert.equal(
    (
      await attempt([], {
        email: "person@example.test",
        password: "x",
        outcome: "success",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await attempt([], {
        email: "person@example.test",
        password: "x".repeat(33 * 1024),
      })
    ).status,
    422,
  );
});
