import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

// ─────────────────────────────────────────────
//  DESIGN TOKENS  —  Clean White Professional
// ─────────────────────────────────────────────
const C = {
  white:       '#ffffff',
  pageBg:      '#f8f9fc',
  cardBg:      '#ffffff',
  headerBg:    '#0f1f3d',
  accentBar:   '#1a56db',
  sectionBg:   '#f1f5fd',

  textDark:    '#0d1b2e',
  textMid:     '#374151',
  textLight:   '#6b7280',
  textLabel:   '#9ca3af',
  textWhite:   '#ffffff',
  textCyan:    '#38bdf8',

  blue:        '#1a56db',
  blueLight:   '#dbeafe',
  blueMid:     '#3b82f6',
  teal:        '#0d9488',
  tealLight:   '#ccfbf1',
  green:       '#059669',
  greenLight:  '#d1fae5',
  amber:       '#b45309',
  amberLight:  '#fef3c7',
  rose:        '#be123c',
  roseLight:   '#ffe4e6',
  orange:      '#c2410c',
  orangeLight: '#ffedd5',
  purple:      '#6d28d9',
  purpleLight: '#ede9fe',

  border:      '#e5e7eb',
  borderMid:   '#d1d5db',

  riskCritical:    '#be123c',
  riskCriticalBg:  '#fff1f2',
  riskCriticalBdr: '#fecdd3',
  riskHigh:        '#c2410c',
  riskHighBg:      '#fff7ed',
  riskHighBdr:     '#fed7aa',
  riskMedium:      '#b45309',
  riskMediumBg:    '#fffbeb',
  riskMediumBdr:   '#fde68a',
  riskLow:         '#059669',
  riskLowBg:       '#f0fdf4',
  riskLowBdr:      '#a7f3d0',
};

const FONT = { regular: 'Helvetica', bold: 'Helvetica-Bold' };
const W         = 595;
const H         = 842;
const PX        = 44;
const CONTENT_W = W - PX * 2;

// ─────────────────────────────────────────────
//  RISK THEME
// ─────────────────────────────────────────────
function riskTheme(level) {
  const L = String(level || 'LOW').toUpperCase();
  if (L === 'CRITICAL') return { text: C.riskCritical, bg: C.riskCriticalBg, border: C.riskCriticalBdr };
  if (L === 'HIGH')     return { text: C.riskHigh,     bg: C.riskHighBg,     border: C.riskHighBdr     };
  if (L === 'MEDIUM')   return { text: C.riskMedium,   bg: C.riskMediumBg,   border: C.riskMediumBdr   };
  return                        { text: C.riskLow,     bg: C.riskLowBg,      border: C.riskLowBdr      };
}

// ─────────────────────────────────────────────
//  QR
// ─────────────────────────────────────────────
async function generateQR(url) {
  try {
    return await QRCode.toBuffer(url || 'https://aegis.ai', {
      color: { dark: '#0f1f3d', light: '#ffffff' },
      margin: 1,
      width: 120,
    });
  } catch { return null; }
}

// ─────────────────────────────────────────────
//  PRIMITIVES
// ─────────────────────────────────────────────
function fillRect(doc, x, y, w, h, fill) {
  doc.rect(x, y, w, h).fill(fill);
}

function roundBox(doc, x, y, w, h, r, fill, strokeColor, strokeW = 0.75) {
  doc.roundedRect(x, y, w, h, r);
  if (fill && strokeColor) doc.fillAndStroke(fill, strokeColor);
  else if (fill)            doc.fill(fill);
  else if (strokeColor)    { doc.lineWidth(strokeW).stroke(strokeColor); }
}

function hLine(doc, x, y, w, color = C.border, lw = 0.5) {
  doc.moveTo(x, y).lineTo(x + w, y).lineWidth(lw).stroke(color);
}

function vLine(doc, x, y1, y2, color = C.border, lw = 0.5) {
  doc.moveTo(x, y1).lineTo(x, y2).lineWidth(lw).stroke(color);
}

function sectionTitle(doc, x, y, text, color = C.blue) {
  fillRect(doc, x, y, 3, 16, color);
  doc.fillColor(color).font(FONT.bold).fontSize(9.5)
     .text(text.toUpperCase(), x + 9, y + 1, { lineBreak: false });
  return y + 24;
}

function kvLine(doc, x, y, key, value, maxW = 240) {
  doc.fillColor(C.textLabel).font(FONT.regular).fontSize(7.5)
     .text(key.toUpperCase(), x, y + 1, { lineBreak: false, width: 110 });
  doc.fillColor(C.textDark).font(FONT.bold).fontSize(9)
     .text(String(value || '—'), x + 115, y, { lineBreak: false, width: maxW });
  return y + 18;
}

function pill(doc, x, y, text, bgColor, textColor, fontSize = 7.5) {
  doc.font(FONT.bold).fontSize(fontSize);
  const tw = doc.widthOfString(text);
  const bw = tw + 14;
  const bh = 15;
  roundBox(doc, x, y, bw, bh, 8, bgColor);
  doc.fillColor(textColor).fontSize(fontSize).font(FONT.bold)
     .text(text, x + 7, y + 3.5, { lineBreak: false });
  return bw;
}

// ─────────────────────────────────────────────
//  SHARED HEADER
// ─────────────────────────────────────────────
function drawHeader(doc, reportId, pageNum, totalPages) {
  const HH = 66;
  fillRect(doc, 0, 0, W, HH, C.headerBg);
  fillRect(doc, 0, HH, W, 3, C.accentBar);

  // Logo circle
  doc.circle(PX + 13, HH / 2, 11).fill(C.accentBar);
  doc.fillColor(C.textWhite).font(FONT.bold).fontSize(13)
     .text('+', PX + 8, HH / 2 - 9, { lineBreak: false });

  // Brand
  doc.fillColor(C.textWhite).font(FONT.bold).fontSize(18)
     .text('AEGIS', PX + 30, 15, { lineBreak: false });
  const aegisW = doc.widthOfString('AEGIS');
  doc.fillColor(C.textCyan).font(FONT.bold).fontSize(18)
     .text(' AI', PX + 30 + aegisW, 15, { lineBreak: false });
  doc.fillColor('#94b8d8').font(FONT.regular).fontSize(7.5)
     .text('HEALTHCARE  INTELLIGENCE  OS', PX + 30, 38, { lineBreak: false });

  // Divider
  vLine(doc, W - 196, 12, HH - 12, '#2a3f6a', 0.75);

  // Right meta
  doc.fillColor('#94b8d8').font(FONT.regular).fontSize(7)
     .text('REPORT ID', W - 184, 12, { lineBreak: false });
  doc.fillColor(C.textWhite).font(FONT.bold).fontSize(8)
     .text(String(reportId || '—'), W - 184, 23, { lineBreak: false, width: 158 });
  doc.fillColor('#94b8d8').font(FONT.regular).fontSize(7)
     .text('PAGE', W - 184, 40, { lineBreak: false });
  doc.fillColor(C.textCyan).font(FONT.bold).fontSize(9)
     .text(`${pageNum}  /  ${totalPages}`, W - 184, 51, { lineBreak: false });
}

// ─────────────────────────────────────────────
//  SHARED FOOTER
// ─────────────────────────────────────────────
function drawFooter(doc) {
  hLine(doc, PX, H - 40, CONTENT_W, C.borderMid, 0.5);
  doc.fillColor(C.textLight).font(FONT.regular).fontSize(7)
     .text(
       'AEGIS AI Healthcare OS  ·  AI-generated report. Not a substitute for professional medical advice.',
       PX, H - 30, { width: CONTENT_W - 140, lineBreak: false }
     );
  doc.fillColor(C.textLabel).font(FONT.regular).fontSize(7)
     .text('AEGIS AI', W - PX - 100, H - 30, { align: 'right', width: 100, lineBreak: false });
}

// ─────────────────────────────────────────────
//  PAGE 1  —  Cover, Patient, Summary
// ─────────────────────────────────────────────
function buildPage1(doc, p, qr) {
  fillRect(doc, 0, 0, W, H, C.white);
  drawHeader(doc, p.reportId, 1, 3);
  drawFooter(doc);

  const risk = String(p.risk || 'LOW').toUpperCase();
  const rt   = riskTheme(risk);
  let cy = 86;

  // ── Title + Risk ──────────────────────────
  doc.fillColor(C.textLight).font(FONT.regular).fontSize(8)
     .text('MEDICAL INTELLIGENCE REPORT', PX, cy, { lineBreak: false });
  cy += 14;

  // Title
  doc.fillColor(C.textDark).font(FONT.bold).fontSize(21)
     .text(p.reportTitle || 'AEGIS AI TRIAGE REPORT', PX, cy, { lineBreak: false, width: CONTENT_W - 120 });

  // Risk badge — right aligned
  const rbW = 108;
  const rbH = 50;
  const rbX = W - PX - rbW;
  roundBox(doc, rbX, cy - 4, rbW, rbH, 6, rt.bg, rt.border, 1);
  fillRect(doc, rbX, cy - 4, 4, rbH, rt.text);
  doc.fillColor(rt.text).font(FONT.regular).fontSize(7)
     .text('RISK LEVEL', rbX + 14, cy + 4, { lineBreak: false });
  doc.fillColor(rt.text).font(FONT.bold).fontSize(23)
     .text(risk, rbX + 14, cy + 18, { lineBreak: false });

  cy += 48;
  hLine(doc, PX, cy, CONTENT_W, C.borderMid, 0.75);
  cy += 14;

  // ── Meta strip ────────────────────────────
  const metaFields = [
    { label: 'Report ID',    value: p.reportId || '—' },
    { label: 'Date & Time',  value: new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }) },
    { label: 'Generated By', value: 'AEGIS AI' },
  ];
  const mCW = CONTENT_W / 3;
  metaFields.forEach((f, i) => {
    const mx = PX + i * mCW;
    if (i > 0) vLine(doc, mx - 8, cy, cy + 28, C.border, 0.5);
    doc.fillColor(C.textLabel).font(FONT.regular).fontSize(7.5)
       .text(f.label.toUpperCase(), mx, cy, { lineBreak: false });
    doc.fillColor(C.textDark).font(FONT.bold).fontSize(10)
       .text(String(f.value), mx, cy + 13, { lineBreak: false, width: mCW - 16 });
  });

  cy += 42;
  hLine(doc, PX, cy, CONTENT_W, C.borderMid, 0.75);
  cy += 14;

  // ── Patient Info | Vitals ─────────────────
  const cardW = (CONTENT_W - 14) / 2;
  const cardH = 180;

  // Patient card
  roundBox(doc, PX, cy, cardW, cardH, 6, C.cardBg, C.border, 0.75);
  fillRect(doc, PX, cy, cardW, 28, C.sectionBg);
  roundBox(doc, PX, cy, cardW, 28, 6, C.sectionBg, 'transparent');
  sectionTitle(doc, PX + 12, cy + 7, 'Patient Information', C.blue);
  hLine(doc, PX, cy + 28, cardW, C.border, 0.5);

  let ny = cy + 36;
  [
    ['Full Name',   p.name       || '—'],
    ['Email',       p.email      || '—'],
    ['Blood Group', p.bloodGroup || '—'],
    ['Age',         p.age        || '—'],
    ['Phone',       p.phone      || '—'],
  ].forEach(([k, v]) => {
    ny = kvLine(doc, PX + 12, ny, k, v, cardW - 128);
    hLine(doc, PX + 12, ny, cardW - 24, C.border, 0.3);
    ny += 4;
  });

  // Vitals card
  const vx = PX + cardW + 14;
  roundBox(doc, vx, cy, cardW, cardH, 6, C.cardBg, C.border, 0.75);
  fillRect(doc, vx, cy, cardW, 28, C.sectionBg);
  roundBox(doc, vx, cy, cardW, 28, 6, C.sectionBg, 'transparent');
  sectionTitle(doc, vx + 12, cy + 7, 'Reported Vitals & Severity', C.rose);
  hLine(doc, vx, cy + 28, cardW, C.border, 0.5);

  let vy = cy + 36;
  [
    ['Chief Symptoms', p.symptoms   || '—'],
    ['Severity',       p.severity   || '—'],
    ['Duration',       p.duration   || '—'],
    ['AI Confidence',  p.confidence || '—'],
    ['Onset',          p.onset      || '—'],
  ].forEach(([k, v]) => {
    vy = kvLine(doc, vx + 12, vy, k, v, cardW - 128);
    hLine(doc, vx + 12, vy, cardW - 24, C.border, 0.3);
    vy += 4;
  });

  cy += cardH + 14;

  // ── AI Diagnostic Summary ─────────────────
  const summaryH = 126;
  roundBox(doc, PX, cy, CONTENT_W, summaryH, 6, C.cardBg, C.border, 0.75);
  fillRect(doc, PX, cy, CONTENT_W, 28, C.sectionBg);
  roundBox(doc, PX, cy, CONTENT_W, 28, 6, C.sectionBg, 'transparent');
  sectionTitle(doc, PX + 12, cy + 7, 'AI Diagnostic Summary', C.green);
  hLine(doc, PX, cy + 28, CONTENT_W, C.border, 0.5);

  doc.fillColor(C.textMid).font(FONT.regular).fontSize(9.5).lineGap(2.5)
     .text(
       p.summary || 'No AI summary available for this report.',
       PX + 12, cy + 36,
       { width: CONTENT_W - 106, lineGap: 2.5 }
     );

  if (qr) {
    try {
      roundBox(doc, W - PX - 84, cy + 22, 72, 72, 4, C.white, C.border, 0.5);
      doc.image(qr, W - PX - 82, cy + 24, { width: 68, height: 68 });
      doc.fillColor(C.textLabel).font(FONT.regular).fontSize(6.5)
         .text('Scan to verify', W - PX - 82, cy + 96, { width: 68, align: 'center', lineBreak: false });
    } catch {}
  }

  cy += summaryH + 14;

  // ── Diagnosis Tags ────────────────────────
  if (Array.isArray(p.diagnoses) && p.diagnoses.length) {
    roundBox(doc, PX, cy, CONTENT_W, 52, 6, C.cardBg, C.border, 0.75);
    fillRect(doc, PX, cy, CONTENT_W, 28, C.sectionBg);
    roundBox(doc, PX, cy, CONTENT_W, 28, 6, C.sectionBg, 'transparent');
    sectionTitle(doc, PX + 12, cy + 7, 'Possible Conditions / Differential Diagnoses', C.purple);
    hLine(doc, PX, cy + 28, CONTENT_W, C.border, 0.5);
    let tx = PX + 12;
    p.diagnoses.forEach((d) => {
      const bw = pill(doc, tx, cy + 33, d, C.purpleLight, C.purple);
      tx += bw + 8;
    });
  }
}

// ─────────────────────────────────────────────
//  PAGE 2  —  Recommendations & Treatments
// ─────────────────────────────────────────────
function buildPage2(doc, p) {
  fillRect(doc, 0, 0, W, H, C.white);
  drawHeader(doc, p.reportId, 2, 3);
  drawFooter(doc);

  let cy = 86;

  // ── Recommendations ───────────────────────
  sectionTitle(doc, PX, cy, 'Clinical Recommendations', C.blue);
  cy += 4;
  hLine(doc, PX, cy, CONTENT_W, C.borderMid, 0.75);
  cy += 12;

  const recs = Array.isArray(p.recommendations) ? p.recommendations : [];

  if (!recs.length) {
    roundBox(doc, PX, cy, CONTENT_W, 44, 6, C.sectionBg, C.border, 0.5);
    doc.fillColor(C.textLight).font(FONT.regular).fontSize(9)
       .text('No specific recommendations provided.', PX + 16, cy + 16, { lineBreak: false });
    cy += 56;
  } else {
    const priorityLabels = ['URGENT', 'HIGH', 'ROUTINE'];
    const priorityColors = [
      { text: C.riskCritical, bg: C.riskCriticalBg, bdr: C.riskCriticalBdr },
      { text: C.riskHigh,     bg: C.riskHighBg,     bdr: C.riskHighBdr     },
      { text: C.blue,         bg: C.blueLight,       bdr: C.blueMid         },
    ];

    recs.forEach((rec, i) => {
      const ci    = Math.min(i, 2);
      const cl    = priorityColors[ci];
      const label = priorityLabels[ci];
      const tH    = Math.max(34, doc.heightOfString(rec, { width: CONTENT_W - 94, fontSize: 9.5 }));
      const rowH  = tH + 34;

      roundBox(doc, PX, cy, CONTENT_W, rowH, 6, C.cardBg, C.border, 0.75);
      fillRect(doc, PX, cy, 4, rowH, cl.text);          // left strip

      // Number circle
      doc.circle(PX + 22, cy + rowH / 2, 11).fill(cl.text);
      doc.fillColor(C.textWhite).font(FONT.bold).fontSize(10)
         .text(String(i + 1), PX + 17, cy + rowH / 2 - 7, { lineBreak: false });

      // Priority pill
      pill(doc, PX + 40, cy + 10, label, cl.bg, cl.text, 7.5);

      // Body
      doc.fillColor(C.textMid).font(FONT.regular).fontSize(9.5).lineGap(2)
         .text(rec, PX + 40, cy + 30, { width: CONTENT_W - 54, lineGap: 2 });

      cy += rowH + 8;
    });
  }

  cy += 8;

  // ── Medications ───────────────────────────
  if (Array.isArray(p.medications) && p.medications.length) {
    sectionTitle(doc, PX, cy, 'Suggested Medications / Treatments', C.amber);
    cy += 4;
    hLine(doc, PX, cy, CONTENT_W, C.borderMid, 0.75);
    cy += 12;

    p.medications.forEach((med) => {
      const name   = med.name   || (typeof med === 'string' ? med : '—');
      const dosage = med.dosage || '';
      const rowH   = dosage ? 50 : 36;

      roundBox(doc, PX, cy, CONTENT_W, rowH, 6, C.cardBg, C.border, 0.75);
      fillRect(doc, PX, cy, 4, rowH, C.amber);

      doc.fillColor(C.amber).font(FONT.bold).fontSize(14)
         .text('Rx', PX + 14, cy + rowH / 2 - 10, { lineBreak: false });
      vLine(doc, PX + 42, cy + 8, cy + rowH - 8, C.borderMid, 0.5);

      doc.fillColor(C.textDark).font(FONT.bold).fontSize(10.5)
         .text(name, PX + 52, cy + (dosage ? 10 : 14), { lineBreak: false });
      if (dosage) {
        doc.fillColor(C.textLight).font(FONT.regular).fontSize(8.5)
           .text(dosage, PX + 52, cy + 28, { lineBreak: false });
      }
      cy += rowH + 8;
    });
    cy += 6;
  }

  // ── Do's & Don'ts ─────────────────────────
  const hasDos   = Array.isArray(p.dos)   && p.dos.length;
  const hasDonts = Array.isArray(p.donts) && p.donts.length;

  if (hasDos || hasDonts) {
    sectionTitle(doc, PX, cy, "Do's & Don'ts", C.teal);
    cy += 4;
    hLine(doc, PX, cy, CONTENT_W, C.borderMid, 0.75);
    cy += 12;

    const halfW  = (CONTENT_W - 12) / 2;
    const maxLen = Math.max(hasDos ? p.dos.length : 0, hasDonts ? p.donts.length : 0);
    const blockH = maxLen * 20 + 42;

    if (hasDos) {
      roundBox(doc, PX, cy, halfW, blockH, 6, '#f0fdf4', '#a7f3d0', 0.75);
      fillRect(doc, PX, cy, 4, blockH, C.green);
      doc.fillColor(C.green).font(FONT.bold).fontSize(8.5)
         .text('✓  RECOMMENDED', PX + 14, cy + 10, { lineBreak: false });
      hLine(doc, PX + 14, cy + 24, halfW - 20, '#a7f3d0', 0.5);
      let dy = cy + 32;
      p.dos.forEach((d) => {
        doc.fillColor(C.green).font(FONT.bold).fontSize(9).text('·', PX + 14, dy, { lineBreak: false });
        doc.fillColor(C.textDark).font(FONT.regular).fontSize(9)
           .text(d, PX + 24, dy, { width: halfW - 34, lineBreak: false });
        dy += 20;
      });
    }

    if (hasDonts) {
      const dx = PX + halfW + 12;
      roundBox(doc, dx, cy, halfW, blockH, 6, '#fff1f2', '#fecdd3', 0.75);
      fillRect(doc, dx, cy, 4, blockH, C.rose);
      doc.fillColor(C.rose).font(FONT.bold).fontSize(8.5)
         .text('✗  AVOID', dx + 14, cy + 10, { lineBreak: false });
      hLine(doc, dx + 14, cy + 24, halfW - 20, '#fecdd3', 0.5);
      let dy = cy + 32;
      p.donts.forEach((d) => {
        doc.fillColor(C.rose).font(FONT.bold).fontSize(9).text('·', dx + 14, dy, { lineBreak: false });
        doc.fillColor(C.textDark).font(FONT.regular).fontSize(9)
           .text(d, dx + 24, dy, { width: halfW - 34, lineBreak: false });
        dy += 20;
      });
    }
    cy += blockH + 14;
  }

  // ── Follow-up ─────────────────────────────
  if (p.followUp) {
    roundBox(doc, PX, cy, CONTENT_W, 58, 6, '#eff6ff', '#bfdbfe', 0.75);
    fillRect(doc, PX, cy, 4, 58, C.blue);
    doc.fillColor(C.blue).font(FONT.bold).fontSize(8.5)
       .text('FOLLOW-UP INSTRUCTIONS', PX + 14, cy + 10, { lineBreak: false });
    hLine(doc, PX + 14, cy + 24, CONTENT_W - 18, '#bfdbfe', 0.5);
    doc.fillColor(C.textDark).font(FONT.regular).fontSize(9.5).lineGap(2)
       .text(p.followUp, PX + 14, cy + 32, { width: CONTENT_W - 28 });
  }
}

// ─────────────────────────────────────────────
//  PAGE 3  —  Hospitals, Emergency, Closing
// ─────────────────────────────────────────────
function buildPage3(doc, p) {
  fillRect(doc, 0, 0, W, H, C.white);
  drawHeader(doc, p.reportId, 3, 3);
  drawFooter(doc);

  let cy = 86;
  const risk = String(p.risk || 'LOW').toUpperCase();

  // ── Emergency Alert ───────────────────────
  if (risk === 'CRITICAL' || risk === 'HIGH') {
    const rt = riskTheme(risk);
    roundBox(doc, PX, cy, CONTENT_W, 50, 6, rt.bg, rt.border, 1);
    fillRect(doc, PX, cy, 4, 50, rt.text);
    doc.fillColor(rt.text).font(FONT.bold).fontSize(11)
       .text('⚠  EMERGENCY ALERT', PX + 14, cy + 10, { lineBreak: false });
    doc.fillColor(C.textMid).font(FONT.regular).fontSize(9.5)
       .text(
         risk === 'CRITICAL'
           ? 'This patient requires IMMEDIATE emergency care. Call 112 / 108 right now.'
           : 'This patient requires urgent medical attention within the next few hours.',
         PX + 14, cy + 27, { lineBreak: false }
       );
    cy += 62;
  }

  // ── Nearby Hospitals ─────────────────────
  sectionTitle(doc, PX, cy, 'Nearby Hospitals & Emergency Services', C.blue);
  cy += 4;
  hLine(doc, PX, cy, CONTENT_W, C.borderMid, 0.75);
  cy += 12;

  const hospitals = Array.isArray(p.hospitals) ? p.hospitals : [];

  if (!hospitals.length) {
    roundBox(doc, PX, cy, CONTENT_W, 50, 6, C.sectionBg, C.border, 0.5);
    fillRect(doc, PX, cy, 4, 50, C.blue);
    doc.fillColor(C.textLight).font(FONT.regular).fontSize(9)
       .text(
         'No nearby hospitals data available. Please contact local emergency services (112 / 108).',
         PX + 14, cy + 18, { width: CONTENT_W - 24 }
       );
    cy += 62;
  } else {
    hospitals.slice(0, 5).forEach((h, i) => {
      const name  = h.name     || String(h);
      const dist  = h.distanceKm != null ? `${h.distanceKm} km` : '';
      const phone = h.phone    || '';
      const addr  = h.address  || '';
      const type  = h.type     || 'General Hospital';
      const beds  = h.bedsAvailable != null ? `${h.bedsAvailable} beds` : '';
      const rowH  = 56;
      const rowBg = i % 2 === 0 ? C.sectionBg : C.white;

      roundBox(doc, PX, cy, CONTENT_W, rowH, 6, rowBg, C.border, 0.75);
      fillRect(doc, PX, cy, 4, rowH, C.blue);

      doc.fillColor(C.blue).font(FONT.bold).fontSize(14)
         .text(String(i + 1), PX + 14, cy + rowH / 2 - 10, { lineBreak: false });
      vLine(doc, PX + 36, cy + 8, cy + rowH - 8, C.borderMid, 0.5);

      doc.fillColor(C.textDark).font(FONT.bold).fontSize(10.5)
         .text(name, PX + 46, cy + 10, { lineBreak: false, width: 220 });
      doc.fillColor(C.textLight).font(FONT.regular).fontSize(8)
         .text(type, PX + 46, cy + 26, { lineBreak: false });
      if (dist) pill(doc, PX + 46, cy + 38, dist + ' away', C.blueLight, C.blue, 7);

      const rxCol = W - PX - 148;
      if (phone) {
        doc.fillColor(C.textLabel).font(FONT.regular).fontSize(7)
           .text('PHONE', rxCol, cy + 10, { lineBreak: false });
        doc.fillColor(C.textDark).font(FONT.bold).fontSize(9)
           .text(phone, rxCol, cy + 21, { lineBreak: false });
      }
      if (beds) {
        doc.fillColor(C.textLabel).font(FONT.regular).fontSize(7)
           .text('BEDS', rxCol + 72, cy + 10, { lineBreak: false });
        doc.fillColor(C.green).font(FONT.bold).fontSize(9)
           .text(beds, rxCol + 72, cy + 21, { lineBreak: false });
      }
      if (addr) {
        doc.fillColor(C.textLabel).font(FONT.regular).fontSize(7.5)
           .text(addr, rxCol, cy + 38, { lineBreak: false, width: 148 });
      }

      cy += rowH + 6;
    });
  }

  cy += 10;

  // ── Emergency Helplines ───────────────────
  sectionTitle(doc, PX, cy, 'Emergency Helplines', C.rose);
  cy += 4;
  hLine(doc, PX, cy, CONTENT_W, C.borderMid, 0.75);
  cy += 12;

  const defaultContacts = [
    { label: 'National Emergency', number: '112' },
    { label: 'Ambulance',          number: '108' },
    { label: 'Police',             number: '100' },
    { label: 'Poison Control',     number: '1800-116-117' },
  ];
  const contacts = (Array.isArray(p.emergencyContacts) && p.emergencyContacts.length)
    ? p.emergencyContacts : defaultContacts;

  const colW = CONTENT_W / 4;
  const boxH = 58;

  contacts.slice(0, 4).forEach((c, i) => {
    const cx = PX + i * colW;
    const bg = i % 2 === 0 ? C.sectionBg : C.white;
    roundBox(doc, cx, cy, colW - 8, boxH, 6, bg, C.border, 0.75);
    fillRect(doc, cx, cy, 4, boxH, C.rose);
    doc.fillColor(C.textLabel).font(FONT.regular).fontSize(7)
       .text((c.label || '').toUpperCase(), cx + 14, cy + 10, { lineBreak: false, width: colW - 24 });
    doc.fillColor(C.rose).font(FONT.bold).fontSize(18)
       .text(String(c.number || '—'), cx + 14, cy + 24, { lineBreak: false });
  });

  cy += boxH + 16;

  // ── Disclaimer ───────────────────────────
  roundBox(doc, PX, cy, CONTENT_W, 74, 6, C.amberLight, '#fcd34d', 0.75);
  fillRect(doc, PX, cy, 4, 74, C.amber);
  doc.fillColor(C.amber).font(FONT.bold).fontSize(8.5)
     .text('IMPORTANT DISCLAIMER', PX + 14, cy + 10, { lineBreak: false });
  hLine(doc, PX + 14, cy + 24, CONTENT_W - 18, '#fcd34d', 0.5);
  doc.fillColor(C.textMid).font(FONT.regular).fontSize(8.5).lineGap(2)
     .text(
       p.disclaimer ||
       'This report is generated by an AI system and is intended for informational purposes only. ' +
       'It does not constitute a medical diagnosis or professional medical advice. Always consult a ' +
       'qualified healthcare professional before making any medical decisions. AEGIS AI and its ' +
       'operators are not liable for any actions taken based solely on this report.',
       PX + 14, cy + 30, { width: CONTENT_W - 28, lineGap: 2 }
     );

  cy += 90;

  // ── Sign-off ─────────────────────────────
  hLine(doc, PX, cy, CONTENT_W, C.borderMid, 0.5);
  cy += 16;

  doc.fillColor(C.rose).font(FONT.bold).fontSize(12)
     .text('♥  Generated with love by Sharad', 0, cy, { align: 'center', width: W, lineBreak: false });
  cy += 18;
  doc.fillColor(C.textLabel).font(FONT.regular).fontSize(8)
     .text('AEGIS AI Healthcare OS  ·  Empowering lives through intelligent medicine', 0, cy, { align: 'center', width: W, lineBreak: false });
}

// ─────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────
async function createPdf(reportTitle, payload = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
      const chunks = [];
      doc.on('data',  (c) => chunks.push(c));
      doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const fullPayload = { ...payload, reportTitle };
      const qr = await generateQR(payload.trackingUrl);

      doc.addPage(); buildPage1(doc, fullPayload, qr);
      doc.addPage(); buildPage2(doc, fullPayload);
      doc.addPage(); buildPage3(doc, fullPayload);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────
export async function buildTriageReportPdfBuffer(payload) {
  return createPdf('AEGIS AI  ·  TRIAGE REPORT', payload);
}
export async function buildSosEmergencyPdfBuffer(payload) {
  return createPdf('AEGIS AI  ·  SOS EMERGENCY REPORT', payload);
}
export async function buildIncidentPdfBuffer(payload) {
  return createPdf('AEGIS AI  ·  INCIDENT REPORT', payload);
}
export async function buildMedicalSummaryPdfBuffer(payload) {
  return createPdf('AEGIS AI  ·  MEDICAL SUMMARY', payload);
}
export async function buildImageScanPdfBuffer(payload) {
  return createPdf('AEGIS AI  ·  IMAGE SCAN REPORT', payload);
}