import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Calendar API
export const calendarAPI = {
  getCalendars: () => api.get('/calendars'),
  createCalendar: (data: any) => api.post('/calendars', data),
  updateCalendar: (id: number, data: any) => api.put(`/calendars/${id}`, data),
  deleteCalendar: (id: number) => api.delete(`/calendars/${id}`),
};

// Events API
export const eventsAPI = {
  getEvents: (params?: { calendarId?: number; start?: string; end?: string }) =>
    api.get('/events', { params }),
  createEvent: (data: any) => api.post('/events', data),
  updateEvent: (id: number, data: any) => api.put(`/events/${id}`, data),
  deleteEvent: (id: number) => api.delete(`/events/${id}`),
};

// Meals API
export const mealsAPI = {
  getMeals: (params?: { userId?: number; date?: string }) =>
    api.get('/meals', { params }),
  addMeal: (data: any) => api.post('/meals', data),
  updateMeal: (id: number, data: any) => api.put(`/meals/${id}`, data),
  deleteMeal: (id: number) => api.delete(`/meals/${id}`),
  getCompliance: (userId: number, date: string) =>
    api.get(`/meals/compliance`, { params: { userId, date } }),
};

// Vitals API
export const vitalsAPI = {
  getVitals: (params?: { userId?: number; start?: string; end?: string }) =>
    api.get('/vitals', { params }),
  addVital: (data: any) => api.post('/vitals', data),
  updateVital: (id: number, data: any) => api.put(`/vitals/${id}`, data),
  deleteVital: (id: number) => api.delete(`/vitals/${id}`),
  getLatest: (userId: number) => api.get(`/vitals/latest`, { params: { userId } }),
};

// Medications API
export const medicationsAPI = {
  getMedications: (params?: { userId?: number; active?: boolean }) =>
    api.get('/medications', { params }),
  addMedication: (data: any) => api.post('/medications', data),
  updateMedication: (id: number, data: any) => api.put(`/medications/${id}`, data),
  deleteMedication: (id: number) => api.delete(`/medications/${id}`),
  toggleActive: (id: number) => api.patch(`/medications/${id}/toggle`),
};

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  googleAuth: () => window.location.href = `${API_BASE_URL}/auth/google`,
  appleAuth: () => window.location.href = `${API_BASE_URL}/auth/apple`,
};

// Reports API
export const reportsAPI = {
  getHealthSummary: (userId: number, start: string, end: string) =>
    api.get('/reports/health-summary', { params: { userId, start, end } }),
  getComplianceReport: (userId: number, period: string) =>
    api.get('/reports/compliance', { params: { userId, period } }),
  exportData: (userId: number, format: 'pdf' | 'csv') =>
    api.get('/reports/export', { params: { userId, format }, responseType: 'blob' }),
};

export default api;