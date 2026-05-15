/**
 * Rule-based medical safeguards — prevents obvious triage hallucinations
 * (e.g. "cough" alone → CRITICAL chest pain). Applied after AI envelope merge.
 */

const RED_FLAG =
  /\b(chest pain|crushing|can't breathe|cannot breathe|not breathing|stroke|face droop|slurred speech|unconscious|unresponsive|seizure|suicide|overdose|severe bleeding|major trauma|anaphylaxis|throat closing)\b/i;

const MILD_ONLY =
  /\b(cough|runny nose|sneeze|mild headache|sore throat|common cold|hay fever|allergy symptoms without breathing)\b/i;

const CHEST_REQUIRED = /\b(chest|heart|angina|myocardial)\b/i;

function hasRedFlag(text) {
  return RED_FLAG.test(text);
}

function chiefIsMildOnly(text) {
  const t = String(text || '').toLowerCase();
  if (!MILD_ONLY.test(t)) return false;
  return !hasRedFlag(t);
}

/**
 * @param {string} userText
 * @param {object} envelope normalized triage envelope
 */
export function applyTriageSafeguards(userText, envelope) {
  const text = String(userText || '');
  const out = { ...envelope };
  const risk = String(out.risk_level || 'MEDIUM').toUpperCase();
  const concerns = [...(out.possible_concerns || []), ...(out.probable_conditions || [])].map((c) =>
    String(c).toLowerCase()
  );

  const mentionsChest = concerns.some((c) => CHEST_REQUIRED.test(c)) || CHEST_REQUIRED.test(text);
  const userMild = chiefIsMildOnly(text);
  const red = hasRedFlag(text);

  if (userMild && !red) {
    if (risk === 'CRITICAL' || risk === 'HIGH') {
      out.risk_level = 'LOW';
      out.severity = 'LOW';
      out.emergency_triggered = false;
    } else if (risk === 'MEDIUM') {
      out.risk_level = 'LOW';
      out.severity = 'LOW';
    }
    out.emergency_category = out.emergency_category || 'Respiratory / upper airway (mild)';
    const filtered = (out.possible_concerns || []).filter(
      (c) => !/\b(chest|heart attack|myocardial|cardiac arrest)\b/i.test(String(c))
    );
    if (filtered.length) {
      out.possible_concerns = filtered;
      out.probable_conditions = filtered;
    } else {
      out.possible_concerns = ['Upper respiratory irritation or common cold pattern (preliminary)'];
      out.probable_conditions = out.possible_concerns;
    }
    out.why_this_risk =
      (out.why_this_risk || '') +
      ' Safeguard: isolated mild symptoms without red flags — downgraded from acute cardiac escalation.';
    if (out.confidence_score > 0.75) out.confidence_score = 0.72;
  }

  if (!mentionsChest && !CHEST_REQUIRED.test(text) && concerns.some((c) => /\bchest\b/.test(c))) {
    out.possible_concerns = (out.possible_concerns || []).filter(
      (c) => !/\bchest|heart attack|angina\b/i.test(String(c))
    );
    out.probable_conditions = out.possible_concerns;
    if (userMild && (risk === 'HIGH' || risk === 'CRITICAL')) {
      out.risk_level = 'MEDIUM';
      out.severity = 'MEDIUM';
      out.emergency_triggered = false;
    }
  }

  if (red && (out.risk_level === 'LOW' || out.risk_level === 'MEDIUM')) {
    out.risk_level = 'HIGH';
    out.severity = 'HIGH';
    out.emergency_triggered = true;
    out.why_this_risk = (out.why_this_risk || '') + ' Safeguard: red-flag language detected in presentation.';
  }

  if (!red && out.risk_level === 'CRITICAL' && userMild) {
    out.risk_level = 'MEDIUM';
    out.severity = 'MEDIUM';
    out.emergency_triggered = false;
  }

  out.recommended_specialty =
    out.emergency_category?.toLowerCase().includes('respiratory') || /\bcough\b/i.test(text)
      ? 'Primary care / pulmonology if persistent'
      : out.recommended_specialty || 'General practice';

  return out;
}
