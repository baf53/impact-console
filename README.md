# Impact Console

Build an internal back-office web app called "Collective Impact — Data Console." This is an operator tool for one admin user (a housing-funding expert), NOT a public app. It is the control surface for a data pipeline that feeds an existing map-based AI assistant. Do not build the map or the chatbot here — those exist elsewhere and we only stub them. Design: clean, calm, data-dense, professional — think Linear or Notion, not a marketing site. Left sidebar navigation, light and dark mode, generous whitespace, one accent color (deep teal). No gradients or hero images. Everything is tables, detail panels, and review queues. Sidebar nav, in this order: 1. Dashboard 2. Transcript Intake 3. Review & Approve 4. Knowledge Base 5. Assistant & Map (stub) 6. Answer Log 7. Reports Use a single mock-data file (TypeScript) as the source of truth — no real backend, no auth. All screens read from and write to this in-memory mock data so the app feels live when I click through it. Seed the mock data with three real projects I'll reference everywhere: - 316 S Morton Ave, Bartlesville, OK — vacant lot, rental housing. Programs: Oklahoma Increased Housing Program (OHFA), CDBG Small Cities, LIHTC, HOME. - 1000 N Orange Ave, Orlando, FL — programs: City of Orlando CDBG, HOME, SHIP. - 572 Gold St, Baltimore, MD — programs: Baltimore CDBG/HOME, Maryland LIHTC, Affordable Housing Trust Fund, City-Wide Affordable Housing TIF. Dashboard shows four stat cards (Transcripts this month, Items awaiting my approval, Programs loaded, Reports generated) and a short "recent activity" list. Keep it simple. Build only the shell, nav, mock-data file, and Dashboard in this step.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1bae76d5-2428-492b-b97d-9fa6e4d90899).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
