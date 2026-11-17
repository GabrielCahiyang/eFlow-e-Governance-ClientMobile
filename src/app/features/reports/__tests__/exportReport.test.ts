import { beforeEach, expect, jest, test } from "@jest/globals";
import { Directory, type File } from "expo-file-system";
import { printToFileAsync } from "expo-print";
import { shareAsync } from "expo-sharing";
import { exportNativeReport } from "../exportReport";

const mockFolder = { uri: "file:///reports" } as Directory;
const mockCopy = jest.fn<File["copy"]>();
const mockRename = jest.fn<File["rename"]>();

jest.mock("expo-file-system", () => ({
  Directory: { pickDirectoryAsync: jest.fn() },
  Paths: { cache: "file:///cache" },
  File: function () {
    return {
      exists: true,
      copy: mockCopy,
      rename: mockRename,
      write: jest.fn(),
      delete: jest.fn(),
    };
  },
}));
jest.mock("expo-print", () => ({ printToFileAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(Directory.pickDirectoryAsync).mockResolvedValue(mockFolder);
  jest.mocked(printToFileAsync).mockResolvedValue({
    uri: "file:///cache/print.pdf",
    numberOfPages: 1,
  });
});

test.each([
  ["csv", "Excel, Numbers, or Google Sheets"],
  ["pdf", "a PDF viewer such as Adobe Acrobat"],
] as const)(
  "Office %s saves to the chosen folder and names a viewer",
  async (format, viewer) => {
    const notice = await exportNativeReport(
      format,
      [],
      "Office",
      "Scope",
      "save",
    );
    expect(notice).toContain(
      `.${format} from the folder you chose using ${viewer}.`,
    );
    expect(mockCopy).toHaveBeenCalledWith(mockFolder);
    if (format === "pdf")
      expect(mockRename).toHaveBeenCalledWith(expect.stringMatching(/\.pdf$/));
    expect(shareAsync).not.toHaveBeenCalled();
  },
);

test.each(["ERR_PICKER_CANCELLED", "ERR_FILE_PICKING_CANCELLED"])(
  "dismissing the folder picker (%s) leaves export idle",
  async (code) => {
    jest.mocked(Directory.pickDirectoryAsync).mockRejectedValueOnce({ code });
    await expect(
      exportNativeReport("pdf", [], "Office", "Scope", "save"),
    ).resolves.toBeUndefined();
    expect(printToFileAsync).not.toHaveBeenCalled();
    expect(mockCopy).not.toHaveBeenCalled();
    expect(shareAsync).not.toHaveBeenCalled();
  },
);
