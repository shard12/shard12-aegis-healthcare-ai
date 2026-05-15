import path from 'path';
import { findUserById, addImageReport, listImageReports } from '../database/db.js';
import { analyzeMedicalImage } from '../services/visionService.js';
import { buildImageScanPdfBuffer } from '../services/pdfService.js';
import { saveReportPdf, makeReportFilename } from '../services/reportService.js';
import { sendTelegramHtmlMessage } from '../services/telegramService.js';
import { config } from '../config/index.js';

export async function analyzeUpload(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file required (JPG, PNG, WEBP)' });
    const user = findUserById(req.user.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const imageFilename = req.file.filename;
    const imageRelativeUrl = `/uploads/images/${encodeURIComponent(imageFilename)}`;
    const imageFullPath = path.resolve(req.file.destination, imageFilename);

    const analysis = await analyzeMedicalImage(imageFullPath);

    let pdfUrl = null;
    let pdfFilename = null;
    try {
      const pdfBuf = await buildImageScanPdfBuffer({
        reportId: imageFilename.slice(0, 8).toUpperCase(),
        timestamp: new Date().toISOString(),
        patient: { name: user.name, email: user.email },
        analysis,
        imagePath: imageFullPath,
        imageUrl: imageRelativeUrl,
      });
      pdfFilename = makeReportFilename('SCAN');
      const saved = await saveReportPdf(pdfFilename, pdfBuf);
      if (saved.ok) {
        const host = String(config.apiPublicBaseUrl || '').replace(/\/+$/, '');
        pdfUrl = `${host}${saved.relativeUrl}`;
        pdfFilename = saved.filename;
      }
    } catch (e) {
      console.error('[AEGIS-IMAGE] PDF failed:', e?.message || e);
    }

    let telegramStatus = 'skipped';
    const sevHigh =
      String(analysis.severity || '').toLowerCase() === 'high' || Boolean(analysis.emergency);
    const chatId = user.settings?.telegramChatId || config.telegram.chatId;
    if (sevHigh && chatId) {
      try {
        const tg = await sendTelegramHtmlMessage(
          chatId,
          `🚨 <b>AEGIS AI — High severity scan</b>\n\n<b>Finding:</b> ${analysis.possible_condition}\n<b>Severity:</b> ${analysis.severity}\n\n${analysis.recommendation}`
        );
        telegramStatus = tg?.ok ? 'sent' : 'failed';
      } catch (e) {
        telegramStatus = 'failed';
        console.error('[AEGIS-IMAGE] Telegram:', e?.message || e);
      }
    }

    const report = addImageReport(user.id, {
      image: imageRelativeUrl,
      imageFilename,
      ai_analysis: analysis,
      severity: analysis.severity,
      emergency: analysis.emergency,
      pdfUrl,
      pdfFilename,
      telegramStatus,
    });

    res.json({
      reportId: report.id,
      imageUrl: imageRelativeUrl,
      analysis,
      pdf: pdfUrl ? { url: pdfUrl, filename: pdfFilename } : null,
      telegramStatus,
    });
  } catch (e) {
    console.error('[AEGIS-IMAGE]', e?.message || e);
    res.status(500).json({ error: e.message || 'Image analysis failed' });
  }
}

export function listReports(req, res) {
  const rows = listImageReports(req.user.sub).map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    image: r.image,
    severity: r.severity,
    emergency: r.emergency,
    ai_analysis: r.ai_analysis,
    pdfUrl: r.pdfUrl,
  }));
  res.json({ items: rows });
}
