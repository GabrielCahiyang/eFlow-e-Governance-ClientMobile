import { expect, test } from "@jest/globals";
import { asServiceFile, inferPickedFileMimeType } from "../files";
import { userErrorMessage } from "../../app/shared/userMessages";

test("inferPickedFileMimeType resolves extensions when picker omits mimeType", () => {
  expect(inferPickedFileMimeType("receipt.PDF", undefined)).toBe("application/pdf");
  expect(inferPickedFileMimeType("photo.jpg", "application/octet-stream")).toBe("image/jpeg");
  expect(inferPickedFileMimeType("scan.png", "image/png")).toBe("image/png");
});

test("asServiceFile rejects empty files with a clear user message", async () => {
  await expect(
    asServiceFile({
      uri: "file:///tmp/empty.pdf",
      name: "empty.pdf",
      type: "",
      size: 0,
      arrayBuffer: async () => new ArrayBuffer(0),
    }),
  ).rejects.toThrow("The selected file is empty, too large, or changed. Verify the original file.");
});

test("userErrorMessage surfaces storage upload errors cleanly instead of Check before retrying", () => {
  expect(
    userErrorMessage(new Error("mime type text/plain;charset=UTF-8 is not supported"), "action"),
  ).toBe("This file type isn't supported. Choose a JPEG, PNG, PDF, or supported document.");
  expect(
    userErrorMessage(new Error("The object exceeded the maximum allowed size"), "action"),
  ).toBe("The selected file is too large. Choose a smaller file and try again.");
});
