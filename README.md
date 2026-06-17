<div align="center">

# 🚀 Production-Grade Node.js Backend with Full Observability

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-FF4438?style=for-the-badge&logo=redis&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/OpenTelemetry-000000?style=for-the-badge&logo=opentelemetry&logoColor=white" />
  <img src="https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white" />
  <img src="https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white" />
  <img src="https://img.shields.io/badge/Tempo-F46800?style=for-the-badge&logo=grafana&logoColor=white" />
  <img src="https://img.shields.io/badge/Loki-F46800?style=for-the-badge&logo=grafana&logoColor=white" />
</p>

<p align="center">
  <strong>A fully observable, production-ready REST API demonstrating the three pillars of observability — Logs, Metrics, and Traces — wired end-to-end in a real Node.js application.</strong>
</p>

</div>

---

## 📌 What Is This?

This is not a tutorial project. This is how backend systems are built and monitored in **real production environments**.

Most backend projects show you how to build an API. This one shows you how to **understand what your API is doing at all times** — even when things go wrong at 3 AM. It implements the complete **O11y (Observability) stack** alongside a fully functional REST API with authentication, caching, rate limiting, and database access.

---

## 🏗️ Architecture Overview

```
                          ┌─────────────────────────────────┐
                          │        Express REST API          │
                          │  (TypeScript + Node.js)          │
                          └────────────┬────────────────────┘
                                       │
              ┌────────────────────────┼──────────────────────────┐
              │                        │                          │
     ┌────────▼────────┐    ┌─────────▼────────┐    ┌───────────▼──────────┐
     │   PostgreSQL     │    │      Redis        │    │  OpenTelemetry SDK   │
     │  (NeonDB/Cloud)  │    │  Cache + Rate     │    │  Auto-Instrumented   │
     │  Primary DB      │    │  Limiter          │    │  Traces → Tempo      │
     └─────────────────┘    └──────────────────┘    └──────────────────────┘
                                                                │
                                          ┌─────────────────────┼──────────────────────┐
                                          │                     │                      │
                                 ┌────────▼──────┐   ┌─────────▼──────┐   ┌──────────▼──────┐
                                 │     Pino       │   │  prom-client   │   │  OTLP Exporter  │
                                 │  Structured    │   │   Prometheus   │   │  Traces via     │
                                 │  JSON Logs     │   │   Metrics      │   │  HTTP :4318     │
                                 └───────┬────────┘   └───────┬────────┘   └──────────┬──────┘
                                         │                    │                       │
                                  ┌──────▼──────┐     ┌───────▼───────┐      ┌───────▼──────┐
                                  │    Loki      │     │  Prometheus   │      │    Tempo     │
                                  │  Log Store   │     │  Metrics DB   │      │  Trace Store │
                                  └──────┬──────┘     └───────┬───────┘      └───────┬──────┘
                                         └──────────────┬──────┘                     │
                                                        │◄───────────────────────────┘
                                                 ┌──────▼──────┐
                                                 │   Grafana   │
                                                 │  Dashboard  │
                                                 └─────────────┘
```

---

## 🔭 The Three Pillars of Observability

### 📋 1. Logs — Structured JSON with Pino

Logs are the first thing you reach for when something breaks. This project uses **Pino** — the fastest Node.js logger — to emit structured JSON logs that are machine-readable and instantly queryable in Loki.

Every log line carries:

| Field | Purpose |
|---|---|
| `trace_id` | Links the log to a distributed trace in Tempo |
| `span_id` | Links the log to the exact span within a trace |
| `requestId` | Correlates all logs for a single HTTP request |
| `method` + `route` | Know exactly which endpoint generated the log |
| `level` | Filter by severity (debug / info / warn / error) |
| `service` + `environment` | Essential for multi-service deployments |

```json
{
  "level": 30,
  "time": 1718000000000,
  "service": "express-production-backend",
  "environment": "production",
  "requestId": "65850b8c-916a-442f-9049-6f95c7dbbddf",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "event": "request_completed",
  "statusCode": 200,
  "duration_ms": 12,
  "msg": "Request completed"
}
```

> Logs are shipped to **Grafana Loki** via **Grafana Alloy**, where you can filter, search, and correlate them with traces in a single click.

---

### 📊 2. Metrics — Prometheus + prom-client

Metrics answer the question: **"Is my system healthy right now?"**

This project exposes a `/metrics` endpoint in Prometheus format with the following custom metrics:

| Metric | Type | What It Tells You |
|---|---|---|
| `http_requests_total` | Counter | Total requests by method, route, status code |
| `http_request_duration_seconds` | Histogram | Latency percentiles (p50, p95, p99) per route |
| `http_requests_active` | Gauge | Real-time in-flight request count |
| `db_query_duration_seconds` | Histogram | How long each DB operation takes |
| `redis_operation_duration_seconds` | Histogram | Cache hit/miss latency |
| `errors_total` | Counter | Error rates by type and route |
| `user_activity_total` | Counter | Business-level events (register, login, update) |

Plus all default Node.js system metrics: **CPU, memory, event loop lag, GC pauses, heap usage**.

> Prometheus scrapes `/metrics` every 15s. Grafana visualizes them as dashboards with alerts.

---

### 🔍 3. Traces — OpenTelemetry + Grafana Tempo

Traces answer the question: **"Where did the time go in this request?"**

This project uses the **OpenTelemetry Node.js SDK** with auto-instrumentation — meaning every HTTP request, PostgreSQL query, and Redis operation is automatically wrapped in a span with zero manual code needed for the infrastructure layer.

**What gets traced automatically:**
- Every incoming HTTP request → span with method, route, status code
- Every `pg` query → span with SQL statement and duration
- Every Redis `GET`/`SET`/`DEL` → span with key and duration
- Outbound HTTP calls via Node's `http`/`https` module

**What gets traced manually (in controllers):**
- `user-register` span with `user.email`, `user.id` attributes
- `user-login` span with `login.success` boolean
- `get-profile`, `update-profile` spans with `user.id`

All spans are exported via **OTLP HTTP** to **Grafana Tempo**, where you can visualize the full request waterfall and jump from a trace directly to the correlated logs in Loki.

---

## 🗄️ Databases & Their Production Purpose

### PostgreSQL (via NeonDB)

**Why PostgreSQL?**

PostgreSQL is the most battle-tested relational database in the world. It's used by companies like Instagram, Notion, and GitHub at massive scale.

**Why NeonDB specifically?**
- Serverless PostgreSQL — scales to zero when idle, scales up instantly under load
- Built-in connection pooling — critical for Node.js which creates many short-lived connections
- SSL by default — secure in transit without extra config
- Branching — create isolated DB branches for testing, like Git for your database

**What it stores:**
- `users` table — persistent user records with hashed passwords, roles, and activity timestamps
- All writes go through parameterized queries to prevent SQL injection

---

### Redis (Cache + Rate Limiter)

Redis serves two distinct production purposes in this project:

**1. Cache-Aside Pattern**

```
Request → Check Redis → HIT  → Return cached user (< 1ms)
                      → MISS → Query PostgreSQL → Store in Redis (TTL: 1hr) → Return
```

`GET /profile` hits Redis first. Only on a cache miss does it query PostgreSQL. This reduces DB load dramatically under traffic — especially important with serverless databases that have cold-start latency.

**2. Distributed Rate Limiting**

Redis stores per-IP request counters with TTL-based expiry windows:
- `/register` — max 10 requests per minute per IP
- `/login` — max 20 requests per minute per IP

Using Redis for rate limiting (vs in-memory) means it works correctly across **multiple server instances** — essential for horizontally scaled deployments.

---

## 🔐 Security Features

- **JWT Authentication** — stateless auth with role-based access control (`user`, `admin`, `moderator`)
- **Password Hashing** — bcrypt with salt rounds
- **Helmet** — sets secure HTTP headers (XSS protection, HSTS, content-type sniffing prevention)
- **CORS** — configurable cross-origin policy
- **Input Validation** — Zod schemas on all request bodies, validated before hitting the controller
- **Rate Limiting** — Redis-backed, per-IP brute-force protection on auth routes

---

## 📁 Project Structure

```
src/
├── config/
│   ├── database.ts       # PostgreSQL pool configuration
│   ├── redis.ts          # Redis client setup
│   ├── logger.ts         # Pino logger (console + file transport)
│   ├── metrics.ts        # Prometheus metrics registry
│   └── tracer.ts         # OpenTelemetry SDK initialization
├── controllers/
│   └── user.controller.ts  # Request handlers with manual spans
├── middlewares/
│   ├── instrumentation.middleware.ts  # Attaches trace_id/span_id to every log
│   ├── auth.middleware.ts             # JWT verification + RBAC
│   ├── rate-limit.middleware.ts       # Redis-backed rate limiter
│   ├── validation.middleware.ts       # Zod schema validation
│   └── error.middleware.ts            # Global error handler
├── services/
│   ├── user.service.ts   # Business logic + Redis cache-aside
│   └── redis.service.ts  # Redis abstraction with metrics
├── models/
│   └── user.model.ts     # TypeScript types + DTOs
├── routes/
│   └── user.routes.ts    # Route definitions with middleware chains
├── instrument.ts         # OTel bootstrap — loaded before app via -r flag
├── otel-loader.ts        # ESM module hook for OTel auto-instrumentation
└── app.ts                # Express app setup + server bootstrap
```

---

## 🛠️ Tech Stack

| Category | Technology | Why |
|---|---|---|
| Runtime | Node.js | Non-blocking I/O, massive ecosystem |
| Language | TypeScript | Type safety, better DX, catches bugs at compile time |
| Framework | Express v5 | Minimal, flexible, production-proven |
| Primary DB | PostgreSQL (NeonDB) | ACID compliance, complex queries, relational integrity |
| Cache / Rate Limit | Redis | Sub-millisecond reads, TTL support, atomic operations |
| Logs | Pino + Loki | Fastest Node.js logger, log aggregation at scale |
| Metrics | prom-client + Prometheus | Industry standard, pull-based scraping |
| Traces | OpenTelemetry + Tempo | Vendor-neutral, distributed tracing standard |
| Visualization | Grafana | Unified dashboard for logs + metrics + traces |
| Log Shipping | Grafana Alloy | Tail logs from file → ship to Loki |
| Validation | Zod | Runtime schema validation with TypeScript inference |
| Auth | JWT + bcrypt | Stateless auth, secure password storage |

---

## 🚦 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/register` | ❌ | Register new user (rate limited: 10/min) |
| `POST` | `/api/v1/login` | ❌ | Login + get JWT (rate limited: 20/min) |
| `GET` | `/api/v1/profile` | ✅ JWT | Get own profile (Redis cached) |
| `PUT` | `/api/v1/profile` | ✅ JWT | Update profile (invalidates cache) |
| `GET` | `/api/v1/users` | ✅ Admin | List all users |
| `GET` | `/health` | ❌ | Health check with uptime |
| `GET` | `/metrics` | ❌ | Prometheus metrics scrape endpoint |

---

## ⚡ Getting Started

### Prerequisites
- Node.js 18+
- Redis running on `localhost:6379`
- PostgreSQL database (or a free [NeonDB](https://neon.tech) instance)

### Installation

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
npm install
```

### Environment Variables

```env
PORT=3000
NODE_ENV=development

# PostgreSQL
DATABASE_URL_NEON=postgresql://user:password@host/dbname?sslmode=require

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# OpenTelemetry
OTEL_SERVICE_NAME=express-production-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Run

```bash
npm run dev
```

---

## 🧠 Why This Matters in Production

> "You can't fix what you can't see."

In production, things break in ways you never anticipated. A query starts taking 2 seconds instead of 2ms. An endpoint starts throwing 500s for one specific user. Memory grows slowly over 6 hours and then the process crashes.

Without observability, you're blind. With it:

- **Logs** tell you *what* happened and *which user* it happened to
- **Metrics** tell you *how often* it's happening and whether it's getting worse
- **Traces** tell you *exactly where* in the code the time was spent

This project demonstrates all three, correlated together — the same `trace_id` that appears in a log line will take you directly to the trace waterfall in Tempo, showing you the PostgreSQL query that caused the slowdown.

That's production observability.

---

<div align="center">

Built with 🔥 by someone who cares about what happens after `git push`

</div>
