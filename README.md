# Jurnal Rasa 🍜📖

> **Personal Culinary Journal & Smart Food Radar**  
> *Never lose a delicious food spot from social media again. Effortlessly extract TikTok and Instagram reels into structured notes, map your culinary wishlist, and explore your palate with Taste Finder AI.*

[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-3.1_Flash_Lite-orange.svg)](https://ai.google.dev/)
[![Google Maps Platform](https://img.shields.io/badge/Google_Maps-Platform-4285F4.svg)](https://developers.google.com/maps)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore_&_Auth-FFCA28.svg)](https://firebase.google.com/)

---

## 🌟 Overview & Problem Solved

Every day, millions of people scroll through **TikTok** and **Instagram Reels** discovering mouth-watering food recommendations. Usually, these discoveries end up lost in chaotic bookmark folders, buried in screenshot galleries, or forgotten in direct messages. When the weekend arrives or when traveling to a new city, deciding where to eat turns into frustration.

**Jurnal Rasa** solves this friction through a seamless, automated culinary recording workflow:
1. **Quick Save**: Paste any TikTok video, photo carousel, or Instagram Reel link. Google Gemini AI parses the restaurant name, signature dishes, aesthetic vibe, city, and pairs it directly with live Google Maps coordinates.
2. **Quick Note**: Add culinary memories manually with live Google Maps search and autocomplete to instantly pull official addresses, coordinates, and ratings.
3. **Taste Journal**: A clean neo-brutalist notebook feed organizing personal taste notes, visit statuses (*Tried* vs. *Want to Try*), and dish recommendations.
4. **Taste Map**: An interactive Google Maps interface pinning personal wishlists and visited spots with custom neo-brutalist pins and driving directions.
5. **Explore Taste**: A trending community radar showcasing viral culinary gems across Indonesian cities, backed by atomic save counts.
6. **Taste Finder (AI Copilot)**: An in-app culinary copilot grounded strictly on the user's personal journal entries, capable of finding twin flavor profiles, proposing dining itineraries, and answering food questions with zero-tolerance prompt-injection defenses.

---

## 🎨 Design Aesthetics: Neo-Brutalist Notebook

Jurnal Rasa is built on a tactile, nostalgic **Neo-Brutalist Notebook** design language:
- **Paper Tone Canvas**: Warm, creamy paper palette (`#FFFDF7`, `#F7F4EA`) resembling an authentic foodie notebook.
- **Crisp Ink Borders**: High-contrast, solid ink strokes (`2px` to `3px` solid `#18181B`).
- **Hard Offset Shadows**: Distinct, unblurred drop shadows (`shadow-[2.5px_2.5px_0px_#18181B]` and `shadow-[4px_4px_0px_#18181B]`).
- **Accent Color Palette**: Tomato Red (`#FF5533`), Canary Yellow (`#FEF08A`), Sky Blue (`#BAE6FD`), Mint Green (`#BBF7D0`), and Bubblegum Pink (`#FF99C8`).
- **Typography**: Display serif headings paired with clean sans-serif UI typography, expressive handwriting accents (`font-handwriting`), and monospace data badges (`font-mono-code`).
- **Washi-Tape Header Sticker**: `★ NUSANTARA EDITION` pinned cleanly above the container boundary.

---

## 🚀 Core Features & Architecture

### 1. Quick Save (Social Media Link Parser)
- **Supported Platforms**: TikTok (`tiktok.com`, `vt.tiktok.com`, `vm.tiktok.com`) and Instagram (`instagram.com/reel/`, `/p/`).
- **Multimodal Slide Analysis**: Automatically handles TikTok photo carousels (`/photo/`) by downloading up to 35 slide images and feeding them to Gemini for visual text recognition (packaging stickers, store neon signs, menu boards).
- **Strict Culinary Relevance Enforcement**: Non-culinary videos (e.g., dancing, makeup, gaming, coding, politics) are strictly rejected with an English advisory message:
  > *"The TikTok or Instagram video/post you provided is not relevant to culinary or dining spots. Please provide a link that features food recommendations, restaurants, or culinary spots."*
- **Google Maps Geocoding & Entity Resolution**: Extracts the place name and matches it with the Google Maps Places API to verify latitude, longitude, formatted address, and Google ratings.

### 2. Quick Note (Live Google Maps Search)
- Live debounced search against Google Places API as you type restaurant names.
- Instant connection banner showing coordinates, address, and live Google star ratings.
- Allows recording personal taste ratings (1–5 stars), visit status, signature dishes, and personal flavor reviews.

### 3. Taste Journal
- Unified dual-subtab view: **Places Collection** vs. **Taste Finder AI**.
- Quick filter pills: *All Entries*, *Want to Try* (Wishlist), and *Tried & Tested*.
- Live unified search bar indexing restaurant names, cities, signature dishes, personal notes, and tags.
- Post-it style personal note cards with 1-click status toggles and Google Maps routing.

### 4. Taste Finder AI Copilot
- Multi-turn conversational assistant grounded on user-saved places.
- **Twin & Similar Dishes**: Identifies flavor matches (e.g., spicy sambal counterparts, rich beef stews, specialty coffees).
- **Foodie Itineraries**: Generates realistic day-long dining schedules.
- **Structured Recommendation Cards**: When recommending dining spots, appends structured JSON cards allowing instant 1-click saving to the user's Taste Journal.
- **Anti-Prompt Injection & Domain Boundary Defense**:
  - Pre-filter keyword inspection (`isOffTopicRequest`) intercepting code generation, math equations, and jailbreak attempts.
  - Strict system instruction commanding zero-tolerance refusal for non-culinary questions.
  - Low temperature (`0.2`) for disciplined factual adherence.

### 5. Taste Map & Explore Taste
- Built with official **Google Maps Platform** (`@vis.gl/react-google-maps`) and Advanced Markers.
- Smooth camera panning and auto-zooming upon place selection.
- Floating bottom drawer card displaying directions, dish highlights, and save actions.
- **Explore Taste Synchronization**: When a user saves a new spot in their journal, it is automatically synced to community Explore Taste with an initial save count; deletions decrement or clean up records accordingly.

---

## 💻 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite SPA |
| **Styling** | Tailwind CSS v4, Neo-Brutalist design tokens |
| **Icons & UI** | Lucide React |
| **Map Rendering** | `@vis.gl/react-google-maps` (Google Maps JavaScript API) |
| **Markdown Rendering** | `react-markdown` |
| **Backend Runtime** | Node.js, Express.js |
| **AI / LLM Engine** | Google Gen AI SDK (`@google/genai`), models: `gemini-3.1-flash-lite`, `gemini-3.8-flash`, `gemini-3.6-flash` |
| **Social Data Extraction** | TikWM API proxy, OpenGraph metadata parsing |
| **Location & Places** | Google Maps Places API (Text Search & Geocoding) |
| **Database & Auth** | Google Cloud Firestore, Firebase Authentication (Guest + Google Sign-In) |

---

## 📁 Directory Structure

```
JurnalRasa/
├── AGENTS.md                   # AI agent persistent execution context & brand rules
├── GEMINI.md                   # Gemini model directives and API constraints
├── README.md                   # Project documentation & setup guide
├── package.json                # Dependencies and build scripts
├── server.ts                   # Express server, Gemini client, Places API proxy
├── vite.config.ts              # Vite configuration
├── index.html                  # HTML entry point with Google Fonts
└── src/
    ├── App.tsx                 # Core app state, tabs, sync logic, and modals
    ├── main.tsx                # React root mount
    ├── index.css               # Neo-brutalist theme styles & CSS variables
    ├── types.ts                # TypeScript interfaces and shared types
    ├── components/
    │   ├── Navbar.tsx          # Sticky top bar with brand logo & navigation
    │   ├── JournalView.tsx     # Primary Taste Journal feed & search filters
    │   ├── CopilotChat.tsx     # Taste Finder AI Copilot with Markdown rendering
    │   ├── FoodMap.tsx         # Google Maps Platform view with custom pins
    │   ├── CuratorModal.tsx    # Quick Save modal for TikTok/IG link parsing
    │   ├── QuickManualModal.tsx# Quick Note modal with live Google Maps search
    │   ├── PlaceCard.tsx       # Neo-brutalist culinary place card
    │   ├── StatsBar.tsx        # Bento stats overview (trending spots & dishes)
    │   ├── LandingPage.tsx     # Welcome authentication & guest entry screen
    │   └── MobileBottomNav.tsx # Mobile bottom navigation bar
    └── lib/
        ├── firebase.ts         # Firebase Auth & Firestore client initialization
        ├── maps.ts             # Google Maps routing & URL helper utilities
        └── demoData.ts         # Curated Nusantara culinary dataset & city constants
```

---

## 📡 Backend API Reference

### 1. Social Link Extractor
- **Endpoint**: `POST /api/parse-link`
- **Body**: `{ "url": string, "caption"?: string, "personalNotes"?: string }`
- **Output**: Returns extracted restaurant name, signature dishes, city, Google Maps coordinates, visual cues, and pricing. Rejects non-culinary posts with `isNotCulinary: true`.

### 2. AI Taste Finder Copilot
- **Endpoint**: `POST /api/chat-copilot`
- **Body**: `{ "messages": Array<{ role: string, content: string }>, "journalEntries": Array<any> }`
- **Output**: Returns conversational advice, auto-generated topic summary, and structured `suggestedPlaces` cards. Intercepts off-topic queries with polite refusal.

### 3. Google Places Search & Geocoding
- **Endpoint**: `GET /api/places/search?q={query}&city={city}`
- **Output**: Proxies Google Maps Places API for live restaurant search suggestions.
- **Endpoint**: `POST /api/geocode`
- **Body**: `{ "name": string, "city"?: string }`
- **Output**: Geocodes place name and city to latitude, longitude, and formatted address.

### 4. Client Maps Configuration & Health
- **Endpoint**: `GET /api/config/maps`
- **Output**: `{ "apiKey": string, "hasMapsKey": boolean, "status": "ok" }`
- **Endpoint**: `GET /api/health`
- **Output**: Server status and timestamp.

---

## ⚙️ Environment Variables Setup

Create a `.env.local` or `.env` file in the project root:

```env
# Google Gemini API Key (Required for Quick Save link parsing and Taste Finder AI)
GEMINI_API_KEY=your_gemini_api_key_here

# Google Maps API Key (Required for Google Maps JavaScript SDK and Places API)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

> **Security Note**: All sensitive API keys are consumed server-side in `server.ts`. Never expose secret keys to the client bundle.

---

## 🛠️ Installation & Local Development

### 1. Install Dependencies
```bash
# Using npm
npm install

# Or using Bun
bun install
```

### 2. Run Development Server
```bash
# Starts both the Express backend and Vite frontend on port 3000
npm run dev

# Or with Bun
bun run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 3. Type Checking & Code Quality
```bash
npm run lint
```

### 4. Production Build & Execution
```bash
# Builds frontend assets to dist/ and bundles server.ts to dist/server.cjs
npm run build

# Runs production server
npm start
```

---

## 🔒 Security & Robustness Directives

- **Server-Side Request Forgery (SSRF) Defense**: `fetchSocialMetadata` disallows private network addresses (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`) and restricts outbound HTTP requests strictly to verified TikTok and Instagram domains.
- **Input Sanitization**: Strips executable HTML/script tags and control characters from captions, notes, and chat inputs. Caps string lengths to prevent payload overflow.
- **Zero-Hallucination Extraction**: Gemini extraction prompt strictly forbids inventing restaurant names; places are grounded in textual/visual cues and cross-verified via Google Maps Places API.
- **Isolated User Firestore Subcollections**: Saved places are segregated under `users/{userId}/saved_places/` to ensure user privacy.

---

## 📄 License

Distributed under the MIT License. Developed for food lovers and culinary explorers everywhere.
