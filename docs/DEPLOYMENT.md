# Deployment

## Development

| Service | Port | Command |
|---------|------|---------|
| Express API | 8787 | `cd backend && npm run dev` |
| React UI | 5173 | `cd frontend && npm run dev` |
| FastAPI v2 | 8000 | `cd backend-fastapi && uvicorn main:app --reload --port 8000` |

## Production build (frontend)

```bash
cd frontend
npm run build
# static output in frontend/dist
```

Serve `dist/` behind nginx/Caddy with `/api` proxied to the Node backend.

## Production API (Node)

```bash
cd backend
npm install --production
NODE_ENV=production node src/index.js
```

Set:

- `JWT_SECRET` — strong random string
- `FRONTEND_URL` — public SPA origin
- AI provider keys (see `.env.example`)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- Email SMTP if using SOS email

## FastAPI sidecar

Deploy FastAPI on port 8000 for gradual migration. It reads the same `aegis-db.json` as Express when paths align.

```bash
pip install -r backend-fastapi/requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Docker (outline)

1. Multi-stage build: frontend `npm run build` → copy to nginx image
2. Node backend image with volume for `data/` and `uploads/`
3. Optional FastAPI container sharing the data volume

## Health checks

- Express: `GET /api/health` (if configured) or root
- FastAPI: `GET /health`

## Reverse proxy example (nginx)

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:8787/api/;
}
location / {
  root /var/www/aegis/dist;
  try_files $uri /index.html;
}
```
