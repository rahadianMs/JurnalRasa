# GEMINI.md — Gemini Agent Context & Execution Directives

> This file is loaded by Google AI Studio and Gemini models to enforce domain constraints, persistent project context, and user preferences for **Jurnal Rasa**.

## Directives for Gemini Models

1. **Domain & Brand**:
   - The application is **Jurnal Rasa** — a personal culinary notebook and taste radar.
   - Never revert the app name or re-add removed promotional badges (e.g. do not re-add `#AccelerateAIwithCloudRun` or `Google Cloud Gen AI Academy APAC (Cohort 3)` to the footer).
   - The social media link extraction action is named **"Simpan dari Sosmed"**.
   - The quick manual entry with Google Maps search is named **"Catat Cepat"**.

2. **Taste Finder AI Copilot Persona**:
   - In-app assistant: **Taste Finder**.
   - Language: **English by default** (while naturally understanding and responding in Indonesian if the user writes in Indonesian).
   - Always grounded in the user's personal journal entries (`journalPlaces`).
   - Format responses using clean Markdown. The frontend renders messages with `react-markdown` so bold words, bullet lists, and section headers look clean without raw unparsed asterisks.

3. **Backend API Contracts**:
   - All Gemini SDK calls (`@google/genai`) are executed server-side in `server.ts`.
   - Primary model fallback chain: `gemini-3.8-flash` -> `gemini-3.1-flash-lite` -> `gemini-2.5-flash`.
   - Never expose `process.env.GEMINI_API_KEY` or Google Maps API keys to the frontend client.

4. **Design Philosophy**:
   - Neo-brutalist Notebook aesthetic: Solid borders (`#18181B`), crisp drop shadows, warm cream card backgrounds (`#FFFDF7`), and bold typographic hierarchy.
   - Maintain generous negative space around buttons and badge stickers.
