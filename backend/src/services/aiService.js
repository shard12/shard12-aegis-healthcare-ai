/**
 * AEGIS multi-agent triage pipeline.
 *
 * Each "agent" step is a single LLM call routed through `generateAIResponse()` (see services/aiManager.js),
 * which implements sequential multi-vendor fallback (Ollama → Cloudflare → Cerebras → Together),
 * per-provider timeout (4s), one automatic retry per provider on failure, and JSON fallbacks if the
 * entire chain fails — so this module never assumes a specific vendor is available.
 */

import { generateAIResponse } from './aiManager.js';
import { applyTriageSafeguards } from './triageSafeguards.js';

const STRICT_SCHEMA = `You must respond with ONLY valid JSON matching this shape (no markdown):
{
  "intent": "",
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "emergency_category": "",
  "medical_summary": "",
  "possible_concerns": [],
  "probable_conditions": [],
  "recommendations": [],
  "immediate_actions": [],
  "escalation_advice": "",
  "suggested_response": "",
  "recommended_action": "",
  "rag_context_used": "",
  "emergency_triggered": false,
  "telegram_alert": "",
  "confidence_score": 0.0,
  "confidence": 0,
  "why_this_risk": ""
}`;

/**
 * Minimal JSON fragments returned only if every provider fails for that sub-call.
 * Keeps `safeParseJson` + merger logic from collapsing the whole pipeline.
 */
const AGENT_FALLBACKS = {
  intent: '{"intent":"general_assessment"}',
  summary: '{"medical_summary":"Automated summary temporarily degraded; seek clinical assessment if concerned."}',
  risk: '{"risk_level":"MEDIUM","why_this_risk":"Automated risk scoring degraded","confidence_score":0.4}',
  guidance:
    '{"recommended_action":"If symptoms are severe or worsening, contact local emergency services or urgent care.","possible_concerns":["Unverified presentation"]}',
  reply:
    '{"suggested_response":"Automated guidance is temporarily limited. If this may be an emergency, call your local emergency number now."}',
  emergency: '{"emergency_triggered":false,"telegram_alert":""}',
  merger: JSON.stringify({
    intent: 'degraded_pipeline',
    risk_level: 'MEDIUM',
    severity: 'MEDIUM',
    emergency_category: 'Unavailable',
    medical_summary: 'Partial automated triage: one or more model steps used conservative JSON fallback.',
    possible_concerns: ['Presentation not fully analysed by available models'],
    probable_conditions: ['Unverified presentation'],
    recommendations: ['Seek clinician review if concerned'],
    immediate_actions: ['Call emergency services if severe or worsening symptoms'],
    escalation_advice: 'Provider chain could not complete every sub-agent call with live models.',
    suggested_response:
      'AEGIS could not reach every AI backend step. If this feels urgent, call local emergency services. Otherwise seek routine clinical review.',
    recommended_action:
      'Seek in-person care for severe symptoms, altered consciousness, breathing difficulty, chest pain, stroke signs, heavy bleeding, or major trauma.',
    rag_context_used: 'Fallback composition',
    emergency_triggered: false,
    telegram_alert: '',
    confidence_score: 0.35,
    confidence: 35,
    why_this_risk: 'Provider chain could not complete every sub-agent call with live models.',
  }),
};

function safeParseJson(text) {
  try {
    const cleaned = text.replace(/```json|```/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('no json');
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeEnvelope(raw, fallbackIntent) {
  const risk = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(raw?.risk_level || '').toUpperCase())
    ? String(raw.risk_level).toUpperCase()
    : 'MEDIUM';
  const sev = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(raw?.severity || '').toUpperCase())
    ? String(raw.severity).toUpperCase()
    : risk;
  const score = typeof raw?.confidence_score === 'number' ? Math.min(1, Math.max(0, raw.confidence_score)) : 0.65;
  const confInt =
    typeof raw?.confidence === 'number'
      ? raw.confidence > 1
        ? Math.round(Math.min(100, raw.confidence))
        : Math.round(raw.confidence * 100)
      : Math.round(score * 100);
  const probs = Array.isArray(raw?.probable_conditions)
    ? raw.probable_conditions.map(String)
    : Array.isArray(raw?.possible_concerns)
      ? raw.possible_concerns.map(String)
      : [];
  const recs = Array.isArray(raw?.recommendations) ? raw.recommendations.map(String) : [];
  const acts = Array.isArray(raw?.immediate_actions) ? raw.immediate_actions.map(String) : [];

  const base = {
    intent: String(raw?.intent || fallbackIntent || 'general'),
    risk_level: risk,
    severity: sev,
    emergency_category: String(raw?.emergency_category || raw?.intent || 'General'),
    medical_summary: String(raw?.medical_summary || ''),
    possible_concerns:
      probs.length > 0
        ? probs
        : Array.isArray(raw?.possible_concerns)
          ? raw.possible_concerns.map(String)
          : [],
    probable_conditions: probs,
    recommendations: recs.length ? recs : raw?.recommended_action ? [String(raw.recommended_action)] : [],
    immediate_actions: acts,
    escalation_advice: String(raw?.escalation_advice || raw?.why_this_risk || ''),
    suggested_response: String(raw?.suggested_response || ''),
    recommended_action: String(raw?.recommended_action || ''),
    rag_context_used: String(raw?.rag_context_used || ''),
    emergency_triggered: Boolean(raw?.emergency_triggered),
    telegram_alert: String(raw?.telegram_alert || ''),
    confidence_score: score,
    confidence: confInt,
    why_this_risk: String(raw?.why_this_risk || ''),
  };
  if (base.risk_level === 'CRITICAL' || base.risk_level === 'HIGH') base.emergency_triggered = true;
  return base;
}

function outputLanguageDirective(lang) {
  const code = String(lang || 'en').toLowerCase().slice(0, 5);
  if (!code || code === 'en') return '';
  const names = {
    hi: 'Hindi',
    kn: 'Kannada',
    ta: 'Tamil',
    te: 'Telugu',
    mr: 'Marathi',
    zh: 'Simplified Chinese (Mandarin)',
    ja: 'Japanese',
  };
  const label = names[code] || `the user interface language for locale code "${code}"`;
  return `IMPORTANT: Every user-facing text value you output inside JSON (including medical_summary, suggested_response, recommended_action, possible_concerns, probable_conditions, recommendations, immediate_actions, escalation_advice, emergency_category, why_this_risk, telegram_alert, intent) MUST be written in ${label}. JSON property keys must stay in English. `;
}

/**
 * One LLM completion for a pipeline step — routed through the multi-provider stack.
 *
 * @param {string} system
 * @param {string} user
 * @param {string} [language]
 * @param {'intent'|'summary'|'risk'|'guidance'|'reply'|'emergency'|'merger'} [fallbackKey]
 */
async function llmComplete(system, user, language = 'en', fallbackKey = 'merger') {
  const langPrefix = outputLanguageDirective(language);
  const messages = [
    { role: 'system', content: langPrefix + system },
    { role: 'user', content: user },
  ];
  const fallbackJson = AGENT_FALLBACKS[fallbackKey] || AGENT_FALLBACKS.merger;
  return await generateAIResponse({ messages, fallbackJson });
}

export async function runAgentPipeline({ userText, ragContext, language = 'en' }) {
  const rag = String(ragContext || '').slice(0, 12000);

  const intent = await llmComplete(
    'You are the Intent Agent for AEGIS AI emergency healthcare OS. Classify user intent in one short phrase.',
    `User message:\n${userText}\n\nContext:\n${rag}\nReturn JSON: {"intent":""}`,
    language,
    'intent'
  );

  const summary = await llmComplete(
    'You are the Summarizer Agent. Summarize clinically relevant facts only. No diagnosis.',
    `User message:\n${userText}\n\nContext:\n${rag}\nReturn JSON: {"medical_summary":""}`,
    language,
    'summary'
  );

  const risk = await llmComplete(
    'You are the Risk Agent. Assess urgency ONLY from stated symptoms. Do NOT invent chest pain, stroke, or cardiac events unless the user mentions them. Mild cough/cold alone is usually LOW not HIGH. Use LOW/MEDIUM/HIGH/CRITICAL. No diagnosis.',
    `Chief complaint:\n${userText}\n\nContext:\n${rag}\nReturn JSON: {"risk_level":"","why_this_risk":"","confidence_score":0.0,"emergency_category":""}`,
    language,
    'risk'
  );

  const guidance = await llmComplete(
    'You are the Guidance Agent. Provide safe first-aid style steps and when to seek care. Avoid harmful instructions.',
    `User message:\n${userText}\n\nContext:\n${rag}\nReturn JSON: {"recommended_action":"","possible_concerns":[]}`,
    language,
    'guidance'
  );

  const reply = await llmComplete(
    'You are the Reply Agent. Write a calm, clear user-facing message.',
    `User message:\n${userText}\n\nSummaries:\n${intent}\n${summary}\n${risk}\n${guidance}\nReturn JSON: {"suggested_response":""}`,
    language,
    'reply'
  );

  const emergency = await llmComplete(
    'You are the Emergency Agent. Decide if emergency services should be alerted now. JSON only.',
    `User message:\n${userText}\n\nRisk JSON:\n${risk}\nReturn JSON: {"emergency_triggered":false,"telegram_alert":""}`,
    language,
    'emergency'
  );

  const mergedPrompt = await llmComplete(
    'You are the Pipeline Merger. Combine prior agent outputs into the final STRICT schema.',
    `${STRICT_SCHEMA}\n\nAgent outputs:\nINTENT:${intent}\nSUMMARY:${summary}\nRISK:${risk}\nGUIDANCE:${guidance}\nREPLY:${reply}\nEMERGENCY:${emergency}\n\nAlso set rag_context_used to a short note about what context mattered.`,
    language,
    'merger'
  );

  let parsed = safeParseJson(mergedPrompt);
  if (!parsed) parsed = safeParseJson(reply) || {};
  const intentObj = safeParseJson(intent) || {};
  const riskObj = safeParseJson(risk) || {};
  const guidanceObj = safeParseJson(guidance) || {};
  const replyObj = safeParseJson(reply) || {};
  const emergObj = safeParseJson(emergency) || {};

  const envelope = normalizeEnvelope(
    {
      ...intentObj,
      ...safeParseJson(summary),
      ...riskObj,
      ...guidanceObj,
      ...replyObj,
      ...emergObj,
      ...parsed,
    },
    intentObj.intent
  );

  envelope.rag_context_used = envelope.rag_context_used || 'Profile + recent chats + history (RAG)';
  return applyTriageSafeguards(userText, envelope);
}

const OFFLINE_COPY = {
  en: {
    medical_summary: 'Offline mode: unable to reach AI providers. Provide conservative guidance.',
    suggested_response:
      'AEGIS is using offline emergency guidance because AI services are unavailable. If this feels urgent, call local emergency services immediately.',
    recommended_action:
      'Seek immediate in-person care if severe symptoms, altered consciousness, breathing difficulty, chest pain, stroke signs, heavy bleeding, or major trauma.',
    why_this_risk: 'AI providers unreachable; conservative escalation on high-risk keywords.',
    telegram_alert: 'Potential emergency language detected (offline heuristic).',
  },
  hi: {
    medical_summary: 'ऑफ़लाइन मोड: AI सेवाएँ उपलब्ध नहीं। सावधानीपूर्ण मार्गदर्शन दें।',
    suggested_response:
      'AEGIS ऑफ़लाइन आपात मार्गदर्शन उपयोग कर रहा है क्योंकि AI सेवाएँ उपलब्ध नहीं हैं। यदि तात्कालिक लगे तो तुरंत स्थानीय आपात सेवाओं को कॉल करें।',
    recommended_action:
      'गंभीर लक्षण, चेतना में बदलाव, सांस लेने में कठिनाई, छाती में दर्द, स्ट्रोक के संकेत, भारी रक्तस्राव या गंभीर चोट पर तुरंत व्यक्तिगत चिकित्सा सहायता लें।',
    why_this_risk: 'AI प्रदाता अनुपलब्ध; उच्च-जोखिम कीवर्ड पर सावधानीपूर्ण एस्केलेशन।',
    telegram_alert: 'संभावित आपात भाषा पहचानी गई (ऑफ़लाइन नियम)।',
  },
  kn: {
    medical_summary: 'ಆಫ್‌ಲೈನ್: AI ಒದಗಿಸುವಿಕೆಗಳು ಲಭ್ಯವಿಲ್ಲ. ಸಾವಧಾನದ ಮಾರ್ಗದರ್ಶನ ನೀಡಿ.',
    suggested_response:
      'AI ಸೇವೆಗಳು ಲಭ್ಯವಿಲ್ಲದ ಕಾರಣ AEGIS ಆಫ್‌ಲೈನ್ ತುರ್ತು ಮಾರ್ಗದರ್ಶನ ಬಳಸುತ್ತಿದೆ. ತುರ್ತಾದರೆ ತಕ್ಷಣ ಸ್ಥಳೀಯ ತುರ್ತು ಸೇವೆಗಳನ್ನು ಕರೆಯಿರಿ.',
    recommended_action:
      'ತೀವ್ರ ಲಕ್ಷಣಗಳು, ಜ್ಞಾನದ ಬದಲಾವಣೆ, ಉಸಿರಾಟದ ತೊಂದರೆ, ಎದೆ ನೋವು, ಸ್ಟ್ರೋಕ್ ಚಿಹ್ನೆಗಳು, ರಕ್ತಸ್ರಾವ ಅಥವಾ ಗಂಭೀರ ಗಾಯದಲ್ಲಿ ತಕ್ಷಣ ವೈದ್ಯಕೀಯ ಸಹಾಯ ಪಡೆಯಿರಿ.',
    why_this_risk: 'AI ತಲುಪಲು ಸಾಧ್ಯವಿಲ್ಲ; ಉನ್ನತ-ಅಪಾಯದ ಕೀವರ್ಡ್‌ಗಳ ಮೇಲೆ ಸಾವಧಾನದ ಎಸ್ಕಲೇಶನ್.',
    telegram_alert: 'ಸಂಭಾವ್ಯ ತುರ್ತು ಭಾಷೆ ಪತ್ತೆಯಾಗಿದೆ (ಆಫ್‌ಲೈನ್ ನಿಯಮ).',
  },
  zh: {
    medical_summary: '离线模式：无法连接 AI 服务。请提供保守的急救建议。',
    suggested_response:
      'AEGIS 正在使用离线应急指引，因为 AI 服务不可用。如情况紧急，请立即拨打当地急救电话。',
    recommended_action:
      '若出现严重症状、意识改变、呼吸困难、胸痛、脑卒中征象、大量出血或重大外伤，请立即就医或呼叫急救。',
    why_this_risk: 'AI 服务不可用；基于高风险关键词采取保守升级。',
    telegram_alert: '离线规则检测到可能的紧急情况用语。',
  },
  ja: {
    medical_summary: 'オフラインモード：AIプロバイダーに接続できません。保守的なガイダンスを行ってください。',
    suggested_response:
      'AIサービスが利用できないため、AEGISはオフラインの緊急ガイダンスを使用しています。緊急と感じたら直ちに地域の救急番号に連絡してください。',
    recommended_action:
      '重い症状、意識障害、呼吸困難、胸痛、脳卒中の兆候、大量出血、重大な外傷がある場合は直ちに受診・救急要請してください。',
    why_this_risk: 'AIプロバイダーに到達できません。高リスク語に基づく保守的エスカレーション。',
    telegram_alert: 'オフライン検出：緊急を示す語句の可能性。',
  },
  ta: {
    medical_summary: 'ஆஃப்லைன்: AI வழங்குநர்களை அடைய முடியவில்லை. பாதுகாப்பான வழிகாட்டுதலை வழங்கவும்.',
    suggested_response:
      'AI சேவைகள் கிடைக்காததால் AEGIS ஆஃப்லைன் அவசர வழிகாட்டுதலைப் பயன்படுத்துகிறது. அவசரமாக இருந்தால் உடனடியாக உள்ளூர் அவசர சேவைகளை அழைக்கவும்.',
    recommended_action:
      'கடுமையான அறிகுறிகள், உணர்வு மாற்றம், சுவாசிப்பில் சிரமம், நெஞ்சு வலி, பக்கவாத அறிகுறிகள், அதிக இரத்தப்போக்கு அல்லது பெரிய காயம் இருந்தால் உடனடியாக மருத்துவ உதவியை நாடவும்.',
    why_this_risk: 'AI வழங்குநர்களை அடைய முடியவில்லை; அதிக ஆபத்து முக்கியச்சொற்களில் பாதுகாப்பான உயர்த்தல்.',
    telegram_alert: 'அவசர மொழி கண்டறியப்பட்டது (ஆஃப்லைன் விதி).',
  },
  te: {
    medical_summary: 'ఆఫ్‌లైన్: AI ప్రొవైడర్లను చేరుకోలేకపోయాం. జాగ్రత్తగా మార్గదర్శనం ఇవ్వండి.',
    suggested_response:
      'AI సేవలు అందుబాటులో లేకపోవడంతో AEGIS ఆఫ్‌లైన్ అత్యవసర మార్గదర్శనాన్ని ఉపయోగిస్తోంది. అత్యవసరమైతే వెంటనే స్థానిక అత్యవసర సేవలను కాల్ చేయండి.',
    recommended_action:
      'తీవ్ర లక్షణాలు, చైతన్య మార్పు, శ్వాస తీసుకోవడంలో ఇబ్బంది, ఛాతీ నొప్పి, స్ట్రోక్ సంకేతాలు, భారీ రక్తస్రావం లేదా గంభీర గాయం ఉంటే వెంటనే వైద్య సహాయం తీసుకోండి.',
    why_this_risk: 'AI ప్రొవైడర్లను చేరుకోలేకపోయాం; అధిక-ప్రమాద కీవర్డ్‌లపై జాగ్రత్తగా ఎస్కలేషన్.',
    telegram_alert: 'అత్యవసర భాష గుర్తించబడింది (ఆఫ్‌లైన్ నియమం).',
  },
  mr: {
    medical_summary: 'ऑफलाइन: AI प्रदात्यांपर्यंत पोहचू शकत नाही. सावध मार्गदर्शन द्या.',
    suggested_response:
      'AI सेवा उपलब्ध नसल्यामुळे AEGIS ऑफलाइन आपत्कालीन मार्गदर्शन वापरत आहे. तातडीचे वाटल्यास लगेच स्थानिक आपत्कालीन सेवांना कॉल करा.',
    recommended_action:
      'गंभीर लक्षणे, जाणीवेत बदल, श्वासोच्छ्वासात अडचण, छातीत दुखणे, स्ट्रोक चिन्हे, जोरदार रक्तस्त्राव किंवा गंभीर दुखापत असल्यास लगेच वैद्यकीय मदत घ्या.',
    why_this_risk: 'AI प्रदात्यांपर्यंत पोहचू शकत नाही; उच्च-धोके कीवर्डवर सावध स्केलिंग.',
    telegram_alert: 'संभाव्य आपत्कालीन भाषा आढळली (ऑफलाइन नियम).',
  },
};

export function offlineEnvelope(userText, lang = 'en') {
  const code = String(lang || 'en').toLowerCase().slice(0, 5);
  const L = OFFLINE_COPY[code] || OFFLINE_COPY.en;
  return normalizeEnvelope(
    {
      intent: 'offline_guidance',
      risk_level: 'MEDIUM',
      severity: 'MEDIUM',
      emergency_category: 'Offline',
      medical_summary: L.medical_summary,
      possible_concerns: ['Unverified symptoms', 'Limited context'],
      probable_conditions: ['Unverified symptoms', 'Limited context'],
      recommendations: [L.recommended_action],
      immediate_actions: ['Call emergency services if urgent', 'Seek clinician if symptoms persist'],
      escalation_advice: L.why_this_risk,
      suggested_response: L.suggested_response,
      recommended_action: L.recommended_action,
      rag_context_used: 'Offline fallback',
      emergency_triggered: /bleed|chest|stroke|can't breathe|not breathing|unconscious|seizure|suicide|overdose/i.test(userText),
      telegram_alert: L.telegram_alert,
      confidence_score: 0.35,
      confidence: 35,
      why_this_risk: L.why_this_risk,
    },
    'offline'
  );
}
