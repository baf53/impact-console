/**
 * Resilience for flaky connections: retries brief network failures to Supabase,
 * and turns raw "fetch failed" errors into messages the operator can act on.
 */

type Fetch = typeof fetch;

/** Requests that are safe to send twice: repeating them changes nothing further. */
const REPEATABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "DELETE"]);

/** Failures that happen before the request leaves this machine, so even an insert can be resent. */
const NOT_SENT_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const NETWORK_MESSAGE =
  /fetch failed|failed to fetch|network|socket|connection (lost|reset|closed)|terminated|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i;

/** True for a failed connection (no HTTP response), not for HTTP errors or code bugs. */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return NETWORK_MESSAGE.test(err.message) || errorCode(err) !== undefined;
}

function errorCode(err: unknown): string | undefined {
  const cause = (err as { cause?: { code?: unknown } } | null)?.cause;
  return typeof cause?.code === "string" ? cause.code : undefined;
}

function shouldRetry(err: unknown, method: string): boolean {
  if (!(err instanceof TypeError)) return false; // aborts and HTTP errors are not retried
  if (REPEATABLE_METHODS.has(method)) return true;
  const code = errorCode(err);
  return code !== undefined && NOT_SENT_CODES.has(code);
}

export function makeFetchWithRetry(
  baseFetch: Fetch,
  delaysMs: number[] = [400, 1500, 4000],
): Fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    for (let attempt = 0; ; attempt++) {
      try {
        return await baseFetch(input, init);
      } catch (err) {
        const delay = delaysMs[attempt];
        if (delay === undefined || !shouldRetry(err, method)) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }) as Fetch;
}

/** Message for a failure that came from the connection rather than the service. */
export function networkErrorMessage(service: string) {
  return `Couldn't reach ${service} — the internet connection dropped. Nothing was lost; try again.`;
}
