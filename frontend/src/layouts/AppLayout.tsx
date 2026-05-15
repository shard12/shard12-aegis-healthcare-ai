import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopNav } from '@/components/nav/TopNav';
import { SidebarNav } from '@/components/nav/SidebarNav';
import { FloatingSOS } from '@/components/floating/FloatingSOS';
import { FloatingChat } from '@/components/floating/FloatingChat';
import { useAuthStore } from '@/store/authStore';
import { BackendBanner } from '@/components/BackendBanner';

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  useEffect(() => {
    const s = user?.settings;
    if (!s) return;
    const root = document.documentElement;
    root.classList.toggle('large-text', Boolean(s.largeText));
  }, [user?.settings]);

  return (
    <div className="aegis-app-shell flex min-h-full bg-grid-fade">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <BackendBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <FloatingChat />
      <FloatingSOS />
    </div>
  );
}
