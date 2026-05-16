import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { applyAegisTheme } from '@/lib/applyAegisTheme';
import { setStoredLocale } from '@/i18n/locale';
import { PageFallback } from '@/components/PageFallback';

const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const SOSPage = lazy(() => import('@/pages/SOSPage').then((m) => ({ default: m.SOSPage })));
const HospitalsPage = lazy(() => import('@/pages/HospitalsPage').then((m) => ({ default: m.HospitalsPage })));
const MedicinesPage = lazy(() => import('@/pages/MedicinesPage').then((m) => ({ default: m.MedicinesPage })));
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const RiskPage = lazy(() => import('@/pages/RiskPage').then((m) => ({ default: m.RiskPage })));
const TriagePage = lazy(() => import('@/pages/TriagePage').then((m) => ({ default: m.TriagePage })));
const FirstAidPage = lazy(() => import('@/pages/FirstAidPage').then((m) => ({ default: m.FirstAidPage })));
const ScannerPage = lazy(() => import('@/pages/ScannerPage').then((m) => ({ default: m.ScannerPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ReportViewPage = lazy(() => import('@/pages/ReportViewPage').then((m) => ({ default: m.ReportViewPage })));
const HelpPage = lazy(() => import('@/pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const TermsPage = lazy(() => import('@/pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));

function ThemeLanguageEffects() {
  const settings = useAuthStore((s) => s.user?.settings);

  useEffect(() => {
    applyAegisTheme(settings);

    if (settings?.language) {
      setStoredLocale(settings.language);
    }
  }, [settings]);

  return null;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <>
      <ThemeLanguageEffects />

      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* PUBLIC REPORT ROUTE */}
          <Route path="/reports/view/:token" element={<ReportViewPage />} />

          {/* PROTECTED APP */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="sos" element={<SOSPage />} />
            <Route path="hospitals" element={<HospitalsPage />} />
            <Route path="medicines" element={<MedicinesPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="risk" element={<RiskPage />} />
            <Route path="triage" element={<TriagePage />} />
            <Route path="scanner" element={<ScannerPage />} />
            <Route path="first-aid" element={<FirstAidPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
          </Route>

          {/* SAFE FALLBACK */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Suspense>
    </>
  );
}