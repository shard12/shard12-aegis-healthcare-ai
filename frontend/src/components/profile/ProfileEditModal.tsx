import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { AegisUser, UserProfile } from '@/types/aegis';
import { computeBmi } from '@/lib/profileCompletion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onClose: () => void;
  user: AegisUser;
  onSave: (payload: { name?: string; profile: Partial<UserProfile> }) => Promise<void>;
  saving?: boolean;
};

function splitList(s: string) {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function ProfileEditModal({ open, onClose, user, onSave, saving }: Props) {
  const [name, setName] = useState(user.name);
  const [draft, setDraft] = useState<UserProfile>({ ...user.profile });

  useEffect(() => {
    if (open) {
      setName(user.name);
      setDraft({ ...user.profile });
    }
  }, [open, user]);

  const bmi = computeBmi(draft.heightCm, draft.weightKg);
  const set = (patch: Partial<UserProfile>) => setDraft((d) => ({ ...d, ...patch }));

  const submit = async () => {
    await onSave({ name, profile: draft });
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 8 }}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/[0.08] bg-[#0a0a0f] p-6 shadow-glass"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold">Edit medical profile</h2>
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Display name</Label>
                <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Gender</Label>
                <Input className="mt-2" placeholder="e.g. Female" value={draft.gender || ''} onChange={(e) => set({ gender: e.target.value })} />
              </div>
              <div>
                <Label>Date of birth</Label>
                <Input className="mt-2" type="date" value={draft.dob || ''} onChange={(e) => set({ dob: e.target.value })} />
              </div>
              <div>
                <Label>Blood group</Label>
                <Input className="mt-2" value={draft.bloodGroup || ''} onChange={(e) => set({ bloodGroup: e.target.value })} />
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input className="mt-2" type="number" value={draft.heightCm ?? ''} onChange={(e) => set({ heightCm: e.target.value })} />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input className="mt-2" type="number" value={draft.weightKg ?? ''} onChange={(e) => set({ weightKg: e.target.value })} />
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2 text-sm text-white/70">
                BMI: <span className="font-bold text-white">{bmi ?? '—'}</span>
              </div>
              <div className="md:col-span-2">
                <Label>Allergies (comma-separated)</Label>
                <Input className="mt-2" value={(draft.allergies || []).join(', ')} onChange={(e) => set({ allergies: splitList(e.target.value) })} />
              </div>
              <div className="md:col-span-2">
                <Label>Current medications</Label>
                <Input className="mt-2" value={(draft.medications || []).join(', ')} onChange={(e) => set({ medications: splitList(e.target.value) })} />
              </div>
              <div className="md:col-span-2">
                <Label>Chronic conditions</Label>
                <Input className="mt-2" value={(draft.conditions || []).join(', ')} onChange={(e) => set({ conditions: splitList(e.target.value) })} />
              </div>
              <div className="md:col-span-2">
                <Label>Emergency contacts (Name: +phone)</Label>
                <Input
                  className="mt-2"
                  placeholder="Jane: +14155551234"
                  value={(draft.emergencyContacts || []).join(', ')}
                  onChange={(e) => set({ emergencyContacts: splitList(e.target.value) })}
                />
              </div>
              <div>
                <Label>Insurance provider</Label>
                <Input className="mt-2" value={draft.insuranceProvider || ''} onChange={(e) => set({ insuranceProvider: e.target.value })} />
              </div>
              <div>
                <Label>Policy / member ID</Label>
                <Input className="mt-2" value={draft.insuranceId || ''} onChange={(e) => set({ insuranceId: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Medical history summary</Label>
                <textarea
                  className="mt-2 min-h-[80px] w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none focus:border-aegis-blue/50"
                  value={draft.medicalHistory || ''}
                  onChange={(e) => set({ medicalHistory: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <textarea
                  className="mt-2 min-h-[60px] w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none"
                  value={draft.notes || ''}
                  onChange={(e) => set({ notes: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" className="flex-1" disabled={saving} onClick={() => void submit()}>
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
