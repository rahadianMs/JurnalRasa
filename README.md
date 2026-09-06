# Jurnal Rasa 🍜📖

> **Buku Catatan Kuliner Pribadi & Peta Rasa**  
> *Save culinary gems from social media without forgetting them, map your wishlist, and explore with an intelligent AI Taste Finder.*

---

## 🌟 Overview & The Problem Solved

Every day, people scroll through TikTok and Instagram Reels and come across mouth-watering food recommendations. Usually, these posts are saved in chaotic bookmark folders, screenshot galleries, or forgotten in direct messages. When the weekend arrives or when traveling to a new city, deciding where to eat becomes frustrating.

**Jurnal Rasa** solves this:
1. **Simpan dari Sosmed**: Paste any TikTok or Instagram post/reel link. Gemini AI parses the restaurant name, signature dishes, aesthetic vibe, city, and pairs it with live Google Maps coordinates.
2. **Catat Cepat**: Add culinary memories manually with Google Maps Places Autocomplete to auto-fill addresses, coordinates, and ratings.
3. **Peta Rasa**: An interactive Leaflet map pinning all your personal wishlist and visited spots with custom neo-brutalist pins.
4. **Jelajah Rasa**: Discover viral culinary spots trending across the food lover community.
5. **Taste Finder (AI Copilot)**: An in-app assistant grounded on your own taste journal entries to plan itineraries, find cozy dinner spots, and compare dishes.

---

## 🎨 Design System: Neo-brutalist Notebook

- **Base Colors**: Warm paper cream (`#FFFDF7`, `#F7F4EA`), deep ink borders (`#18181B`).
- **Accent Tones**: Tomato Red (`#FF5533`), Canary Yellow (`#FEF08A`), Sky Blue (`#BAE6FD`), Mint Green (`#BBF7D0`), Bubblegum Pink (`#FF99C8`).
- **Shadows**: Hard-edged solid ink offset shadows (`shadow-[2.5px_2.5px_0px_#18181B]`).
- **Typography**: Display serif titles paired with playful handwriting accents (`font-handwriting`) and monospace tags (`font-mono-code`).

---

## 🚀 Tech Stack

- **Frontend**:
  - React 19 + TypeScript + Vite
  - Tailwind CSS v4
  - Lucide React (Icons)
  - Leaflet + React Leaflet (Maps)
  - `react-markdown` (Rich AI formatting)
- **Backend**:
  - Express.js + Vite Middleware (`server.ts`)
  - `@google/genai` (Gemini API with `gemini-3.8-flash` & `gemini-3.1-flash-lite`)
  - Google Maps Places API (Autocomplete & Details proxy)
- **Database & Auth**:
  - Google Cloud Firestore (Multi-tenant schema with personal user journals and public community pulse)
  - Firebase Authentication (Anonymous guest mode + Google Sign-In)

---

## 📁 Project Architecture

```
├── AGENTS.md               # Context & directives for AI assistants (token-efficient)
├── GEMINI.md               # Directives for Gemini models
├── README.md               # Human and developer guide
├── package.json            # Node.js dependencies and build scripts
├── server.ts               # Express full-stack backend, Gemini AI, & Maps proxy
├── firestore.rules         # Security rules for user journals and public places
└── src/
    ├── App.tsx             # Main controller, state management, modal handlers
    ├── types.ts            # Core TypeScript interfaces and enums
    ├── components/
    │   ├── JournalView.tsx     # Unified taste notes & Taste Finder copilot
    │   ├── CopilotChat.tsx     # Taste Finder AI chat interface with Markdown
    │   ├── CuratorModal.tsx    # "Simpan dari Sosmed" link extractor modal
    │   ├── QuickManualModal.tsx# "Catat Cepat" modal with Google Maps search
    │   ├── FoodMap.tsx         # Leaflet interactive map with custom pins
    │   ├── MobileBottomNav.tsx # Mobile navigation bar (Jurnal, Peta, Jelajah)
    │   ├── Navbar.tsx          # Top navigation header & user authentication
    │   └── PlaceCard.tsx       # Neo-brutalist place card component
    └── lib/
        ├── firebase.ts     # Firestore and Firebase Auth configuration
        └── maps.ts         # Google Maps search & external navigation helpers
```

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/parse-link` | `POST` | Parses TikTok/Instagram links with Gemini to extract culinary entities and Google Maps grounding |
| `/api/chat-copilot` | `POST` | Chat with Taste Finder AI grounded on user's personal taste journal entries |
| `/api/places-autocomplete` | `GET` | Proxies Google Maps Places Autocomplete search for places and restaurants |
| `/api/places-details` | `GET` | Fetches geometry, full formatted address, and ratings for a selected Google Place ID |
| `/api/health` | `GET` | Backend health check endpoint |

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory (refer to `.env.example`):

```env
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## 🛠️ Development & Production

```bash
# Install dependencies
npm install

# Start development server (Port 3000)
npm run dev

# Compile production bundle
npm run build

# Start production server
npm start

# Validate code & types
npm run lint
```
