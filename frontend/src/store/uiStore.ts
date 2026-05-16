import { create } from 'zustand';
import type { TriageEnvelope } from '@/types/aegis';

type UiState = {
  lastEnvelope: TriageEnvelope | null;
  setLastEnvelope: (e: TriageEnvelope | null) => void;
  sosOpen: boolean;
  setSosOpen: (v: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  lastEnvelope: null,
  setLastEnvelope: (lastEnvelope) => set({ lastEnvelope }),
  sosOpen: false,
  setSosOpen: (sosOpen) => set({ sosOpen }),
}));
