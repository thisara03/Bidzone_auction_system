# BidZone Auction System

A modern **real-time auction marketplace** built for Sri Lanka and similar markets — combining **live bidding**, **seller KYC onboarding**, **AI bid coaching**, **trust scoring**, and a **premium dark luxury** UI (gold accents, live timers, and futuristic AI panels).

This repository contains the full stack:

| Directory | Stack | Role |
|-----------|--------|------|
| [`bidzone/`](./bidzone/) | React 19 · TypeScript · Vite | Web client (SPA) |
| [`bidzone-api/`](./bidzone-api/) | FastAPI · MySQL · Redis | REST + WebSocket API |

---

## Features

### Bidders
- Browse auctions with category filters, search, wishlist, and cart
- Live product detail with countdown, bid history, and place-bid flow
- **Bid Coach** — AI-style suggestions, win probability gauge, price history chart
- Multi-step checkout (review → payment) with saved cards (demo)
- English / Sinhala / Tamil via i18n

### Sellers
- Role-based onboarding (bidder vs seller) with **KYC wizard** (phone OTP, NIC upload, AML step)
- Seller dashboard — listings, analytics donut, earnings / pending / rejected states
- Create and edit auction listings

### Platform
- JWT-ready client (`VITE_API_URL`) with local demo mode (localStorage)
- **Premium Dark Luxury** design system (`bidzone/src/theme-luxury-dark.css`)
- Deploy-ready: Netlify & Vercel SPA rewrites included

### API (backend)
- Auctions, bids, anti-sniping, WebSocket rooms
- Settlement, trust ratings, notifications, phone auth
- Docker Compose for local MySQL + Redis

See [`bidzone-api/README.md`](./bidzone-api/README.md) and [`bidzone-api/docs/ARCHITECTURE.md`](./bidzone-api/docs/ARCHITECTURE.md) for API details.

---

## Quick start

### Prerequisites
- **Node.js** 20+ (frontend)
- **Python** 3.11+ (API)
- **MySQL** 8 and **Redis** (or Docker — see API README)

### 1. Frontend

```bash
cd bidzone
cp .env.example .env
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173/`). Routes include `/`, `/home`, `/listing/:id`, `/dashboard`, `/checkout`.

```bash
npm run build    # production bundle → dist/
npm run preview  # preview production build
```

### 2. API (optional — enables live backend)

```bash
cd bidzone-api
cp .env.example .env
python -m venv .venv
# Windows: .\.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Set in `bidzone/.env`:

```env
VITE_API_URL=http://localhost:8000
```

API docs: `http://localhost:8000/docs`

---

## Project structure

```
Bidzone_auction_system/
├── bidzone/                 # React SPA
│   ├── src/
│   │   ├── components/      # Header, cards, panels, charts
│   │   ├── pages/           # Home, listing, checkout, seller
│   │   ├── context/         # Auth, cart, listings, i18n
│   │   └── theme-luxury-dark.css
│   └── public/
├── bidzone-api/             # FastAPI service
│   ├── app/
│   ├── alembic/
│   └── docker-compose.yml
└── README.md
```

---

## Design system

The UI uses a **Luxury Tech Marketplace** palette:

- Backgrounds: `#0F1115`, `#1A1D24`, `#1F2937`
- Accent gold: `#F59E0B` / hover `#FBBF24`
- Live bid green: `#10B981` · Urgent red: `#EF4444`
- AI panels: cyan `#06B6D4` + purple `#8B5CF6`

Fonts: **Poppins** (headings), **Inter** (body), **Manrope** (numbers).

---

## Deployment

| Target | Config |
|--------|--------|
| **Netlify** | `bidzone/netlify.toml` — build `npm run build`, publish `dist` |
| **Vercel** | `bidzone/vercel.json` — SPA rewrites |
| **API** | `bidzone-api/render.yaml`, `Dockerfile`, or any VPS + `docker compose` |

Point the frontend `VITE_API_URL` at your deployed API origin (no trailing slash).

---

## Scripts

**Frontend** (`bidzone/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Typecheck + production build |
| `npm run lint` | ESLint |
| `npm run preview` | Serve `dist/` locally |

**Backend** — see [`bidzone-api/README.md`](./bidzone-api/README.md).

---

## Environment variables

**Frontend** (`bidzone/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL; leave empty for demo-only (no backend) |

**Backend** — see `bidzone-api/.env.example`.

Never commit `.env` files.

---

## Contributing

1. Fork the repository  
2. Create a feature branch (`git checkout -b feature/your-feature`)  
3. Commit with clear messages  
4. Open a pull request  

---

## License

This project is provided as-is for educational and portfolio use. Add a license file if you publish commercially.

---

## Author

**[thisara03](https://github.com/thisara03)** — [Bidzone_auction_system](https://github.com/thisara03/Bidzone_auction_system)
