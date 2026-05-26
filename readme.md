
# Payment Processing System

A production-ready backend that simulates real-world payment gateway behavior — built with Node.js, Express, PostgreSQL (Sequelize), Redis, and BullMQ.

---

## Features

- Payment lifecycle — PENDING → PROCESSING → SUCCESS / FAILED
- Retry with exponential backoff (via BullMQ)
- Idempotency — no duplicate payments on repeated requests
- Distributed locking — no parallel processing of same payment
- External gateway simulation — random success, failure, delays, timeouts
- Webhook handling — deduplication, conflict resolution
- Circuit breaker — stops hammering a failing gateway
- Rate limiting — 20 requests per IP per 15 minutes
- Structured logging — Winston JSON logs
- JWT authentication

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Sequelize |
| Cache / Lock | Redis (ioredis) |
| Queue | BullMQ |
| Auth | JWT |
| Logging | Winston |
| Circuit Breaker | opossum |
| Validation | Joi |
| Rate Limiting | express-rate-limit |

---

## Folder Structure

```
payment-gateway/
│
├── src/
│   ├── config/
│   │   ├── database.js         # Sequelize-CLI config
│   │   ├── db.js               # Sequelize singleton instance
│   │   ├── redis.js            # ioredis client
│   │   └── queue.js            # BullMQ queue instances
│   │
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 20240101000001-create-users.js
│   │   │   ├── 20240101000002-create-payments.js
│   │   │   ├── 20240101000003-create-payment-logs.js
│   │   │   └── 20240101000004-create-webhook-events.js
│   │   └── seeders/
│   │       └── 20240101000001-demo-users.js
│   │
│   ├── models/
│   │   ├── index.js            # Model registry + associations
│   │   ├── User.js
│   │   ├── Payment.js
│   │   ├── PaymentLog.js
│   │   └── WebhookEvent.js
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   └── auth.routes.js
│   │   └── payment/
│   │       ├── payment.routes.js
│   │       ├── payment.controller.js
│   │       ├── payment.service.js
│   │       ├── payment.repository.js
│   │       └── payment.validator.js
│   │
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   ├── validate.js         # Joi validation factory
│   │   ├── errorHandler.js     # Centralized error handler
│   │   └── rateLimiter.js      # express-rate-limit
│   │
│   ├── workers/
│   │   ├── payment.worker.js   # Processes payment jobs
│   │   └── webhook.worker.js   # Processes webhook jobs
│   │
│   ├── gateway/
│   │   └── gatewaySimulator.js # Simulates external gateway
│   │
│   ├── utils/
│   │   ├── logger.js           # Winston logger
│   │   ├── idempotency.js      # Redis idempotency cache
│   │   ├── lock.js             # Redis distributed lock
│   │   └── circuitBreaker.js   # opossum circuit breaker
│   │
│   └── app.js                  # Entry point
│
├── .sequelizerc                # CLI path config
├── .env                        # Environment variables
├── docker-compose.yml          # Postgres + Redis
└── package.json
```

---

## Prerequisites

Make sure these are installed on your machine:

- [Node.js](https://nodejs.org/) >= 18
- [Docker](https://www.docker.com/) (for Postgres + Redis)
- npm >= 9

---

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payment_db
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=token_key
JWT_EXPIRES_IN=7d

# Payment Config
PAYMENT_LOCK_TTL=30
MAX_RETRIES=3
RETRY_BASE_DELAY_MS=1000

# Gateway Simulator
GATEWAY_TIMEOUT_MS=5000
GATEWAY_FAILURE_RATE=0.3
```

---

## Setup & Installation

### Step 1 — Clone the repo

```bash
git clone https://github.com/your-username/payment-gateway.git
cd payment-gateway
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Start Postgres and Redis via Docker

```bash
docker-compose up -d
```

Verify containers are running:

```bash
docker ps
```

You should see `postgres` and `redis` containers running.

### Step 4 — Run database migrations

```bash
npx sequelize-cli db:migrate
```

### Step 5 — Seed demo users

```bash
npx sequelize-cli db:seed:all
```

This creates two users:

| Name | Email | Password |
|---|---|---|
| Aman Sharma | aman@example.com | password123 |
| Test User | test@example.com | password123 |

### Step 6 — Start the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:3000`

---

## API Reference

### Auth

#### Register
```
POST /api/auth/register
```
```json
{
  "name": "Aman Sharma",
  "email": "aman@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "aman@example.com"
  }
}
```

---

#### Login
```
POST /api/auth/login
```
```json
{
  "email": "aman@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Payments

> All payment routes require `Authorization: Bearer <token>` header.

#### Initiate Payment
```
POST /api/payments
```
```json
{
  "amount": 999.00,
  "currency": "INR",
  "idempotencyKey": "order-abc-12345",
  "metadata": {
    "orderId": "abc-12345",
    "productId": "prod-001"
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "amount": "999.00",
    "currency": "INR",
    "status": "PENDING",
    "idempotencyKey": "order-abc-12345",
    "retryCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### Get Payment by ID
```
GET /api/payments/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "amount": "999.00",
    "currency": "INR",
    "status": "SUCCESS",
    "gatewayRef": "GW-ABC123456789",
    "retryCount": 2,
    "logs": [
      { "event": "PAYMENT_INITIATED", "details": {}, "createdAt": "..." },
      { "event": "PAYMENT_PROCESSING", "details": { "attempt": 1 }, "createdAt": "..." },
      { "event": "PAYMENT_RETRY_SCHEDULED", "details": { "nextAttempt": 2 }, "createdAt": "..." },
      { "event": "PAYMENT_SUCCESS", "details": { "gatewayRef": "GW-ABC123456789" }, "createdAt": "..." }
    ]
  }
}
```

---

#### List Payments (paginated)
```
GET /api/payments?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "payments": [...],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

---

### Webhooks

#### Receive Gateway Callback
```
POST /api/payments/webhooks/payment
```
```json
{
  "paymentId": "uuid",
  "eventType": "payment.success",
  "payload": {
    "gatewayRef": "GW-ABC123456789"
  }
}
```

**Response:**
```json
{
  "success": true,
  "received": true,
  "webhookEventId": "uuid"
}
```

---

## Retry Flow

```
Attempt 1 → FAIL → wait 1s
Attempt 2 → FAIL → wait 2s
Attempt 3 → FAIL → wait 4s → PERMANENTLY FAILED
```

Configured via `.env`:
```env
MAX_RETRIES=3
RETRY_BASE_DELAY_MS=1000
```

---

## Health Check

```
GET /health
```
```json
{ "status": "ok" }
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start in production mode |
| `npm run migrate` | Run all pending migrations |
| `npm run migrate:undo` | Undo all migrations |
| `npm run seed` | Seed demo data |

---

## Docker Compose Services

| Service | Port | Purpose |
|---|---|---|
| postgres | 5432 | Primary database |
| redis | 6379 | Locks + queue + idempotency cache |

---

## Key Design Decisions

| Concern | Solution |
|---|---|
| Duplicate requests | Redis idempotency cache + DB unique constraint on idempotencyKey |
| Parallel processing | Redis distributed lock (SET NX EX) |
| Retries | BullMQ exponential backoff |
| Gateway failures | Circuit breaker (opossum) |
| Duplicate webhooks | dedupKey unique constraint in DB |
| Conflicting webhooks | Check terminal state before applying update |
| Audit trail | Append-only PaymentLog table |
| Scalability | Workers run independently, queue-backed |

---

## Notes

- `GATEWAY_FAILURE_RATE=0.3` means 30% of gateway calls will randomly fail (for testing)
- Sending the same `idempotencyKey` twice returns the same payment — no duplicate created
- Workers start automatically with the server in development
- In production, run workers as separate processes for independent scaling
