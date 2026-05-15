import { useQuery } from '@tanstack/react-query';
import { checkBackendHealth } from '@/services/api';

export function BackendBanner() {
  const q = useQuery({
    queryKey: ['backend-health'],
    queryFn: checkBackendHealth,
    refetchInterval: 15_000,
    retry: false,
  });

  if (q.isLoading || q.data) return null;

  return (
    <div className="border-b border-aegis-warning/40 bg-aegis-warning/10 px-4 py-2 text-center text-xs font-bold text-aegis-warning">
      API offline — run <code className="rounded bg-black/40 px-1">cd backend && npm run dev</code> (port 8787). PDF, hospitals, and Telegram need the backend.
    </div>
  );
}
