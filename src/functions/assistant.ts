import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { KNOWLEDGE_STATES } from "@/lib/states";
import { answerQuestion, loadChatbotView, type ChatbotProgram } from "@/server/chatbot-view.server";

export type { ChatbotProgram };

const visitorState = z.enum(KNOWLEDGE_STATES).exclude(["Federal"]);

export const getChatbotViewFn = createServerFn({ method: "GET" })
  .validator(z.object({ state: visitorState }))
  .handler(async ({ data }) => loadChatbotView(data.state));

export const previewAnswerFn = createServerFn({ method: "POST" })
  .validator(z.object({ question: z.string().trim().min(3).max(1000), state: visitorState }))
  .handler(async ({ data }) => answerQuestion(data.question, data.state));
