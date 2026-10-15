import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { DOCUMENT_TYPES } from "@/lib/documents";
import { slugify } from "@/lib/states";
import { logActivity } from "@/server/activity.server";
import { dbError, getServerSupabase } from "@/server/supabase.server";
import type { Database } from "@/types/database";

export type DocumentRow = Database["public"]["Tables"]["app_documents"]["Row"];

const BUCKET = "documents";
// The bucket is shared with another system; everything the console stores lives under this prefix.
const PREFIX = "console";

function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext =
    dot > 0
      ? name
          .slice(dot + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
      : "";
  return `${slugify(base) || "file"}${ext ? `.${ext}` : ""}`;
}

export const listDocumentsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<DocumentRow[]> => {
    const { data, error } = await getServerSupabase()
      .from("app_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw dbError(error, "Could not load documents");
    return data;
  },
);

export const createUploadUrlFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().trim().min(1),
      programId: z.string().min(1).optional(),
      clientId: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const folder = data.programId
      ? `programs/${data.programId}`
      : data.clientId
        ? `clients/${data.clientId}`
        : "library";
    const path = `${PREFIX}/${folder}/${crypto.randomUUID()}-${safeFileName(data.fileName)}`;
    const { data: signed, error } = await getServerSupabase()
      .storage.from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(`Could not prepare upload: ${error.message}`);
    return { path: signed.path, signedUrl: signed.signedUrl };
  });

export const registerDocumentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      path: z.string().startsWith(`${PREFIX}/`),
      fileName: z.string().trim().min(1),
      title: z.string().trim().min(1, "Title is required"),
      type: z.enum(DOCUMENT_TYPES),
      programId: z.string().min(1).optional(),
      clientId: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getServerSupabase();
    let program: { name: string; state: string; jurisdiction: string } | null = null;
    if (data.programId) {
      const { data: found, error } = await db
        .from("knowledge_programs")
        .select("name, state, jurisdiction")
        .eq("id", data.programId)
        .maybeSingle();
      if (error) throw dbError(error, "Could not load program");
      if (!found) throw new Error("That program no longer exists.");
      program = found;
    }

    const { data: doc, error } = await db
      .from("app_documents")
      .insert({
        title: data.title,
        type: data.type,
        file_name: data.fileName,
        storage_path: data.path,
        program_id: data.programId ?? null,
        client_id: data.clientId ?? null,
        program: program?.name ?? null,
        jurisdiction: program?.jurisdiction ?? null,
        state: program?.state ?? null,
        status: "Pending review",
      })
      .select()
      .single();
    if (error) {
      await db.storage.from(BUCKET).remove([data.path]);
      throw dbError(error, "Could not save document");
    }

    await logActivity({
      action: "Document uploaded",
      subject: doc.title,
      detail: `${doc.type}${program ? ` · ${program.name}` : ""} · pending review`,
      status: "review",
    });
    return doc;
  });

export const setDocumentStatusFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), status: z.enum(["Approved", "Pending review"]) }))
  .handler(async ({ data }) => {
    const { data: doc, error } = await getServerSupabase()
      .from("app_documents")
      .update({ status: data.status })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw dbError(error, "Could not update document");

    await logActivity({
      action: data.status === "Approved" ? "Document approved" : "Document returned to review",
      subject: doc.title,
      detail: `${doc.type}${doc.program ? ` · ${doc.program}` : ""}`,
      status: data.status === "Approved" ? "approved" : "review",
    });
    return doc;
  });

export const getDocumentUrlFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getServerSupabase();
    const { data: doc, error } = await db
      .from("app_documents")
      .select("storage_path, file_name")
      .eq("id", data.id)
      .single();
    if (error) throw dbError(error, "Could not load document");
    if (!doc.storage_path) throw new Error("This document has no file attached.");

    const { data: signed, error: signError } = await db.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });
    if (signError) throw new Error(`Could not create download link: ${signError.message}`);
    return { url: signed.signedUrl };
  });

export const deleteDocumentFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getServerSupabase();
    const { data: doc, error } = await db
      .from("app_documents")
      .delete()
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw dbError(error, "Could not delete document");

    if (doc.storage_path?.startsWith(`${PREFIX}/`)) {
      const { error: storageError } = await db.storage.from(BUCKET).remove([doc.storage_path]);
      if (storageError) console.error("Storage cleanup failed:", storageError.message);
    }

    await logActivity({
      action: "Document deleted",
      subject: doc.title,
      detail: `${doc.type}${doc.program ? ` · ${doc.program}` : ""}`,
      status: "updated",
    });
    return { id: doc.id, programId: doc.program_id };
  });
