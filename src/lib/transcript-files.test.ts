import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { extractDocxText, parseTimedTranscript, wordXmlToText } from "@/lib/transcript-files";

/** Builds a minimal zip archive (CRC left at 0 — the extractor doesn't check it). */
function makeZip(files: { name: string; data: string; compress: boolean }[]): ArrayBuffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const raw = Buffer.from(file.data);
    const body = file.compress ? deflateRawSync(raw) : raw;
    const method = file.compress ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += 30 + name.length + body.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  const all = Buffer.concat([...locals, ...centrals, eocd]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength);
}

const DOCUMENT_XML =
  '<?xml version="1.0"?><w:document><w:body>' +
  "<w:p><w:r><w:t>Sarah: We need a Phase 1 ESA.</w:t></w:r></w:p>" +
  "<w:p><w:r><w:t>Gap is $650,000 &amp; rising</w:t><w:tab/><w:t>today</w:t></w:r></w:p>" +
  "</w:body></w:document>";

describe("parseTimedTranscript", () => {
  it("turns Zoom VTT cues into timestamped speaker lines, merging repeats", () => {
    const vtt = [
      "WEBVTT",
      "",
      "1",
      "00:00:01.000 --> 00:00:04.000",
      "Sarah Jenkins: We own a lot in Wichita.",
      "",
      "2",
      "00:00:04.500 --> 00:00:07.000",
      "Sarah Jenkins: It's about 1.2 acres.",
      "",
      "3",
      "00:01:10.000 --> 00:01:12.000",
      "Collective Impact: Great, thanks.",
    ].join("\n");
    expect(parseTimedTranscript(vtt)).toBe(
      "[00:01] Sarah Jenkins: We own a lot in Wichita. It's about 1.2 acres.\n" +
        "[01:10] Collective Impact: Great, thanks.",
    );
  });

  it("handles SRT timing and WebVTT voice tags", () => {
    const srt = "1\r\n00:00:02,000 --> 00:00:03,000\r\n<v Marcus>Hello there</v>\r\n";
    expect(parseTimedTranscript(srt)).toBe("[00:02] Marcus: Hello there");
  });

  it("shows hours for long meetings", () => {
    expect(parseTimedTranscript("1:02:03.000 --> 1:02:05.000\nWrap up")).toBe("[1:02:03] Wrap up");
  });
});

describe("wordXmlToText", () => {
  it("keeps paragraphs and tabs and decodes entities", () => {
    expect(wordXmlToText(DOCUMENT_XML)).toBe(
      "Sarah: We need a Phase 1 ESA.\nGap is $650,000 & rising\ttoday",
    );
  });
});

describe("extractDocxText", () => {
  it("reads a deflate-compressed .docx", async () => {
    const zip = makeZip([
      { name: "[Content_Types].xml", data: "<Types/>", compress: true },
      { name: "word/document.xml", data: DOCUMENT_XML, compress: true },
    ]);
    await expect(extractDocxText(zip)).resolves.toContain("Phase 1 ESA");
  });

  it("reads a stored (uncompressed) .docx", async () => {
    const zip = makeZip([{ name: "word/document.xml", data: DOCUMENT_XML, compress: false }]);
    await expect(extractDocxText(zip)).resolves.toContain("$650,000 & rising");
  });

  it("rejects files that aren't zip archives", async () => {
    await expect(extractDocxText(new TextEncoder().encode("not a docx").buffer)).rejects.toThrow(
      /valid \.docx/,
    );
  });
});
