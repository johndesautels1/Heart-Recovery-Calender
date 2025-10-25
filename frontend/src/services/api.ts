import axios, { AxiosInstance } from 'axios';
import {
  User,
  AuthResponse,
  Calendar,
  CalendarEvent,
  MealEntry,
  VitalsSample,
  Medication,
  ApiResponse,
  CreateCalendarInput,
  CreateEventInput,
  CreateMealInput,
  CreateVitalsInput,
  CreateMedicationInput,
  FoodCategory,
  FoodItem,
  FoodStats,
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    const baseURL = 'http://localhost:4000/api';
    console.log('🔧 API BaseURL:', baseURL);
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage on initialization
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      this.setToken(savedToken);
    }

    // Request interceptor to add token
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  getToken() {
    return this.token;
  }

  // ==================== AUTH ENDPOINTS ====================
  async login(email: string, password: string): Promise<AuthResponse> {
    console.log('🔐 Attempting login to: auth/login');
    const response = await this.api.post<AuthResponse>('auth/login', { email, password });
    this.setToken(response.data.token);
    return response.data;
  }

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('auth/register', { email, password, name });
    this.setToken(response.data.token);
    return response.data;
  }

  async getMe(): Promise<User> {
    const response = await this.api.get<User>('auth/me');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await this.api.put<User>('auth/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.api.put<{ message: string }>('auth/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  logout() {
    this.clearToken();
  }

  // ==================== CALENDAR ENDPOINTS ====================
  async getCalendars(): Promise<Calendar[]> {
    const response = await this.api.get<ApiResponse<Calendar[]>>('calendars');
    return response.data.data;
  }

  async getCalendar(id: number): Promise<Calendar> {
    const response = await this.api.get<Calendar>(`calendars/${id}`);
    return response.data;
  }

  async createCalendar(data: CreateCalendarInput): Promise<Calendar> {
    const response = await this.api.post<Calendar>('calendars', data);
    return response.data;
  }

  async updateCalendar(id: number, data: Partial<CreateCalendarInput>): Promise<Calendar> {
    const response = await this.api.put<Calendar>(`calendars/${id}`, data);
    return response.data;
  }

  async deleteCalendar(id: number): Promise<void> {
    await this.api.delete(`calendars/${id}`);
  }

  // ==================== CALENDAR EVENT ENDPOINTS ====================
  async getEvents(calendarId?: number, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    if (calendarId) params.append('calendarId', calendarId.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await this.api.get<ApiResponse<CalendarEvent[]>>(`events?${params.toString()}`);
    return response.data.data;
  }

  async getEvent(id: number): Promise<CalendarEvent> {
    const response = await this.api.get<CalendarEvent>(`events/${id}`);
    return response.data;
  }

  async createEvent(data: CreateEventInput): Promise<CalendarEvent> {
    const response = await this.api.post<CalendarEvent>('events', data);
    return response.data;
  }

  async updateEvent(id: number, data: Partial<CreateEventInput>): Promise<CalendarEvent> {
    const response = await this.api.put<CalendarEvent>(`events/${id}`, data);
    return response.data;
  }

  async deleteEvent(id: number): Promise<void> {
    await this.api.delete(`events/${id}`);
  }

  async updateEventStatus(id: number, status: CalendarEvent['status']): Promise<CalendarEvent> {
    const response = await this.api.put<CalendarEvent>(`events/${id}/status`, { status });
    return response.data;
  }

  // ==================== MEAL ENDPOINTS ====================
  async getMeals(filters?: { startDate?: string; endDate?: string }): Promise<MealEntry[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await this.api.get<ApiResponse<MealEntry[]>>(`meals?${params.toString()}`);
    return response.data.data;
  }

  async getMeal(id: number): Promise<MealEntry> {
    const response = await this.api.get<MealEntry>(`meals/${id}`);
    return response.data;
  }

  async createMeal(data: CreateMealInput): Promise<MealEntry> {
    const response = await this.api.post<MealEntry>('meals', data);
    return response.data;
  }

  async updateMeal(id: number, data: Partial<CreateMealInput>): Promise<MealEntry> {
    const response = await this.api.put<MealEntry>(`meals/${id}`, data);
    return response.data;
  }

  async deleteMeal(id: number): Promise<void> {
    await this.api.delete(`meals/${id}`);
  }

  // ==================== VITALS ENDPOINTS ====================
  async getVitals(filters?: { startDate?: string; endDate?: string }): Promise<VitalsSample[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await this.api.get<ApiResponse<VitalsSample[]>>(`vitals?${params.toString()}`);
    return response.data.data;
  }

  async getVital(id: number): Promise<VitalsSample> {
    const response = await this.api.get<VitalsSample>(`vitals/${id}`);
    return response.data;
  }

  async createVital(data: CreateVitalsInput): Promise<VitalsSample> {
    const response = await this.api.post<VitalsSample>('vitals', data);
    return response.data;
  }

  async updateVital(id: number, data: Partial<CreateVitalsInput>): Promise<VitalsSample> {
    const response = await this.api.put<VitalsSample>(`vitals/${id}`, data);
    return response.data;
  }

  async deleteVital(id: number): Promise<void> {
    await this.api.delete(`vitals/${id}`);
  }

  async getLatestVital(): Promise<VitalsSample | null> {
    const response = await this.api.get<VitalsSample>('/vitals/latest');
    return response.data;
  }

  // ==================== MEDICATION ENDPOINTS ====================
  async getMedications(activeOnly: boolean = false): Promise<Medication[]> {
    const params = new URLSearchParams();
    if (activeOnly) params.append('active', 'true');

    const response = await this.api.get<ApiResponse<Medication[]>>(`medications?${params.toString()}`);
    return response.data.data;
  }

  async getMedication(id: number): Promise<Medication> {
    const response = await this.api.get<Medication>(`medications/${id}`);
    return response.data;
  }

  async createMedication(data: CreateMedicationInput): Promise<Medication> {
    const response = await this.api.post<Medication>('medications', data);
    return response.data;
  }

  async updateMedication(id: number, data: Partial<CreateMedicationInput>): Promise<Medication> {
    const response = await this.api.put<Medication>(`medications/${id}`, data);
    return response.data;
  }

  async deleteMedication(id: number): Promise<void> {
    await this.api.delete(`medications/${id}`);
  }

  async toggleMedicationActive(id: number): Promise<Medication> {
    const response = await this.api.put<Medication>(`medications/${id}/toggle-active`);
    return response.data;
  }

  // ==================== ANALYTICS ENDPOINTS ====================
  async getComplianceData(startDate: string, endDate: string) {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await this.api.get(`analytics/compliance?${params.toString()}`);
    return response.data;
  }

  async getVitalsTrends(startDate: string, endDate: string, metric: string) {
    const params = new URLSearchParams({ startDate, endDate, metric });
    const response = await this.api.get(`analytics/vitals-trends?${params.toString()}`);
    return response.data;
  }

  async exportReport(startDate: string, endDate: string, format: 'pdf' | 'csv' = 'pdf') {
    const params = new URLSearchParams({ startDate, endDate, format });
    const response = await this.api.get(`analytics/export?${params.toString()}`, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `health-report-${startDate}-to-${endDate}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // ==================== THERAPIST ENDPOINTS (Future) ====================
  async getPatients(): Promise<User[]> {
    const response = await this.api.get<ApiResponse<User[]>>('/therapist/patients');
    return response.data.data;
  }

  async getPatientData(patientId: number, dataType: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await this.api.get(`therapist/patients/${patientId}/${dataType}?${params.toString()}`);
    return response.data;
  }

  async createPatientEvent(patientId: number, data: CreateEventInput): Promise<CalendarEvent> {
    const response = await this.api.post<CalendarEvent>(`therapist/patients/${patientId}/events`, data);
    return response.data;
  }

  // ==================== FOOD DATABASE ENDPOINTS ====================
  async getFoodCategories(): Promise<FoodCategory[]> {
    const response = await this.api.get<FoodCategory[]>('food-categories');
    return response.data;
  }

  async getFoodCategory(id: number): Promise<FoodCategory> {
    const response = await this.api.get<FoodCategory>(`food-categories/${id}`);
    return response.data;
  }

  async getFoodItems(params?: {
    categoryId?: number;
    healthRating?: 'green' | 'yellow' | 'red';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: FoodItem[]; limit: number | null; offset: number }> {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId.toString());
    if (params?.healthRating) queryParams.append('healthRating', params.healthRating);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await this.api.get<{ total: number; items: FoodItem[]; limit: number | null; offset: number }>(
      `food-items?${queryParams.toString()}`
    );
    return response.data;
  }

  async searchFoodItems(query: string, categoryId?: number, healthRating?: string): Promise<FoodItem[]> {
    const params = new URLSearchParams({ q: query });
    if (categoryId) params.append('categoryId', categoryId.toString());
    if (healthRating) params.append('healthRating', healthRating);

    const response = await this.api.get<FoodItem[]>(`food-items/search?${params.toString()}`);
    return response.data;
  }

  async getFoodItemsByCategory(categoryId: number): Promise<FoodItem[]> {
    const response = await this.api.get<FoodItem[]>(`food-items/category/${categoryId}`);
    return response.data;
  }

  async getFoodItemsByHealthRating(rating: 'green' | 'yellow' | 'red'): Promise<FoodItem[]> {
    const response = await this.api.get<FoodItem[]>(`food-items/rating/${rating}`);
    return response.data;
  }

  async getFoodStats(): Promise<FoodStats> {
    const response = await this.api.get<FoodStats>('food-items/stats');
    return response.data;
  }

  async getFoodItem(id: number): Promise<FoodItem> {
    const response = await this.api.get<FoodItem>(`food-items/${id}`);
    return response.data;
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;
