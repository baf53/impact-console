# Collective Impact — Data Console: Shell and Dashboard

## Scope
Build the first working slice of the internal operator console at `/`, limited to the shared shell, ordered navigation, one in-memory mock-data source, and Dashboard.

## What will be built
- A calm, data-dense application shell with a collapsible left sidebar.
- Navigation in the requested order: Dashboard, Transcript Intake, Review & Approve, Knowledge Base, Assistant & Map, Answer Log, Reports.
- Light and dark appearance support, including an accessible theme control.
- A Dashboard with four summary cards and a compact recent-activity list.
- Three seeded housing projects and their named funding programs in a single TypeScript mock-data module.
- Live-feeling local state access so later screens can read and update the same in-memory records.
- Placeholder destinations for unfinished navigation items so every sidebar link works without implementing those screens yet.

## Visual direction
- Linear/Notion-inspired operator workspace: restrained borders, compact controls, generous whitespace, and strong information hierarchy.
- Deep teal as the sole accent, neutral surfaces, no gradients, marketing sections, maps, or imagery.
- Desktop-first density with a usable narrow-screen navigation drawer.

## Technical details
- Keep TanStack Start routing and use one route per sidebar destination.
- Define semantic light/dark tokens in the global design system; no hardcoded component colors.
- Use a React context around the single mock-data module to expose shared mutable in-memory state.
- Add unique metadata for every created page, including placeholders.
- Verify the dashboard and navigation at desktop and mobile widths.

## Not included
- Authentication, persistence, database, real pipeline integrations, map, chatbot, or full secondary-screen workflows.
