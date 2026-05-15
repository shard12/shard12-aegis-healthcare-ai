# Security

## Authentication

- JWT (14-day expiry) signed with `JWT_SECRET`
- Passwords hashed with bcrypt (min 8 characters)
- Google OAuth optional (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

## API

- Protected routes require `Authorization: Bearer <token>`
- CORS limited to configured frontend origins
- No secrets in client bundle — keys only in `backend/.env`

## Data

- JSON file database (`backend/data/aegis-db.json`) — suitable for dev/single-node; migrate to PostgreSQL for production
- Uploaded images stored under `backend/uploads/` with auth-gated access

## AI & PHI

- User profile fields injected into RAG context for triage — minimize sensitive data in prompts
- Third-party AI providers (Gemini, OpenRouter, etc.) process user text/images per their terms
- Telegram alerts contain incident summaries — configure private chats only

## Recommendations for production

1. Rotate `JWT_SECRET` and use strong random values
2. Enable HTTPS everywhere (reverse proxy)
3. Move DB to PostgreSQL with encryption at rest
4. Rate-limit `/api/ai/triage` and auth endpoints
5. Audit log retention for incident history
6. Never commit `.env` files

## Reporting

Report security issues to the project maintainer privately — do not open public issues with exploit details.
