import type { AegisUser, UserProfile } from '@/types/aegis';

const FIELDS: { key: keyof UserProfile | 'name'; weight: number; check: (u: AegisUser) => boolean }[] = [
  { key: 'name', weight: 10, check: (u) => Boolean(u.name?.trim()) },
  { key: 'gender', weight: 8, check: (u) => Boolean(u.profile?.gender?.trim()) },
  { key: 'dob', weight: 10, check: (u) => Boolean(u.profile?.dob?.trim()) },
  { key: 'bloodGroup', weight: 10, check: (u) => Boolean(u.profile?.bloodGroup?.trim()) },
  { key: 'allergies', weight: 8, check: (u) => (u.profile?.allergies?.length ?? 0) > 0 },
  { key: 'medications', weight: 8, check: (u) => (u.profile?.medications?.length ?? 0) > 0 },
  { key: 'conditions', weight: 8, check: (u) => (u.profile?.conditions?.length ?? 0) > 0 },
  { key: 'emergencyContacts', weight: 12, check: (u) => (u.profile?.emergencyContacts?.length ?? 0) > 0 },
  { key: 'heightCm', weight: 6, check: (u) => Number(u.profile?.heightCm) > 0 },
  { key: 'weightKg', weight: 6, check: (u) => Number(u.profile?.weightKg) > 0 },
  { key: 'insuranceProvider', weight: 7, check: (u) => Boolean(u.profile?.insuranceProvider?.trim()) },
  { key: 'medicalHistory', weight: 7, check: (u) => Boolean(u.profile?.medicalHistory?.trim()) },
];

export function computeProfileCompletion(user: AegisUser | null): number {
  if (!user) return 0;
  let score = 0;
  let total = 0;
  for (const f of FIELDS) {
    total += f.weight;
    if (f.check(user)) score += f.weight;
  }
  return Math.round((score / total) * 100);
}

export function computeBmi(heightCm?: number | string, weightKg?: number | string): number | null {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!h || !w || h < 50) return null;
  const m = h / 100;
  return Math.round((w / (m * m)) * 10) / 10;
}
