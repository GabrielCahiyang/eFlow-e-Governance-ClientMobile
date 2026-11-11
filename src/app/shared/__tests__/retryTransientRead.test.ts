import { expect, jest, test } from "@jest/globals";
import { retryTransientRead } from "../retryTransientRead";

test("retry recovers a transport failure but never repeats an access denial", async () => {
  const read = jest
    .fn<() => Promise<string>>()
    .mockRejectedValueOnce(new Error("Network request failed"))
    .mockResolvedValueOnce("record");
  await expect(retryTransientRead(read)).resolves.toBe("record");
  expect(read).toHaveBeenCalledTimes(2);
  const denied = jest
    .fn<() => Promise<string>>()
    .mockRejectedValue({ code: "42501", message: "Access denied" });
  await expect(retryTransientRead(denied)).rejects.toMatchObject({
    code: "42501",
  });
  expect(denied).toHaveBeenCalledTimes(1);
});
