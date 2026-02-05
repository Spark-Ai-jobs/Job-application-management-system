import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { endpoints } from '../config/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  status: 'available' | 'busy' | 'offline';
  avatarUrl?: string;
  warnings: number;
  violations: number;
  tasksCompleted: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updatePresence: (status: 'available' | 'busy' | 'offline') => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(endpoints.auth.login, { email, password });
          const { user, token } = response.data;

          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          const message = axios.isAxiosError(error)
            ? error.response?.data?.message || 'Login failed'
            : 'Login failed';
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      logout: async () => {
        try {
          const token = get().token;
          if (token) {
            await axios.post(endpoints.auth.logout, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        } catch {
          // Ignore logout errors
        } finally {
          delete axios.defaults.headers.common['Authorization'];
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get(endpoints.auth.me);
          // /auth/me returns user data directly (not wrapped in {user: ...})
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          delete axios.defaults.headers.common['Authorization'];
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      updatePresence: async (status: 'available' | 'busy' | 'offline') => {
        try {
          await axios.put(endpoints.auth.presence, { status });
          const user = get().user;
          if (user) {
            set({ user: { ...user, status } });
          }
        } catch {
          // Ignore presence update errors
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'spark-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
