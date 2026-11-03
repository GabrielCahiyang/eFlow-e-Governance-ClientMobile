import { test, expect } from "@jest/globals";
import {
  isNativeWorkRecovery,
  workRecoveryCanDiscard,
  type NativeWorkRecovery,
} from "../workRecovery";
import { WorkRequestFailure } from "../../../../core/web/app/features/nested-work/types/editor";
const fields = {
  title: "Work",
  note: "",
  due: "",
  lead: "",
  parent: "",
  standalone: false,
  progress: 0,
  people: [],
  order: [],
};
const draft: NativeWorkRecovery = {
  baseline: {
    actorId: "actor",
    rootId: "root",
    projectId: "project",
    officeId: "office",
    kind: "office",
    revision: 3,
    command: "create",
    nodeId: null,
    createdId: "node",
    fields,
  },
  fields,
  request: {
    id: "original",
    command: "create",
    revision: 3,
    payload: { id: "node", title: "Work" },
  },
};
const scope = {
  actorId: "actor",
  rootId: "root",
  projectId: "project",
  officeId: "office",
  kind: "office" as const,
  revision: 4,
  readOnly: false,
};
test("retains the exact original ID across a later revision in the same verified scope", () => {
  expect(isNativeWorkRecovery(draft, scope)).toBe(true);
  expect(draft.request.id).toBe("original");
});
test("does not recover another actor, project, office, root or work kind", () => {
  for (const change of [
    { actorId: "other" },
    { rootId: "other" },
    { projectId: "other" },
    { officeId: "other" },
    { kind: "personal" as const },
  ])
    expect(isNativeWorkRecovery(draft, { ...scope, ...change })).toBe(false);
});
test("rejects malformed retained terms rather than sending an invented replacement", () => {
  for (const value of [
    null,
    {},
    { ...draft, request: { ...draft.request, id: "" } },
    { ...draft, request: { ...draft.request, revision: 99 } },
    { ...draft, request: { ...draft.request, payload: null } },
    { ...draft, fields: { ...fields, people: [null] } },
  ])
    expect(isNativeWorkRecovery(value, scope)).toBe(false);
});
test("only a confirmed rollback or stale revision permits discarding retained work", () => {
  expect(
    workRecoveryCanDiscard(
      new WorkRequestFailure("confirmed_failure", "Rejected"),
    ),
  ).toBe(true);
  expect(
    workRecoveryCanDiscard(new WorkRequestFailure("stale_revision", "Changed")),
  ).toBe(true);
  for (const error of [
    new Error("Network lost"),
    new WorkRequestFailure("unknown_result", "No receipt"),
    new WorkRequestFailure("revoked_authority", "Access lost"),
  ])
    expect(workRecoveryCanDiscard(error)).toBe(false);
});
