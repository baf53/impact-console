/** Small helpers shared by the console's public HTTP endpoints (webhooks, chatbot logging). */

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Constant-time string comparison, so secrets can't be guessed by timing. */
export function safeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) {
    diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Checks `Authorization: Bearer <secret>` against an environment variable.
 * Returns an error Response, or null when the request is authorized.
 */
export function requireBearer(request: Request, envName: string): Response | null {
  const secret = process.env[envName];
  if (!secret) return json({ error: `This endpoint is disabled: ${envName} is not set.` }, 503);
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !safeEqual(token, secret)) return json({ error: "Unauthorized" }, 401);
  return null;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
