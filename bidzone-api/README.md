# BidZone API (Python / low-cost stack)

FastAPI + **MySQL 8** + Redis + Alembic, packaged for a **single small VPS** or `docker compose` on your laptop.

## What’s included

- `GET /health` — database + Redis connectivity (`database` + `redis` flags)
- **Auth**: `POST /auth/token` — OAuth2 password flow (**username** = email); JWT bearer supported on routes via `Authorization` (see `app/api/deps.py`; **`X-User-Id`** remains as a dev fallback)
- `POST /users/register` — create **bidder** or **seller** (optional `password`, stored hashed)
- `GET /users/{user_id}` — profile (`trust_score`, **`unpaid_win_count`**, **`completed_sales_count`**)
- `GET /auctions` — list auctions (includes settlement fields)
- `GET /auctions/{auction_id}` — single auction
- `POST /auctions` — create auction (seller; **`anti_sniping_minutes`**, **`payment_window_minutes`** default 48h)
- `POST /auctions/{auction_id}/bids` — place bid (**`Idempotency-Key`**, `{ "amount_cents": … }`). **`SELECT … FOR UPDATE`** on auction; **anti-sniping**; **`auction_participants`** use **`INSERT IGNORE`** on MySQL
- `WS /ws/auctions/{auction_id}?user_id=<UUID>` — auction room (live auctions only)
- **Phase 5 settlement** — **`GET /auctions/{id}/settlement`**, **`POST .../confirm-payment`**, **`declare-non-payment`**, **`confirm-delivery`**
- **Background**: ~30s tick ends live auctions, opens settlement, payment timeouts
- **Trust**: `POST /trust/ratings` with **`auction_id`**; **`behavior-blend-v1`**
- Alembic: single revision **`001_initial`** (full schema for MySQL)

## If `docker` is not recognized (Windows)

Docker is not installed or not on your `PATH`, so **nothing listens on port 3307** and Workbench will fail there. Pick one:

### A — Use your existing MySQL on port **3306** (no Docker)

1. Open **MySQL Workbench** and connect with your **normal admin account** (often **`root`**) on **`127.0.0.1:3306`** (the port that already shows as `LISTENING` in `netstat`).
2. **File → Open SQL Script** → open `bidzone-api/scripts/init_bidzone_mysql_native.sql` → execute it (lightning bolt). That creates database **`bidzone`** and user **`bidzone`** / password **`bidzone`**.
3. **New connection** for daily use: Host **`127.0.0.1`**, Port **`3306`**, Username **`bidzone`**, Password **`bidzone`**, Default schema **`bidzone`**.
4. Copy `.env.example` → `.env` (it defaults to **3306**). Then in `bidzone-api`:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

After **`alembic upgrade head`**, refresh schemas in Workbench to see tables (`users`, `auctions`, etc.).

### B — Install Docker later

Install [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/), start it, sign in if prompted, then open a **new** PowerShell and run `docker --version`. Use **`docker compose up --build`**; Workbench then uses **`127.0.0.1:3307`** (see below).

---

## Run locally (Docker)

Requires Docker Desktop (or another engine where `docker` works in PowerShell).

```bash
cd bidzone-api
docker compose up --build
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  
- **MySQL from the host PC:** `127.0.0.1:3307` → user **`bidzone`**, password **`bidzone`**, schema **`bidzone`**. (**3307** avoids clashing with a separate Windows MySQL on **3306**.) Inside Docker, the API still uses **`db:3306`**.  
- Redis: `localhost:6379`

The API container runs `alembic upgrade head` on startup, then Uvicorn.

**Fresh MySQL data volume:**

```bash
docker compose down -v
docker compose up --build
```

## MySQL Workbench

| Setup | Host | Port | User | Password | Notes |
|--------|------|------|------|----------|--------|
| **Native MySQL (no Docker)** | `127.0.0.1` | **3306** | `bidzone` | `bidzone` | Run `scripts/init_bidzone_mysql_native.sql` as `root` first. |
| **Docker Compose** | `127.0.0.1` | **3307** | `bidzone` | `bidzone` | Only after `docker compose up` and **`db`** healthy. Root in container: `bidzone_root`. |

If Workbench says it cannot connect to **3307**, Docker is not publishing that port (install/start Docker, or use **3306** with the SQL script above). A message that also mentions **3306** is often Workbench’s own follow-up check; the important part is having a server listening on the port you chose.

## Connect the React app

Point Vite’s dev server API base URL to `http://localhost:8000` and add `http://localhost:5173` to `CORS_ORIGINS` (already in `docker-compose.yml`).

### Quick manual test (curl)

Replace dates/UUIDs with values from your responses.

```bash
# Seller (with password for token flow)
curl -s -X POST http://localhost:8000/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@example.com","role":"seller","full_name":"Ada","password":"secret123"}'

# Bidder
curl -s -X POST http://localhost:8000/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@example.com","role":"bidder","full_name":"Bob","password":"secret456"}'

# Token (username = email)
curl -s -X POST http://localhost:8000/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=seller@example.com&password=secret123"

# Auction — use Bearer token or X-User-Id for seller
curl -s -X POST http://localhost:8000/auctions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"title":"Demo laptop","starting_price_cents":500000,"bid_increment_cents":5000,"anti_sniping_minutes":15,"ends_at":"2030-12-31T22:00:00Z"}'

# First bid
curl -s -X POST http://localhost:8000/auctions/<AUCTION_UUID>/bids \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <BUYER_TOKEN>" \
  -H "Idempotency-Key: place-001" \
  -d '{"amount_cents":500000}'
```

WebSocket (participant must pass **`user_id`** query):

`ws://localhost:8000/ws/auctions/<AUCTION_UUID>?user_id=<BUYER_UUID>`

### Bid rules (MVP)

- First bid must be **≥ `starting_price_cents`** (initial `current_high_cents`).
- Later bids must be **≥ `current_high_cents` + `bid_increment_cents`**.
- Sellers cannot bid on their own auctions.
- **Anti-sniping**: for the last **`anti_sniping_minutes`** (default 15) before **`ends_at`**, only users who have **already placed a bid** (or joined the WS room while allowed) continue; others get **403** on bid and WS connect.
- Re-sending the same **`Idempotency-Key`** returns the original bid (HTTP 200) once it exists.

### Phase 5–6 settlement (after the auction ends)

1. When **`ends_at`** passes, the background job sets **`status=ended`** and opens settlement: highest unique bidders (by max bid) are tried in order.  
2. **`settlement_status`** values include **`pending_payment`**, **`paid`**, **`awaiting_ratings`**, **`completed`**, **`no_bids`**, **`reserve_not_met`**, **`exhausted`**.  
3. Allocated winner calls **`POST /auctions/{id}/settlement/confirm-payment`** (optional body `{ "amount_cents": … }` must match **`amount_due_cents`** from **`GET .../settlement`**). Missing the deadline triggers automatic fallback to the next bidder (same as **`declare-non-payment`**).  
4. Seller calls **`confirm-delivery`** after payment; then both parties submit **`POST /trust/ratings`** with this **`auction_id`** — when **two** ratings exist, settlement becomes **`completed`**.  
5. Failing to pay increments the buyer’s **`unpaid_win_count`** and lowers **`trust_score`** via the blend stub; successful delivery increments the seller’s **`completed_sales_count`**.

## Production on a cheap VPS

- Same `docker compose` (or swap Caddy for TLS termination).
- Set strong **`JWT_SECRET`**, **MySQL** `MYSQL_ROOT_PASSWORD` / app user password, and secrets via env; on a VPS consider **not** publishing the DB port publicly (remove `ports` on `db` and keep DB on the Docker network only).

## Hosted deploy (Docker / Render-style)

- **`Dockerfile`**: builds the API image, runs **`alembic upgrade head`**, then **Uvicorn** on **`PORT`** (or **8000** locally).
- **`render.yaml`**: optional Render blueprint; in the Render UI set **`DATABASE_URL_SYNC`**, **`JWT_SECRET`**, **`CORS_ORIGINS`** (your live site URL(s), comma-separated), and any Twilio/SendGrid keys.
- Point the React app’s **`VITE_API_URL`** (see `bidzone/.env.example`) at the public API URL, rebuild the frontend, and keep **`CORS_ORIGINS`** in sync with the exact browser origin (scheme + host + port).
