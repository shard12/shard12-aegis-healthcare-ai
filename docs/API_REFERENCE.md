# API Reference

Base URL (dev): `http://localhost:8787/api`

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | JWT login |
| GET | `/auth/me` | Current user |
| PATCH | `/auth/profile` | Update medical profile |
| PATCH | `/auth/settings` | Telegram, language, accessibility |

## AI

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/triage` | Symptom triage → envelope + PDF + Telegram |
| POST | `/ai/chat` | Assistant chat |
| POST | `/ai/analyze-image` | Medical image scan |

## Emergency

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sos/dispatch` | SOS + Telegram + PDF |

## Hospitals

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| GET | `/hospitals` | `lat`, `lon` | Nearby facilities (OSM) |

## Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/history` | Triage history |
| GET | `/reports/images` | Image scan history |
| POST | `/pdf/triage` | Download triage PDF |
| POST | `/pdf/incident` | Incident PDF |
