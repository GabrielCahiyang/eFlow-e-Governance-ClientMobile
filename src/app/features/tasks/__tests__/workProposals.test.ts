import { expect, jest, test } from "@jest/globals";
import { draftStore } from "../../../../platform/draftStore";
import { saveSharedWork } from "../../../shared/sharedWorkRequest";
import { assertEvidenceActor, uploadEvidenceFile } from "../taskEvidence";
import {
  canResubmit,
  sendWorkProposal,
  type ProposalRequest,
  type WorkProposal,
} from "../workProposals";

jest.mock("../../../../platform/draftStore", () => ({
  draftStore: { set: jest.fn(async () => {}) },
}));
jest.mock("../../../shared/sharedWorkRequest", () => ({
  saveSharedWork: jest.fn(async () => {}),
}));
jest.mock("../taskEvidence", () => ({
  assertEvidenceActor: jest.fn(async () => {}),
  uploadEvidenceFile: jest.fn(),
}));

test("a corrected submission links its original and resumes saved evidence before sending", async () => {
  const first = {
    filePath: "first",
    fileName: "first.pdf",
    fileSize: 20,
    mimeType: "application/pdf",
  };
  const second = { ...first, filePath: "second", fileName: "second.pdf" };
  jest.mocked(uploadEvidenceFile).mockResolvedValueOnce(second);
  const request: ProposalRequest = {
    id: "replacement",
    args: {
      p_request: "replacement",
      p_supersedes: "original",
      p_terms: { note: "Corrected" },
    },
    files: [first, second].map((file) => ({
      name: file.fileName,
      uri: file.filePath,
      size: file.fileSize,
      type: file.mimeType,
    })),
    uploaded: [first],
  };
  await sendWorkProposal("author", "root", "node", "scope", request, true);
  expect(assertEvidenceActor).toHaveBeenCalledWith("author");
  expect(uploadEvidenceFile).toHaveBeenCalledTimes(1);
  expect(uploadEvidenceFile).toHaveBeenCalledWith(
    "author/root/node/replacement/1-second.pdf",
    {
      name: second.fileName,
      uri: second.filePath,
      size: second.fileSize,
      type: second.mimeType,
    },
    "m7-work-evidence",
  );
  expect(draftStore.set).toHaveBeenLastCalledWith(
    "author",
    "scope",
    expect.objectContaining({
      uploaded: [first, second],
    }),
  );
  expect(saveSharedWork).toHaveBeenLastCalledWith(
    "author",
    "scope",
    "m7_propose_work",
    {
      id: "replacement",
      args: {
        ...request.args,
        p_terms: { note: "Corrected", attachments: [first, second] },
      },
    },
    expect.any(Function),
    false,
  );
});

test("a saved submission with an uncertain RPC result reuses the original arguments", async () => {
  jest.mocked(uploadEvidenceFile).mockClear();
  const request = {
    id: "original",
    args: {
      p_request: "original",
      p_supersedes: null,
      p_terms: { note: "Original" },
    },
  };
  await sendWorkProposal("author", "root", "node", "scope", request, true);
  expect(uploadEvidenceFile).not.toHaveBeenCalled();
  expect(saveSharedWork).toHaveBeenLastCalledWith(
    "author",
    "scope",
    "m7_propose_work",
    request,
    expect.any(Function),
    true,
  );
});

test("only the original author can correct a returned submission that has no replacement", () => {
  const original = {
    id: "original",
    state: "changes_requested",
    author_id: "author",
  } as WorkProposal;
  expect(canResubmit(original, [original], "author")).toBe(true);
  expect(canResubmit(original, [original], "other")).toBe(false);
  expect(
    canResubmit(
      original,
      [original, { ...original, supersedes: original.id }],
      "author",
    ),
  ).toBe(false);
});
