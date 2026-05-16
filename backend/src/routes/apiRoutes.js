import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as ai from '../controllers/aiController.js';
import * as sos from '../controllers/sosController.js';
import * as hospitals from '../controllers/hospitalController.js';
import * as history from '../controllers/historyController.js';
import * as meds from '../controllers/medicineController.js';
import * as reports from '../controllers/reportsController.js';
import * as pdf from '../controllers/pdfController.js';
import * as image from '../controllers/imageController.js';
import { imageUpload } from '../middleware/upload.js';
import { aiLimiter, uploadLimiter } from '../middleware/rateLimit.js';

const r = Router();

r.post('/ai/triage', requireAuth, aiLimiter, ai.triage);
r.post('/ai/chat', requireAuth, aiLimiter, ai.chat);
r.post('/ai/analyze-image', requireAuth, uploadLimiter, (req, res, next) => {
  imageUpload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    next();
  });
}, image.analyzeUpload);
r.get('/reports/images', requireAuth, image.listReports);
r.post('/sos/dispatch', requireAuth, sos.dispatchSos);
r.get('/hospitals', requireAuth, hospitals.hospitals);
r.get('/history', requireAuth, history.history);
r.get('/medicines', requireAuth, meds.medicines);
r.post('/medicines', requireAuth, meds.createMedicine);
r.patch('/medicines/:id', requireAuth, meds.patchMedicine);
r.post('/medicines/:id/notify', requireAuth, meds.notifyMedicineNow);
r.get('/reports', requireAuth, reports.listReports);
r.get('/reports/public/:token', reports.publicReport);
r.post('/pdf/incident', requireAuth, pdf.incidentPdf);
r.post('/pdf/triage', requireAuth, pdf.triageReportPdf);

export default r;
