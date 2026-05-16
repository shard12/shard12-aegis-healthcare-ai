import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { saveProfile } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/hooks/useI18n';
import { computeProfileCompletion, computeBmi } from '@/lib/profileCompletion';
import { ProfileEditModal } from '@/components/profile/ProfileEditModal';
import { ProfileCompletionRing } from '@/components/profile/ProfileCompletionRing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserProfile } from '@/types/aegis';

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
      <div className="text-[10px] font-extrabold tracking-widest text-white/40">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white/85">{value}</div>
    </div>
  );
}

export function ProfilePage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: saveProfile,
    onSuccess: (u) => {
      setUser(u);
      qc.invalidateQueries();
    },
  });

  if (!user) return null;

  const p = user.profile;
  const completion = computeProfileCompletion(user);
  const bmi = computeBmi(p.heightCm, p.weightKg);

  const onSave = async (payload: { name?: string; profile: Partial<UserProfile> }) => {
    await mut.mutateAsync(payload);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">{t('profile.kicker')}</div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t('profile.title')}</h1>
          <p className="mt-2 text-sm text-white/55">{t('profile.completionHint')}</p>
        </div>
        <ProfileCompletionRing percent={completion} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('profile.operator')}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('profile.editFull')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-aegis-blue/35 to-aegis-red/25 text-xl font-extrabold">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-extrabold">{user.name}</div>
              <div className="text-sm text-white/55">{user.email}</div>
              {completion < 100 ? (
                <Badge className="mt-2 border-aegis-warning/30 text-aegis-warning">{t('profile.incomplete')}</Badge>
              ) : (
                <Badge className="mt-2 border-emerald-500/30 text-emerald-400">{t('profile.complete')}</Badge>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label={t('profile.gender')} value={p.gender || ''} />
            <InfoRow label={t('profile.dob')} value={p.dob || ''} />
            <InfoRow label={t('profile.bloodGroup')} value={p.bloodGroup || ''} />
            <InfoRow label={t('profile.height')} value={p.heightCm ? `${p.heightCm} cm` : ''} />
            <InfoRow label={t('profile.weight')} value={p.weightKg ? `${p.weightKg} kg` : ''} />
            <InfoRow label={t('profile.bmi')} value={bmi != null ? String(bmi) : ''} />
            <InfoRow label={t('profile.allergies')} value={(p.allergies || []).join(', ')} />
            <InfoRow label={t('profile.medications')} value={(p.medications || []).join(', ')} />
            <InfoRow label={t('profile.conditions')} value={(p.conditions || []).join(', ')} />
            <InfoRow label={t('profile.emergencyContacts')} value={(p.emergencyContacts || []).join(' · ')} />
            <InfoRow label={t('profile.insurance')} value={[p.insuranceProvider, p.insuranceId].filter(Boolean).join(' — ')} />
            <InfoRow label={t('profile.medicalHistory')} value={p.medicalHistory || ''} />
            <InfoRow label={t('profile.notes')} value={p.notes || ''} />
          </div>
        </CardContent>
      </Card>

      <ProfileEditModal open={open} onClose={() => setOpen(false)} user={user} onSave={onSave} saving={mut.isPending} />
    </div>
  );
}
