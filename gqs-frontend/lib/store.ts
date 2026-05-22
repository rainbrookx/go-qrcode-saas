import { create } from "zustand";
import api, { setTokens, clearTokens } from "./api";

interface User {
  id: number;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  register: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const res = await api.post("/auth/login", {
      grant_type: "password",
      email,
      password,
    });
    const data = res.data.data;
    setTokens(data.access_token, data.refresh_token);
    set({ user: data.user });
  },

  loginWithCode: async (email, code) => {
    const res = await api.post("/auth/login", {
      grant_type: "email_code",
      email,
      code,
    });
    const data = res.data.data;
    setTokens(data.access_token, data.refresh_token);
    set({ user: data.user });
  },

  register: async (email, password, confirmPassword) => {
    await api.post("/auth/register", {
      email,
      password,
      confirm_password: confirmPassword,
    });
  },

  logout: () => {
    clearTokens();
    set({ user: null });
  },

  fetchMe: async () => {
    try {
      const res = await api.get("/auth/me");
      set({ user: res.data.data, loading: false });
    } catch {
      clearTokens();
      set({ user: null, loading: false });
    }
  },

  setUser: (user) => set({ user, loading: false }),
}));
