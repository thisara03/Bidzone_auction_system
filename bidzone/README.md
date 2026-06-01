# BidZone Web Client

React + TypeScript + Vite SPA for the BidZone auction marketplace.

**Full documentation** (API, deployment, monorepo layout): see the [repository root README](../README.md).

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |

Set `VITE_API_URL` in `.env` to your FastAPI backend (see `../bidzone-api/`).

## Theme

Design tokens live in `src/theme-luxury-dark.css` (Premium Dark Luxury palette).
