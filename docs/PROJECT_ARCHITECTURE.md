# AEGIS AI — Project Architecture

## Overview

AEGIS AI is an intelligent healthcare operating system combining AI triage, medical imaging analysis, emergency dispatch, and patient history in a dark, enterprise-grade UI.

## Current stack (v1 — production path)

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind + Framer Motion |
| API (active) | Node.js + Express |
| API (migration) | FastAPI (`backend-fastapi/`) |
| Data | JSON file DB (v1) → PostgreSQL (v2) |
| AI | Multi-provider chain: Ollama → Cloudflare → Cerebras → Together |
| Vision | Gemini / OpenRouter vision |
| Alerts | Telegram only |
| Maps | OpenStreetMap Overpass + Leaflet |

## Layout

- **Left sidebar** — primary navigation (Home, Scanner, Triage, SOS, Hospitals, etc.)
- **Top bar** — notifications + profile only (no duplicate nav links)

## Backend modules (Express)

```
backend/src/
├── controllers/   # HTTP handlers
├── services/      # AI, PDF, Telegram, vision, OSM
├── middleware/    # auth, rate limits, upload
├── database/      # JSON persistence
└── routes/        # API routing
```

## AI triage pipeline

1. Intent agent  
2. Summarizer  
3. Risk agent (symptom-aware prompts)  
4. Guidance agent  
5. Reply agent  
6. Emergency agent  
7. Merger → strict JSON envelope  
8. **Rule safeguards** (`triageSafeguards.js`) — prevents cough→chest pain hallucinations  

## Security

- JWT authentication  
- Helmet, CORS, rate limiting  
- Multer upload validation  
- No SMS/phone OTP (removed)  

## Migration roadmap

See `ROADMAP.md` for FastAPI + PostgreSQL + Next.js 15 phased migration.
