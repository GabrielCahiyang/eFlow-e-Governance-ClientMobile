import { test, expect } from "@jest/globals";
import { csvCell, htmlCell } from "../exportSerialization";
test("spreadsheet exports neutralize formula cells and preserve commas and quotes", () => {
  expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
  expect(csvCell('Office, "Q1"')).toBe('"Office, ""Q1"""');
  expect(csvCell(null)).toBe('""');
});
test("PDF exports escape source markup rather than rendering it", () => {
  expect(htmlCell('<script>"&')).toBe("&lt;script&gt;&quot;&amp;");
});
