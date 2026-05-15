import { appendChat, recentChats, addHistoryEntry, findUserById } from '../database/db.js';
import { runAgentPipeline, offlineEnvelope } from '../services/aiService.js';
import { hasConfiguredAiProviders } from '../services/aiManager.js';
import { config } from '../config/index.js';
import { completeTriageDispatch } from '../services/triageService.js';

function buildRag(user) {
  const profile = user?.profile || {};
  const hist = recentChats(user.id, 20)
    .map((c) => `${c.role}: ${c.content}`)
    .join('\n');
  return [
    `Allergies: ${(profile.allergies || []).join(', ')}`,
    `Medications: ${(profile.medications || []).join(', ')}`,
    `Conditions: ${(profile.conditions || []).join(', ')}`,
    `Blood group: ${profile.bloodGroup || ''}`,
    `Notes: ${profile.notes || ''}`,
    `Recent chat:\n${hist}`,
  ].join('\n');
}

export async function triage(req, res) {
  try {
    const { message, lat, lng, language: bodyLang, accuracy, tracking } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    const user = findUserById(req.user.sub);
    if (!user) return res.status(401).json({ error: 'User not found — sign in again' });
    const language = bodyLang || user?.settings?.language || 'en';
    const rag = buildRag(user);

    const hasKey = hasConfiguredAiProviders();
    let envelope;
    let ai = { status: 'online', detail: null };
    if (!hasKey) {
      envelope = offlineEnvelope(message, language);
      ai = {
        status: 'no_keys',
        detail:
          'No AI providers configured. Enable Ollama locally, or set CF_ACCOUNT_ID+CF_API_TOKEN, CEREBRAS_API_KEY, and/or TOGETHER_API_KEY in backend/.env (see .env.example).',
      };
    } else {
      try {
        envelope = await runAgentPipeline({ userText: message, ragContext: rag, language });
      } catch (e) {
        console.error('[AEGIS-AI] triage pipeline error:', e?.message || e);
        envelope = offlineEnvelope(message, language);
        ai = {
          status: 'offline',
          detail:
            config.nodeEnv === 'production'
              ? 'All configured AI providers failed. Check server logs and HTTPS_PROXY if behind a corporate proxy.'
              : String(e?.message || e),
        };
      }
    }

    appendChat(user.id, 'assistant', JSON.stringify(envelope), { kind: 'triage' });

    let dispatch = {
      incidentId: null,
      reportPdfUrl: null,
      reportFilename: null,
      telegramStatus: 'skipped',
      emailStatus: 'skipped',
    };
    try {
      dispatch = await completeTriageDispatch(req, {
        user,
        envelope,
        message,
        lat,
        lng,
        accuracy,
        emergencyFlag: envelope.emergency_triggered,
        tracking,
      });
    } catch (e) {
      console.error('[AEGIS-TRIAGE] post-dispatch failed (non-fatal):', e?.message || e);
    }

    const history = addHistoryEntry(user.id, {
      title: envelope.intent || 'AI triage',
      risk: envelope.risk_level,
      telegramStatus: dispatch.telegramStatus,
      emailStatus: dispatch.emailStatus,
      summary: envelope.medical_summary,
      payload: envelope,
      location: lat && lng ? { lat, lng } : null,
      incidentId: dispatch.incidentId,
      reportPdfUrl: dispatch.reportPdfUrl,
      reportFilename: dispatch.reportFilename,
      reportViewUrl: dispatch.reportViewUrl,
      reportAccessToken: dispatch.reportAccessToken,
    });

    res.json({
      envelope,
      alerts: { telegramStatus: dispatch.telegramStatus, emailStatus: dispatch.emailStatus },
      historyId: history.id,
      ai,
      report: {
        incidentId: dispatch.incidentId,
        url: dispatch.reportPdfUrl,
        filename: dispatch.reportFilename,
        viewUrl: dispatch.reportViewUrl,
        accessToken: dispatch.reportAccessToken,
        pdfError: dispatch.pdfError,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function chat(req, res) {
  try {
    const { message, language: bodyLang } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    const user = findUserById(req.user.sub);
    if (!user) return res.status(401).json({ error: 'User not found — sign in again' });
    const language = bodyLang || user?.settings?.language || 'en';
    const rag = buildRag(user);
    appendChat(user.id, 'user', message, { kind: 'chat' });
    const hasKey = hasConfiguredAiProviders();
    let envelope;
    let ai = { status: 'online', detail: null };
    if (!hasKey) {
      envelope = offlineEnvelope(message, language);
      ai = {
        status: 'no_keys',
        detail:
          'No AI providers configured. Enable Ollama locally, or set CF_ACCOUNT_ID+CF_API_TOKEN, CEREBRAS_API_KEY, and/or TOGETHER_API_KEY in backend/.env.',
      };
    } else {
      try {
        envelope = await runAgentPipeline({ userText: message, ragContext: rag, language });
      } catch (e) {
        console.error('[AEGIS-AI] chat pipeline error:', e?.message || e);
        envelope = offlineEnvelope(message, language);
        ai = {
          status: 'offline',
          detail: config.nodeEnv === 'production' ? 'all_providers_failed' : String(e?.message || e),
        };
      }
    }
    appendChat(user.id, 'assistant', envelope.suggested_response, { kind: 'chat', envelope });
    res.json({ reply: envelope.suggested_response, envelope, ai });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
