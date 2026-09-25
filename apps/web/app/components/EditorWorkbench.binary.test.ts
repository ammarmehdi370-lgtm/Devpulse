import { describe, expect, it } from "vitest";
import { hasBinaryContent, isBinaryFile } from "./EditorWorkbench";

describe("local file binary detection", () => {
  it("detects binary MIME types before content inspection", () => {
    expect(isBinaryFile(new File(["content"], "photo.txt", { type: "image/png" }))).toBe(true);
  });

  it("detects binary extensions when MIME type is unavailable", () => {
    expect(isBinaryFile(new File(["content"], "archive.zip"))).toBe(true);
    expect(isBinaryFile(new File(["content"], "README.md"))).toBe(false);
  });

  it("detects null bytes in unknown file types", async () => {
    expect(await hasBinaryContent(new File([new Uint8Array([65, 0, 66])], "unknown"))).toBe(true);
  });

  it("detects a high ratio of non-printable bytes", async () => {
    expect(await hasBinaryContent(new File([new Uint8Array(200).fill(1)], "unknown"))).toBe(true);
  });

  it("accepts printable text and empty files", async () => {
    expect(await hasBinaryContent(new File(["const value = 1;\n"], "source.ts"))).toBe(false);
    expect(await hasBinaryContent(new File([], "empty.txt"))).toBe(false);
  });
});