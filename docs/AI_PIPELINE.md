# AI Pipeline

## Triage flow

```
User symptoms + RAG (profile, allergies, history)
        ↓
Multi-agent LLM pipeline (6 steps + merge)
        ↓
normalizeEnvelope()
        ↓
applyTriageSafeguards()  ← rule-based caps/downgrades
        ↓
PDF + Telegram (if HIGH/CRITICAL) + history save
```

## Safeguards (examples)

| Input | Without safeguards | With safeguards |
|-------|-------------------|-----------------|
| "cough" | May escalate to chest emergency | LOW/MEDIUM, respiratory category |
| "crushing chest pain" | HIGH | HIGH + emergency |

## Vision flow

```
Upload image → Gemini 2.5 / OpenRouter vision
        ↓
Structured JSON (observations + finding_screen)
        ↓
PDF report + Telegram if High
```

## Provider fallback

Each LLM call uses `generateAIResponse()` with 4s timeout, 2 retries per provider, full-chain JSON fallback if all fail.
