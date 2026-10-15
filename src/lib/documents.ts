export const DOCUMENT_TYPES = [
  "Regulation",
  "Agency guidance",
  "Consolidated Plan",
  "Annual Action Plan",
  "Application form",
  "Checklist",
  "Missing Document",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Supabase's default per-file upload limit. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Uploads a file to a Supabase Storage signed upload URL (created server-side). */
export async function uploadToSignedUrl(signedUrl: string, file: File) {
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);
  const res = await fetch(signedUrl, {
    method: "PUT",
    body,
    headers: {
      "x-upsert": "false",
      apikey: String(import.meta.env["VITE_SUPABASE_ANON_KEY"] ?? ""),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
}
