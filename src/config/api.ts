import axios from 'axios';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;

// Setup axios interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    // Get token from localStorage (where Zustand persists it)
    const authStorage = localStorage.getItem('spark-auth');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API Endpoints
export const endpoints = {
  // Auth
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    logout: `${API_BASE_URL}/auth/logout`,
    me: `${API_BASE_URL}/auth/me`,
    refresh: `${API_BASE_URL}/auth/refresh`,
    presence: `${API_BASE_URL}/auth/presence`,
  },

  // Jobs
  jobs: {
    list: `${API_BASE_URL}/jobs`,
    stats: `${API_BASE_URL}/jobs/stats`,
    detail: (id: string) => `${API_BASE_URL}/jobs/${id}`,
    export: `${API_BASE_URL}/jobs/export/csv`,
  },

  // Candidates
  candidates: {
    list: `${API_BASE_URL}/candidates`,
    create: `${API_BASE_URL}/candidates`,
    upload: `${API_BASE_URL}/candidates/upload`,
    detail: (id: string) => `${API_BASE_URL}/candidates/${id}`,
    resume: (id: string) => `${API_BASE_URL}/candidates/${id}/resume`,
  },

  // Tasks
  tasks: {
    list: `${API_BASE_URL}/tasks`,
    my: `${API_BASE_URL}/tasks/my`,
    queue: `${API_BASE_URL}/tasks/queue`,
    detail: (id: string) => `${API_BASE_URL}/tasks/${id}`,
    start: (id: string) => `${API_BASE_URL}/tasks/${id}/start`,
    complete: (id: string) => `${API_BASE_URL}/tasks/${id}/complete`,
    fail: (id: string) => `${API_BASE_URL}/tasks/${id}/fail`,
  },

  // Employees
  employees: {
    list: `${API_BASE_URL}/employees`,
    stats: `${API_BASE_URL}/employees/stats`,
    detail: (id: string) => `${API_BASE_URL}/employees/${id}`,
    incidents: (id: string) => `${API_BASE_URL}/employees/${id}/incidents`,
    resetWarnings: (id: string) => `${API_BASE_URL}/employees/${id}/reset-warnings`,
    resetViolations: (id: string) => `${API_BASE_URL}/employees/${id}/reset-violations`,
  },

  // Analytics
  analytics: {
    dashboard: `${API_BASE_URL}/analytics/dashboard`,
    jobs: `${API_BASE_URL}/analytics/jobs`,
    team: `${API_BASE_URL}/analytics/team`,
    trends: `${API_BASE_URL}/analytics/trends`,
  },
};

// WebSocket URL builder
export function getWebSocketUrl(token: string): string {
  return `${WS_BASE_URL}?token=${token}`;
}
