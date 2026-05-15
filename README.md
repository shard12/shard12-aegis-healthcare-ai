# AEGIS AI Healthcare OS

A dark, futuristic medical operating system for **AI triage**, **emergency dispatch**, **medical imaging**, and **geo-routed hospital discovery** — built as a full-stack React + Node.js platform with a FastAPI v2 migration path.

![Stack](https://img.shields.io/badge/React-18-61DAFB) ![Node](https://img.shields.io/badge/Express-8787-339933) ![FastAPI](https://img.shields.io/badge/FastAPI-v2-009688)

## Features

| Module | Description |
|--------|-------------|
| **Risk Console** | Multi-agent LLM triage with safeguards, PDF reports, Telegram alerts, dashboard cards |
| **SOS** | One-tap dispatch with GPS, profile, and nearby hospitals |
| **Medical Scanner** | Vision AI analysis (Gemini / OpenRouter) with PDF + Telegram on high severity |
| **Hospitals** | OpenStreetMap Overpass lookup, map markers, distance + ETA |
| **Profile** | Full medical profile editor with weighted completion % |
| **Medicines** | Reminder scheduling with Telegram hooks |

## Quick start

### Prerequisites

- Node.js 20+
- Python 3.11+ (optional, for FastAPI v2)
- API keys in `backend/.env` (see `backend/.env.example`)

### 1. Backend (Express — primary)

```bash
cd backend
npm install
cp .env.example .env   # edit keys
npm run dev            # http://localhost:8787
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Vite proxies `/api` → `http://localhost:8787`.

### 3. FastAPI v2 (optional)

```bash
cd backend-fastapi
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Auth and triage: `/api/v2/auth/*`, `/api/v2/ai/triage`. Shares `backend/data/aegis-db.json` with Express.

## Project structure

```
medibot-ai/
├── frontend/          # React + Vite + Tailwind
├── backend/           # Express API (active)
├── backend-fastapi/   # FastAPI v2 (auth + triage)
└── docs/              # Architecture, API, security, deployment
```

## Documentation

- [Project architecture](docs/PROJECT_ARCHITECTURE.md)
- [AI pipeline](docs/AI_PIPELINE.md)
- [API reference](docs/API_REFERENCE.md)
- [Features](docs/FEATURES.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Roadmap](docs/ROADMAP.md)

## Environment highlights

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Auth tokens (Express + FastAPI) |
| `GEMINI_API_KEY` | Vision + text AI |
| `TELEGRAM_BOT_TOKEN` | Emergency alerts |
| `CF_ACCOUNT_ID` / `CEREBRAS_API_KEY` | AI provider chain |

## Disclaimer

AEGIS AI provides **decision support only** — not a substitute for licensed medical care. In emergencies, call your local emergency number.

## License

Proprietary — all rights reserved unless otherwise noted.
