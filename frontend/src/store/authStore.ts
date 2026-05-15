import { create } from 'zustand';
import type { AegisUser } from '@/types/aegis';
import { fetchMe, login as apiLogin, register as apiRegister } from '@/services/api';

type AuthState = {
  token: string | null;
  user: AegisUser | null;
  bootstrapped: boolean;
  setUser: (u: AegisUser | null) => void;
  setToken: (t: string | null) => void;
  bootstrap: () => Promise<void>;
  oauthComplete: (token: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('aegis_token') : null,
  user: null,
  bootstrapped: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('aegis_token', token);
    else localStorage.removeItem('aegis_token');
    set({ token });
  },
  bootstrap: async () => {
    const token = get().token;
    if (!token) {
      set({ bootstrapped: true, user: null });
      return;
    }
    try {
      const user = await fetchMe();
      set({ user, bootstrapped: true });
    } catch {
      localStorage.removeItem('aegis_token');
      set({ user: null, token: null, bootstrapped: true });
    }
  },
  oauthComplete: async (token) => {
    localStorage.setItem('aegis_token', token);
    const user = await fetchMe();
    set({ token, user, bootstrapped: true });
  },
  login: async (email, password) => {
    const { token, user } = await apiLogin(email, password);
    get().setToken(token);
    set({ user });
  },
  register: async (email, password, name) => {
    const { token, user } = await apiRegister(email, password, name);
    get().setToken(token);
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('aegis_token');
    set({ token: null, user: null });
  },
}));
