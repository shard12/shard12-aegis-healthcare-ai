# Database schema

AEGIS uses a JSON document store at `backend/data/aegis-db.json` (Express and FastAPI v2).

## Top-level collections

| Key | Description |
|-----|-------------|
| `users` | Accounts, profiles, settings |
| `histories` | Triage / SOS incident log |
| `reports` | Generated PDF metadata |
| `medicineReminders` | User medicine schedules |
| `chatThreads` | Chat / triage message log |
| `sosLogs` | SOS dispatch records |
| `smsAlerts` | Legacy SMS log (deprecated) |

## User object

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "passwordHash": "bcrypt…",
  "name": "Operator",
  "avatarUrl": "",
  "googleId": "",
  "profile": {
    "gender": "",
    "bloodGroup": "O+",
    "dob": "",
    "heightCm": "",
    "weightKg": "",
    "allergies": [],
    "medications": [],
    "conditions": [],
    "emergencyContacts": [],
    "insuranceProvider": "",
    "insuranceId": "",
    "medicalHistory": "",
    "notes": ""
  },
  "settings": {
    "language": "en",
    "darkMode": true,
    "largeText": false,
    "vibrations": true,
    "telegramChatId": "",
    "telegramGroupId": "",
    "alertEmail": "",
    "alertPhone": ""
  },
  "createdAt": "ISO-8601"
}
```

## History entry

```json
{
  "id": "uuid",
  "userId": "uuid",
  "createdAt": "ISO-8601",
  "title": "AI triage",
  "risk": "HIGH",
  "telegramStatus": "sent",
  "emailStatus": "skipped",
  "summary": "…",
  "payload": { },
  "location": { "lat": 0, "lng": 0 },
  "incidentId": "INC-…",
  "reportPdfUrl": "/uploads/reports/…"
}
```

## Migration path

PostgreSQL tables should mirror these shapes with `user_id` foreign keys and JSONB `payload` columns for envelope storage.
