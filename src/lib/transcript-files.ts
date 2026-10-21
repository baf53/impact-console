/**
 * Turns uploaded transcript files into plain text for the intake form.
 * Supports .txt/.md (as-is), .vtt/.srt (Zoom and caption exports) and .docx.
 */

export const TRANSCRIPT_FILE_ACCEPT = ".txt,.md,.vtt,.srt,.docx";

function formatTimestamp(raw: string) {
  const match = /(?:(\d+):)?(\d{1,2}):(\d{2})/.exec(raw);
  if (!match) return null;
  const [, h, m, s] = match;
  const hours = Number(h ?? 0);
  return hours > 0 ? `${hours}:${m!.padStart(2, "0")}:${s}` : `${m!.padStart(2, "0")}:${s}`;
}

/** "Name: words" → ["Name", "words"]; plain lines → [null, line]. */
function splitSpeaker(line: string): [string | null, string] {
  const match = /^([^:\n]{1,60}):\s+(.*)$/.exec(line);
  return match ? [match[1]!.trim(), match[2]!] : [null, line];
}

/**
 * Parses WebVTT or SRT captions into "[mm:ss] Speaker: text" lines, merging
 * consecutive cues from the same speaker.
 */
export function parseTimedTranscript(input: string): string {
  const blocks = input.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  const out: { time: string | null; speaker: string | null; text: string }[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const timingIndex = lines.findIndex((l) => l.includes("-->"));
    if (timingIndex === -1) continue; // WEBVTT header, NOTE, STYLE, stray text
    const time = formatTimestamp(lines[timingIndex]!.split("-->")[0]!);
    const text = lines
      .slice(timingIndex + 1)
      .join(" ")
      .replace(/<v(?:\.[^ >]+)?\s+([^>]+)>/g, "$1: ") // <v Speaker>text
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;

    const [speaker, words] = splitSpeaker(text);
    const previous = out[out.length - 1];
    if (previous && speaker && previous.speaker === speaker) {
      previous.text += ` ${words}`;
    } else {
      out.push({ time, speaker, text: words });
    }
  }

  return out
    .map((c) => `${c.time ? `[${c.time}] ` : ""}${c.speaker ? `${c.speaker}: ` : ""}${c.text}`)
    .join("\n");
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeXmlEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1]?.toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return XML_ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

/** Converts the body of word/document.xml into plain text, one paragraph per line. */
export function wordXmlToText(xml: string): string {
  const text = xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:(?:br|cr)\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeXmlEntities(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Extracts the text of a .docx file (a zip archive) without third-party libraries. */
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Locate the end-of-central-directory record (searching back over a possible comment).
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("This doesn't look like a valid .docx file.");

  const entries = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();

  for (let i = 0; i < entries; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    if (name === "word/document.xml") {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const raw = bytes.subarray(start, start + compressedSize);
      if (method !== 0 && method !== 8) {
        throw new Error("This .docx uses an unsupported compression method.");
      }
      const xml = decoder.decode(method === 8 ? await inflateRaw(raw) : raw);
      return wordXmlToText(xml);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error("No document text found in this .docx file.");
}

/** Reads an uploaded transcript file into the text the intake form expects. */
export async function readTranscriptFile(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (ext === "docx") return extractDocxText(await file.arrayBuffer());
  const text = await file.text();
  if (ext === "vtt" || ext === "srt") return parseTimedTranscript(text);
  if (ext === "txt" || ext === "md") return text.trim();
  throw new Error(`.${ext} files aren't supported. Use ${TRANSCRIPT_FILE_ACCEPT}.`);
}
