# Features

## Risk Console

- Natural-language symptom input
- Multi-agent LLM pipeline (intent → risk → clinical summary)
- Rule-based **triage safeguards** (prevents mild cough → cardiac CRITICAL)
- Dashboard: risk glow, red flags, diagnoses, tests, actions, timeline
- Nearby hospitals on map with ETA
- PDF download / share; Telegram on emergency triage

## SOS Control Center

- One-tap dispatch with live GPS
- Telegram + email with medical profile and OSM hospitals
- Persistent SOS logs and PDF incident reports

## Medical Image Scanner

- Upload X-ray, MRI, CT, dermatology images
- Vision chain: Gemini → OpenRouter → Hugging Face fallbacks
- Structured findings + PDF report
- Telegram alert on high severity

## Hospitals (GEOINT)

- OpenStreetMap Overpass — no paid maps API
- Distance, drive ETA (~40 km/h average), trauma/cardiac tags
- Leaflet map with user + facility markers

## Profile

- Extended medical record: vitals, allergies, meds, insurance, emergency contacts
- Weighted **profile completion %** ring
- Modal editor; merged into AI RAG context for triage

## Medicines

- Reminder CRUD with Telegram activation flags

## Settings

- Language (i18n), dark mode, large text, Telegram chat IDs

## FastAPI v2

- `/api/v2/auth/register|login|me|profile`
- `/api/v2/ai/triage` with safeguards (rule-based; proxy to Node optional)
