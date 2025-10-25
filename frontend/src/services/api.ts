import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';

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
  getCalendars: () => api.get('/calendars').then(res => res.data),
  createCalendar: (data: any) => api.post('/calendars', data).then(res => res.data),
  updateCalendar: (id: number, data: any) => api.put(`/calendars/${id}`, data).then(res => res.data),
  deleteCalendar: (id: number) => api.delete(`/calendars/${id}`).then(res => res.data),
};

// Events API
export const eventsAPI = {
  getEvents: (params?: { calendarId?: number; start?: string; end?: string }) =>
    api.get('/events', { params }).then(res => res.data),
  createEvent: (data: any) => api.post('/events', data).then(res => res.data),
  updateEvent: (id: number, data: any) => api.put(`/events/${id}`, data).then(res => res.data),
  deleteEvent: (id: number) => api.delete(`/events/${id}`).then(res => res.data),
};

// Meals API
export const mealsAPI = {
  getMeals: (params?: { userId?: number; date?: string }) =>
    api.get('/meals', { params }).then(res => res.data),
  addMeal: (data: any) => api.post('/meals', data).then(res => res.data),
  updateMeal: (id: number, data: any) => api.put(`/meals/${id}`, data).then(res => res.data),
  deleteMeal: (id: number) => api.delete(`/meals/${id}`).then(res => res.data),
  getCompliance: (userId: number, date: string) =>
    api.get(`/meals/compliance`, { params: { userId, date } }).then(res => res.data),
};

// Vitals API
export const vitalsAPI = {
  getVitals: (params?: { userId?: number; start?: string; end?: string }) =>
    api.get('/vitals', { params }).then(res => res.data),
  addVital: (data: any) => api.post('/vitals', data).then(res => res.data),
  updateVital: (id: number, data: any) => api.put(`/vitals/${id}`, data).then(res => res.data),
  deleteVital: (id: number) => api.delete(`/vitals/${id}`).then(res => res.data),
  getLatest: (userId: number) => api.get(`/vitals/latest`, { params: { userId } }).then(res => res.data),
};

// Medications API
export const medicationsAPI = {
  getMedications: (params?: { userId?: number; active?: boolean }) =>
    api.get('/medications', { params }).then(res => res.data),
  addMedication: (data: any) => api.post('/medications', data).then(res => res.data),
  updateMedication: (id: number, data: any) => api.put(`/medications/${id}`, data).then(res => res.data),
  deleteMedication: (id: number) => api.delete(`/medications/${id}`).then(res => res.data),
  toggleActive: (id: number) => api.patch(`/medications/${id}/toggle`).then(res => res.data),
};

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('auth/login', { email, password }).then(res => res.data),
  logout: () => api.post('auth/logout').then(res => res.data),
  getMe: () => api.get('auth/me').then(res => res.data),
  updateProfile: (data: any) => api.put('auth/profile', data).then(res => res.data),
  googleAuth: () => window.location.href = `${API_BASE_URL}/auth/google`,
  appleAuth: () => window.location.href = `${API_BASE_URL}/auth/apple`,
};

// Reports API
export const reportsAPI = {
  getHealthSummary: (userId: number, start: string, end: string) =>
    api.get('/reports/health-summary', { params: { userId, start, end } }).then(res => res.data),
  getComplianceReport: (userId: number, period: string) =>
    api.get('/reports/compliance', { params: { userId, period } }).then(res => res.data),
  exportData: (userId: number, format: 'pdf' | 'csv') =>
    api.get('/reports/export', { params: { userId, format }, responseType: 'blob' }).then(res => res.data),
};

export default api;