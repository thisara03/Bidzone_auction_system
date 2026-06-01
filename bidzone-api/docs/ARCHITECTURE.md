# Architecture vs “Auction system – end-to-end workflow”

| Diagram block | Where it lives | Notes |
|---------------|----------------|--------|
| **Phase 1 – Sign-up Bidder/Seller** | `bidzone` SPA: `/onboarding` | Frontend demo (`localStorage`). Wire to `POST /users/register` + roles. |
| **Phase 1 – Bidder fields** | SPA + API `users` table | API stores email/name/trust fields; extend schema for address/city when syncing SPA. |
| **Phase 1 – Seller eKYC / AML** | SPA wizard + `POST /integrations/webhooks/ekyc-demo` | Real OTP/NIC/AML = providers + verified writes to `seller_verified`. |
| **Phase 2 – Listing & timers** | `POST /auctions`, `anti_sniping_minutes`, `ends_at` | Postgres source of truth. |
| **Phase 2 – Empty bid history** | `bids` table per auction | First bid creates rows; prior user listings used separate demo store in SPA only. |
| **Phase 3 – Auction room / realtime** | `WS /ws/auctions/{id}?user_id=` | Participant registry + `bid_placed` broadcasts. |
| **Phase 3 – Win probability ML** | `GET /ai/auctions/{id}/win-probability` | **Heuristic `heuristic-v1`** until RandomForest trained. |
| **Phase 3 – Agentic bid coach** | `GET /ai/auctions/{id}/bid-coach` | **Stub copy** until LLM + retrieval wired. |
| **Phase 3 – Bid placement** | `POST /auctions/{id}/bids` | Row lock + idempotency + WS broadcast. |
| **Phase 4 – Anti-sniping** | `anti_sniping.py`, WS gate, bid gate | Final window blocks **new** participants; seller dashboard SPA banner mirrors rule when `auctionEndsAt` exists. |
| **Phase 4 – Final close** | `auction_closer` loop | Sets `status=ended` when `ends_at` passed. |
| **Phase 5 – Winner notify & pay window** | `settlement.bootstrap_*`, WS `winner_allocated` | Ended auctions → `pending_payment` with `checkout_deadline_at`; `GET /auctions/{id}/settlement`. |
| **Phase 5 – Payment states / cascade** | `settlement.fail_current_checkout`, `process_checkout_timeouts` | **pending_payment** → **paid_success** (`confirm-payment`) or **payment_failed** (timeout / `declare-non-payment`) → next highest unique bidder; else **exhausted**. |
| **Phase 5 – Delivery** | `POST .../settlement/confirm-delivery` | **paid** → **awaiting_ratings**; bumps seller `completed_sales_count` + trust. |
| **Phase 6 – Ratings** | `POST /trust/ratings` with `auction_id` | Two ratings on the auction → **completed** settlement + WS `settlement_completed`. |
| **Phase 6 – Trust ML stub** | `ml_stub.composite_trust_score`, `trust_sync.refresh_user_trust_score` | Blends avg stars + unpaid-win penalty + completion bonus (`behavior-blend-v1`). |
| **Auth JWT / OAuth2** | `POST /auth/token`, `Authorization: Bearer` | Password on register optional; header `X-User-Id` still accepted for tests. |
| **MySQL 8 + Redis** | `docker-compose.yml` | Redis optional locally if `REDIS_URL` empty; `/health` reports **`database`** + Redis. |
| **Payments / escrow** | `POST /payments/escrow/intents` | **Stub** PSP intent; ledger hooks TBD. |
| **Trust / ratings** | `POST /trust/ratings`, `trust_score`, counters | **behavior-blend-v1** (stars + `unpaid_win_count` + `completed_sales_count`). |
| **SMS OTP** | `POST /auth/phone/send-code`, `POST /auth/phone/verify` | Twilio via **httpx** when `TWILIO_*` set; else demo logs OTP. Rate limits + `phone_otps` table. |
| **Email** | `POST /notifications/email/send` | SendGrid v3 when `SENDGRID_*` set; else log-only demo. |
| **Push token storage** | `POST /notifications/push/register` | `device_tokens` table; FCM **send** not implemented (you add Firebase). |
| **External providers** | `docs/ARCHITECTURE.md` + webhook route | Configure `X-*-Signature` verification per vendor. |

## Core principles (diagram banner)

- **Security first:** TLS at the edge, secrets via env, password hashing (`passlib`); production still needs encryption-at-rest policy, DPA/GDPR flows, and vendor fraud monitors (AML already stubbed in Phase 1).  
- **Real-time:** WebSockets for bids and settlement events (`winner_allocated`, `payment_failed`, `payment_success`, `settlement_completed`).  
- **AI-driven insights:** Win probability + bid coach + **behavior-blend-v1** trust (replace with trained models).  
- **Fair & transparent:** Anti-sniping, reserve/no-bid outcomes, cascading allocation with explicit deadlines on `GET /auctions/{id}/settlement`.

## Gaps for a production cutover

1. Replace `X-User-Id` dev path with mandatory JWT + refresh rotation.  
2. Hook eKYC/AML/SMS vendors; set `seller_verified` from webhooks.  
3. Train and serve **win-probability** model; version the API field `model`.  
4. Connect **LLM** with tool-restricted market search + caching.  
5. Real **escrow** + PCI-scoped payments.  
6. Redis **pub/sub** (or Kafka) when API is multi-instance.  
