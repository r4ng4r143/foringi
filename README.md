# Foringi

Foringi is the Icelandic translation of Commander, a pod matchmaking appfor your LGS. Hosts create sessions, players join via QR code, and an A\* search algorithm balances everyone into fair 4-player pods.

![Host Dashboard](docs/screenshots/host-dashboard.png)

## Acknowledgements

Foringi is built on ideas from [PodPal](https://github.com/Pallrp/PodPal) by [Pallrp](https://github.com/Pallrp) and [hordur99](https://github.com/hordur99). Thank you for taking the initiative on the original project and allowing these ideas to be picked up and carried forward.

The goal of this project is simple: everyone who shows up to their LGS for Commander night should be guaranteed a seat at a fair table. No sitting awkwardly waiting for an invite, no spending the evening in a badly mismatched pod. If you came to play, you get to play.

## Tech Stack

- **Frontend** -- React 19, TypeScript, Vite, Zustand, dnd-kit
- **Backend** -- Cloudflare Pages Functions
- **Storage** -- Cloudflare KV (24-hour TTL)
- **Search** -- A\* algorithm running in a Web Worker

## Quick Start

```bash
npm install
npm run dev          # Vite dev server (frontend only)
npm run dev:worker   # Cloudflare Pages dev server with KV
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript compile + Vite build |
| `npm run preview` | Preview production build |
| `npm run dev:worker` | Pages dev server with KV binding |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
  components/    UI -- HostDashboard, JoinPage, PodGrid, PlayerCard, etc.
  engine/        Matchmaking -- A* agent, heuristic scoring, state model
  api/           HTTP client and type definitions
  store/         Zustand global state
  hooks/         useSearch, useSession, usePersistence
  workers/       Web Worker for background search
  styles/        CSS variables and theme
functions/
  api/session/   Cloudflare Pages Functions (REST API)
```

## Architecture

```
Browser                         Cloudflare
┌──────────────────┐            ┌──────────────────┐
│  React App       │  REST API  │  Pages Functions  │
│  ├─ Zustand      │───────────▶│  /api/session/*   │
│  ├─ Web Worker   │◀───────────│                   │
│  └─ dnd-kit      │            │  KV: SESSIONS     │
└──────────────────┘            └──────────────────┘
```

The host dashboard polls the backend for player joins. The search algorithm runs entirely client-side in a Web Worker so the UI stays responsive.

## API Endpoints

All endpoints live under `/api/session`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/session` | -- | Create session |
| GET | `/api/session/:code` | -- | Get session state |
| PATCH | `/api/session/:code` | Host token | Update session |
| DELETE | `/api/session/:code` | Host token | Delete session |
| POST | `/api/session/:code/join` | -- | Join as player |
| POST | `/api/session/:code/leave` | -- | Leave session |
| POST | `/api/session/:code/solution` | Host token | Save solution |
| DELETE | `/api/session/:code/player/:id` | Host token | Remove player |

Host-authenticated endpoints require an `X-Host-Token` header.

## Search Algorithm

The matchmaker uses two strategies:

- **Cook (A\*)** -- Explores the seating space using a min-heap frontier ordered by heuristic score. Prunes aggressively and returns up to 10 solutions within a 20-second timeout.
- **Shuffle (Random)** -- Greedy random assignment for quick alternatives.

The heuristic penalises:

| Factor | Weight | What it means |
|---|---|---|
| Blacklist violation | 100 | Seated with someone they should avoid |
| Power imbalance | 50 | Lowest power level mismatch at a table |
| Power diversity | 40 | Mixed power brackets at a table |
| Unseated player | 30 | Player left without a pod |
| Empty seat | 10 | Unfilled chair at a table |
| Play history | 3 | Repeat pairings from previous rounds |
| Power difference | 1.5 | Per mismatched bracket between players |

Lower total score = better seating.

## Deployment

Built for Cloudflare Pages. The `wrangler.toml` configures the KV namespace binding.

```bash
npm run build
npx wrangler pages deploy dist
```

## Testing

```bash
npm test
```

Tests cover the search engine (agent, heuristic, environment, heap), the Zustand store, and the API client.

## Acknowledgements

Foringi is built on ideas from [PodPal](https://github.com/Pallrp/PodPal) by [Pallrp](https://github.com/Pallrp) and [hordur99](https://github.com/hordur99). Thank you for taking the initiative on the original project and allowing these ideas to be picked up and carried forward.

The goal of this project is simple: everyone who shows up to their LGS for Commander night should be guaranteed a seat at a fair table. No sitting awkwardly waiting for an invite, no spending the evening in a badly mismatched pod. If you came to play, you get to play.

## License

[MIT](LICENSE)
