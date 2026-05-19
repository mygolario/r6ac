import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  role: 'player' | 'team_captain' | 'tournament_admin' | 'super_admin';
  banStatus: 'clean' | 'flagged' | 'banned';
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser | null, accessToken: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: !!user }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
