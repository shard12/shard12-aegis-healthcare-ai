export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AiProviderStatus = {
  status: 'online' | 'offline' | 'no_keys';
  detail: string | null;
};

export type TriageReportMeta = {
  incidentId: string | null;
  url: string | null;
  filename: string | null;
  viewUrl?: string | null;
  accessToken?: string | null;
  pdfError?: string | null;
};

export type TriageEnvelope = {
  intent: string;
  risk_level: RiskLevel | string;
  severity?: RiskLevel | string;
  emergency_category?: string;
  medical_summary: string;
  possible_concerns: string[];
  probable_conditions?: string[];
  recommendations?: string[];
  immediate_actions?: string[];
  escalation_advice?: string;
  suggested_response: string;
  recommended_action: string;
  rag_context_used: string;
  emergency_triggered: boolean;
  telegram_alert: string;
  confidence_score: number;
  confidence?: number;
  why_this_risk: string;
};

export type UserProfile = {
  gender?: string;
  bloodGroup: string;
  dob: string;
  heightCm?: number | string;
  weightKg?: number | string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  emergencyContacts?: string[];
  insuranceProvider?: string;
  insuranceId?: string;
  medicalHistory?: string;
  notes: string;
};

export type UserSettings = {
  language: string;
  darkMode: boolean;
  largeText: boolean;
  vibrations: boolean;
  telegramChatId: string;
  telegramGroupId: string;
  alertEmail: string;
  alertPhone: string;
};

export type ImageFindingScreen = {
  visible_abnormalities?: string;
  inflammation?: string;
  fractures?: string;
  lesions?: string;
  tumors?: string;
  infections?: string;
  tissue_irregularities?: string;
  neurological_if_mri?: string;
};

export type ImageAnalysisResult = {
  possible_condition: string;
  severity: 'Low' | 'Moderate' | 'High' | string;
  confidence: string;
  observations: string[];
  finding_screen?: ImageFindingScreen;
  recommendation: string;
  emergency: boolean;
  disclaimer: string;
  provider?: string;
  analyzed_at?: string;
};

export type SmsDeliveryMeta = {
  status: string;
  provider?: string | null;
  error?: string | null;
  remainingMs?: number;
};

export type SmsAlertRow = {
  id: string;
  createdAt: string;
  phone: string;
  severity: string;
  status: string;
  provider?: string;
  messagePreview?: string;
  error?: string | null;
  source?: string;
  reportId?: string;
};

export type ImageScanResponse = {
  reportId: string;
  imageUrl: string;
  analysis: ImageAnalysisResult;
  pdf: { url: string; filename: string } | null;
  telegramStatus?: string;
};

export type AegisUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  profile: UserProfile;
  settings: UserSettings;
};

export type HistoryItem = {
  id: string;
  createdAt: string;
  title: string;
  risk: string;
  telegramStatus: string;
  emailStatus: string;
  summary?: string;
  payload?: unknown;
  incidentId?: string;
  reportPdfUrl?: string | null;
  reportFilename?: string | null;
  location?: { lat: number; lng: number } | null;
};

export type HospitalRow = {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  distanceKm: number;
  etaMinutes?: number;
  traumaCenter?: boolean;
  cardiacCenter?: boolean;
  emergency?: boolean;
  directionsUrl: string;
  osmUrl: string;
};
