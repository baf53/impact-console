// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { setDefaultResultOrder } from "node:dns";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Some networks advertise IPv6 but can't route it, which stalls the dev server's
// outgoing requests (Gemini, Supabase). Prefer IPv4 locally; production (Cloudflare)
// never loads this file.
setDefaultResultOrder("ipv4first");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
