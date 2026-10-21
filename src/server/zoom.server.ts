/**
 * Zoom webhook support: URL validation, request signature checks, and transcript
 * download. See https://developers.zoom.us/docs/api/webhooks/
 */
import { safeEqual } from "@/server/http.server";

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Response Zoom expects for the `endpoint.url_validation` challenge. */
export async function zoomUrlValidation(plainToken: string, secret: string) {
  return { plainToken, encryptedToken: await hmacSha256Hex(secret, plainToken) };
}

/**
 * Verifies `x-zm-signature` = "v0=" + HMAC_SHA256(secret, "v0:{timestamp}:{raw body}")
 * and rejects requests older than five minutes (replay protection).
 */
export async function verifyZoomSignature(opts: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowMs?: number;
}): Promise<boolean> {
  const { rawBody, timestamp, signature, secret } = opts;
  if (!timestamp || !signature) return false;
  const ageMs = Math.abs((opts.nowMs ?? Date.now()) - Number(timestamp) * 1000);
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) return false;
  const expected = `v0=${await hmacSha256Hex(secret, `v0:${timestamp}:${rawBody}`)}`;
  return safeEqual(expected, signature);
}

export type ZoomRecordingFile = {
  file_type?: string;
  file_extension?: string;
  download_url?: string;
  status?: string;
};

export type ZoomTranscriptEvent = {
  event: string;
  download_token?: string;
  payload?: {
    object?: {
      uuid?: string;
      topic?: string;
      start_time?: string;
      host_email?: string;
      recording_files?: ZoomRecordingFile[];
    };
  };
};

export function findTranscriptFile(event: ZoomTranscriptEvent) {
  return event.payload?.object?.recording_files?.find(
    (f) => f.file_type === "TRANSCRIPT" && f.download_url,
  );
}

/** Downloads the VTT transcript using the short-lived download token Zoom includes. */
export async function downloadZoomTranscript(downloadUrl: string, downloadToken: string) {
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${downloadToken}` },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Zoom transcript download failed (${res.status}).`);
  return res.text();
}
