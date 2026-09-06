# AGENTS.md — Context & Instructions for AI Agents

> **Persistent AI Context**: This file is automatically injected into system instructions for future AI coding agents working on **Jurnal Rasa**. It provides immediate, token-efficient context to preserve user preferences, architectural decisions, and design principles.

---

## 1. Project Overview & Identity
- **App Name**: **Jurnal Rasa** (Personal Culinary Journal & Food Map).
- **Core User Scenario**: 
  - Users scrolling social media (TikTok / Instagram Reels) discover food recommendations. Instead of saving links haphazardly or forgetting them, they copy & paste the links into Jurnal Rasa to parse and record the spot, dishes, and location coordinates.
  - Users can also use **Catat Cepat** (Quick Notes) with live Google Maps Autocomplete.
  - Pinned spots are mapped visually on **Peta Rasa** and community favorites are explored on **Jelajah Rasa**.
  - **Taste Finder** is an in-app AI Copilot grounded on the user's saved taste journal entries.

---

## 2. Terminology & Brand Conventions (Strict Rules)
1. **App Title**: Always use **"Jurnal Rasa"**.
2. **No Generic/Removed Badges**:
   - Do NOT add "Food Journal" badges (explicitly removed by user).
   - Do NOT add `#AccelerateAIwithCloudRun` or `Google Cloud Gen AI Academy APAC (Cohort 3)` to the footer or headers (explicitly removed by user).
3. **Core Buttons & Labels**:
   - **"Simpan dari Sosmed"**: The social media link parser button (formerly "Curate Link" / "Kurasi Tautan").
   - **"Catat Cepat"**: Quick note entry with Google Maps search integration.
   - **"Peta Rasa"**: Map view of saved taste notes.
   - **"Jelajah Rasa"**: Community trending / viral culinary gems.
   - **"Taste Finder"**: AI Copilot assistant tab. Responds in **English by default** and renders markdown (`react-markdown`) without unparsed asterisks.
4. **Header Sticker**:
   - `★ JURNAL RASA EDITION` is styled as a washi-tape badge pinned cleanly above the container border (`-top-3 right-6 sm:right-8`) with ample negative space above "Catat Cepat".

---

## 3. Tech Stack & Architecture
- **Runtime**: Full-Stack Node.js (Express + Vite SPA middleware).
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React icons, Leaflet with custom neo-brutalist markers, `react-markdown` for chat bubbles.
- **Visual Design**: Neo-brutalist Notebook theme.
  - Background: Creamy off-white paper tone (`#FFFDF7`, `#F7F4EA`).
  - Borders: High-contrast solid ink lines (`2px` to `3px` solid `#18181B`).
  - Drop Shadows: Hard, unblurred offset shadows (`shadow-[2.5px_2.5px_0px_#18181B]`, `shadow-[4px_4px_0px_#18181B]`).
  - Accent Palette: Tomato Red (`#FF5533`), Pastel Yellow (`#FEF08A`), Sky Blue (`#BAE6FD`), Mint Green (`#BBF7D0`), Bubblegum Pink (`#FF99C8`).
- **Backend / APIs (`server.ts`)**:
  - `POST /api/parse-link`: Extracts place name, address, city, signature dishes, visual cues, and Google Maps coordinates from TikTok / Instagram URLs using Gemini + search grounding.
  - `POST /api/chat-copilot`: AI conversational assistant grounded strictly in user's journal entries (`gemini-3.8-flash`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`).
  - `GET /api/places-autocomplete`: Google Maps Places Autocomplete proxy with Indonesia/global fallback.
  - `GET /api/places-details`: Google Maps Place Details proxy for geometry, formatted address, rating, and placeId.
- **Database & Auth (Firebase Firestore)**:
  - Database ID: `ai-studio-rasaradar-8d9bddd9-1bbd-4920-a0f5-24b5f4d9fcd2`.
  - Auth: Firebase Auth (Anonymous guest mode + Google Sign-In popup).
  - Schema:
    - `/places/{placeId}`: Public community places with save counts (`saveCount: number`).
    - `/users/{userId}/saved_places/{placeId}`: User's personal taste notes (`visited: boolean`, `personalNotes`, `rating`, `tags`, `timestamp`).

---

## 4. Key Components Directory
- `src/App.tsx`: Central state coordinator (active tab, user state, modals, sync logic).
- `src/components/JournalView.tsx`: Merged journal feed (subTab: `places` notes grid vs `chat` Taste Finder Copilot), tag filters, mobile quick navigation.
- `src/components/CopilotChat.tsx`: AI chat interface with `react-markdown`, English welcome message, and grounded journal context.
- `src/components/CuratorModal.tsx`: "Simpan dari Sosmed" link parser modal with Gemini extraction and manual refinement.
- `src/components/QuickManualModal.tsx`: "Catat Cepat" modal with live Google Maps place search, dish tagging, and review stamps.
- `src/components/FoodMap.tsx`: Leaflet map view with city switching, custom pins, and popup cards.
- `src/components/MobileBottomNav.tsx`: Bottom bar navigation for mobile devices (`Jurnal Rasa`, `Peta Rasa`, `Jelajah Rasa`).
- `src/components/Navbar.tsx`: Top navigation with brand header, "Simpan dari Sosmed", "Catat Cepat", and user profile.
- `src/lib/maps.ts`: Google Maps helper utilities for URLs and external routing.
- `src/lib/firebase.ts`: Firestore & Auth initialization.

---

## 5. Development Guidelines
- Always keep Gemini API keys and Google Maps keys strictly server-side in `server.ts`.
- When editing Markdown rendering in `CopilotChat.tsx`, use `<div className="markdown-body"><Markdown>{content}</Markdown></div>`.
- Build command: `npm run build` (`vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`).
- Start command: `node dist/server.cjs`.
