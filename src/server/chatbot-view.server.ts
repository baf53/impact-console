import { answerFromSources, type KnowledgeSource } from "@/server/ai.server";
import { dbError, getServerSupabase } from "@/server/supabase.server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type ChatbotProgram = Tables["knowledge_programs"]["Row"] & {
  notes: Tables["program_notes"]["Row"][];
  documents: Tables["program_documents"]["Row"][];
  attachments: Tables["app_documents"]["Row"][];
};

/**
 * What the public chatbot can read for a visitor in `state`. Mirrors the read-only
 * policies in supabase_step2_security.sql: the state's programs plus Federal ones,
 * program-level notes only, program documents, and approved non-client documents.
 */
export async function loadChatbotView(state: string): Promise<ChatbotProgram[]> {
  const db = getServerSupabase();
  const { data: programs, error } = await db
    .from("knowledge_programs")
    .select("*")
    .in("state", [state, "Federal"])
    .order("name");
  if (error) throw dbError(error, "Could not load programs");
  if (programs.length === 0) return [];

  const ids = programs.map((p) => p.id);
  const [notes, documents, attachments] = await Promise.all([
    db.from("program_notes").select("*").in("program_id", ids),
    db.from("program_documents").select("*").in("program_id", ids),
    db
      .from("app_documents")
      .select("*")
      .in("program_id", ids)
      .eq("status", "Approved")
      .is("client_id", null),
  ]);
  if (notes.error) throw dbError(notes.error, "Could not load notes");
  if (documents.error) throw dbError(documents.error, "Could not load documents");
  if (attachments.error) throw dbError(attachments.error, "Could not load attachments");

  return programs.map((p) => ({
    ...p,
    notes: notes.data.filter(
      (n) => n.program_id === p.id && (n.routing ?? "program-level") === "program-level",
    ),
    documents: documents.data.filter((d) => d.program_id === p.id),
    attachments: attachments.data.filter((a) => a.program_id === p.id),
  }));
}

/** Numbers every piece of knowledge so answers can cite it as [n]. */
export function buildSources(programs: ChatbotProgram[]): KnowledgeSource[] {
  const sources: Omit<KnowledgeSource, "n">[] = [];
  for (const p of programs) {
    sources.push({
      title: `${p.name} (${p.level}, ${p.state}) — program overview`,
      text: [
        `Administrator: ${p.administrator}`,
        `Funds: ${p.funds}`,
        p.overview,
        p.eligibility_criteria ? `Eligibility: ${p.eligibility_criteria}` : null,
        p.cities.length ? `Loaded for: ${p.cities.join(", ")}` : null,
        p.coverage < 25 ? "Note: this program is thinly sourced; details may be incomplete." : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    for (const n of p.notes) {
      sources.push({
        title: `${p.name} — practitioner note${n.call_date ? ` (${n.call_date})` : ""}`,
        text: n.text,
      });
    }
    for (const d of p.documents) {
      sources.push({ title: `${p.name} — ${d.title}`, text: `${d.kind}. ${d.citation}` });
    }
    for (const a of p.attachments) {
      sources.push({
        title: `${p.name} — ${a.title}`,
        text: `${a.type} document on file (${a.file_name}).`,
      });
    }
  }
  return sources.map((s, i) => ({ n: i + 1, ...s }));
}

export type PreviewAnswer = {
  answer: string;
  coverage: "full" | "partial" | "none";
  citations: { n: number; title: string }[];
  programCount: number;
};

export async function answerQuestion(question: string, state: string): Promise<PreviewAnswer> {
  const programs = await loadChatbotView(state);
  const sources = buildSources(programs);
  const result = await answerFromSources({ question, state, sources });
  const cited = new Set(result.cited);
  return {
    answer: result.answer,
    coverage: result.coverage,
    citations: sources.filter((s) => cited.has(s.n)).map((s) => ({ n: s.n, title: s.title })),
    programCount: programs.length,
  };
}
