import axios, { AxiosInstance } from 'axios';
import {
  User,
  AuthResponse,
  Calendar,
  CalendarEvent,
  MealEntry,
  VitalsSample,
  Medication,
  MedicationLog,
  ApiResponse,
  CreateCalendarInput,
  CreateEventInput,
  CreateMealInput,
  CreateVitalsInput,
  CreateMedicationInput,
  CreateMedicationLogInput,
  FoodCategory,
  FoodItem,
  FoodStats,
  SleepLog,
  CreateSleepLogInput,
  SleepStats,
  MedicationStats,
  Patient,
  Provider,
  CreateProviderInput,
  ExerciseLog,
  CreateExerciseLogInput,
  ExerciseLogStats,
  HydrationLog,
  CreateHydrationLogInput,
  HydrationStats,
  DailyScore,
  CreateDailyScoreInput,
  DailyScoreStats,
  DailyScoreTrends,
  DeviceConnection,
  DeviceSyncLog,
  UpdateDeviceSettingsInput,
  TriggerSyncInput,
  CalorieSummary,
  DailyCalories,
  WeightCorrelation,
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

  async register(email: string, password: string, name: string, role?: 'patient' | 'therapist' | 'admin'): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('auth/register', { email, password, name, role });
    this.setToken(response.data.token);
    return response.data;
  }

  async getMe(): Promise<User> {
    const response = await this.api.get<User>('auth/me');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await this.api.put<User>('users/profile', data);
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
  async getEvents(calendarIdOrUserId?: number, startDate?: string, endDate?: string, options?: { usePatientId?: boolean }): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();

    // If options.usePatientId is true, treat first param as patientId instead of calendarId
    if (calendarIdOrUserId) {
      if (options?.usePatientId) {
        params.append('patientId', calendarIdOrUserId.toString());
      } else {
        params.append('calendarId', calendarIdOrUserId.toString());
      }
    }

    // Backend expects 'start' and 'end', not 'startDate' and 'endDate'
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);

    // Include related data (exercise, template, creator, patient)
    params.append('includeRelations', 'true');

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

  async updateEvent(id: number, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await this.api.put<CalendarEvent>(`events/${id}`, data);
    return response.data;
  }

  async deleteEvent(id: number): Promise<void> {
    await this.api.delete(`events/${id}`);
  }

  async updateEventStatus(id: number, status: CalendarEvent['status']): Promise<CalendarEvent> {
    const response = await this.api.patch<CalendarEvent>(`events/${id}/status`, { status });
    return response.data;
  }

  // ==================== MEAL ENDPOINTS ====================
  async getMeals(filters?: { startDate?: string; endDate?: string; userId?: number }): Promise<MealEntry[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId.toString());

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

  async updateMealStatus(id: number, status: 'planned' | 'completed' | 'missed'): Promise<MealEntry> {
    const response = await this.api.patch(`meals/${id}/status`, { status });
    return response.data;
  }

  // ==================== VITALS ENDPOINTS ====================
  async getVitals(filters?: { startDate?: string; endDate?: string; userId?: number }): Promise<VitalsSample[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId.toString());

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
  async getMedications(activeOnly: boolean = false, userId?: number): Promise<Medication[]> {
    const params = new URLSearchParams();
    if (activeOnly) params.append('active', 'true');
    if (userId) params.append('userId', userId.toString());

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

  async getMedicationLogs(params?: { startDate?: string; endDate?: string; medicationId?: number; status?: string; userId?: number }): Promise<MedicationLog[]> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.medicationId) searchParams.append('medicationId', params.medicationId.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.userId) searchParams.append('userId', params.userId.toString());

    const response = await this.api.get<ApiResponse<MedicationLog[]>>(`medications/logs?${searchParams.toString()}`);
    return response.data.data;
  }

  async createMedicationLog(medicationId: number, data: CreateMedicationLogInput): Promise<MedicationLog> {
    const response = await this.api.post<MedicationLog>(`medications/${medicationId}/log-dose`, data);
    return response.data;
  }

  async updateMedicationLog(logId: number, data: Partial<CreateMedicationLogInput>): Promise<MedicationLog> {
    const response = await this.api.put<MedicationLog>(`medications/logs/${logId}`, data);
    return response.data;
  }

  async getMedicationStats(startDate?: string, endDate?: string): Promise<MedicationStats> {
    // This will calculate stats from the logs
    const logs = await this.getMedicationLogs({ startDate, endDate });

    const totalLogs = logs.length;
    const taken = logs.filter(l => l.status === 'taken').length;
    const missed = logs.filter(l => l.status === 'missed').length;
    const skipped = logs.filter(l => l.status === 'skipped').length;
    const scheduled = logs.filter(l => l.status === 'scheduled').length;

    const adherenceRate = totalLogs > 0 ? Math.round((taken / totalLogs) * 100) : 0;

    return {
      totalLogs,
      adherenceRate,
      statusDistribution: {
        taken,
        missed,
        skipped,
        scheduled
      },
      trend: 'insufficient_data',
      startDate,
      endDate
    };
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
  async getPatients(): Promise<{ data: Patient[] }> {
    const response = await this.api.get<{ data: Patient[] }>('/patients');
    return response.data;
  }

  async getPatient(patientId: number): Promise<Patient> {
    const response = await this.api.get<Patient>(`/patients/${patientId}`);
    return response.data;
  }

  async updatePatientProfile(patientId: number, data: Partial<Patient>): Promise<Patient> {
    const response = await this.api.put<Patient>(`/patients/${patientId}`, data);
    return response.data;
  }

  async completePatientProfile(data: {
    surgeryDate: string;
    height?: number;
    heightUnit?: string;
    startingWeight?: number;
    weightUnit?: string;
    therapistId?: number;
  }): Promise<Patient> {
    const response = await this.api.post<Patient>('/patients/complete-profile', data);
    return response.data;
  }

  async checkPatientProfile(): Promise<{ hasProfile: boolean; patient?: Patient }> {
    try {
      // Get current user first
      const userData = await this.getMe();
      if (!userData || !userData.id) {
        return { hasProfile: false };
      }

      const response = await this.api.get<{ data: Patient[] }>('/patients', {
        params: { userId: userData.id }
      });
      const patients = response.data.data;
      if (patients && patients.length > 0) {
        return { hasProfile: true, patient: patients[0] };
      }
      return { hasProfile: false };
    } catch (error) {
      return { hasProfile: false };
    }
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

  // ==================== SLEEP LOGS ENDPOINTS ====================
  async getSleepLogs(filters?: { startDate?: string; endDate?: string; date?: string; userId?: number }): Promise<SleepLog[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('start', filters.startDate);
    if (filters?.endDate) params.append('end', filters.endDate);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.userId) params.append('userId', filters.userId.toString());

    const response = await this.api.get<ApiResponse<SleepLog[]>>(`sleep-logs?${params.toString()}`);
    return response.data.data;
  }

  async getSleepLog(id: number): Promise<SleepLog> {
    const response = await this.api.get<SleepLog>(`sleep-logs/${id}`);
    return response.data;
  }

  async getSleepLogByDate(date: string): Promise<SleepLog> {
    const response = await this.api.get<SleepLog>(`sleep-logs/date/${date}`);
    return response.data;
  }

  async createSleepLog(data: CreateSleepLogInput): Promise<SleepLog> {
    const response = await this.api.post<SleepLog>('sleep-logs', data);
    return response.data;
  }

  async updateSleepLog(id: number, data: Partial<CreateSleepLogInput>): Promise<SleepLog> {
    const response = await this.api.put<SleepLog>(`sleep-logs/${id}`, data);
    return response.data;
  }

  async deleteSleepLog(id: number): Promise<void> {
    await this.api.delete(`sleep-logs/${id}`);
  }

  async getSleepStats(startDate?: string, endDate?: string, userId?: number): Promise<SleepStats> {
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    if (userId) params.append('userId', userId.toString());

    const response = await this.api.get<SleepStats>(`sleep-logs/stats?${params.toString()}`);
    return response.data;
  }

  // ==================== EXERCISE LOGS ENDPOINTS ====================
  async getExerciseLogs(filters?: {
    exerciseId?: number;
    prescriptionId?: number;
    startDate?: string;
    endDate?: string;
    userId?: number;
  }): Promise<ExerciseLog[]> {
    const params = new URLSearchParams();
    if (filters?.exerciseId) params.append('exerciseId', filters.exerciseId.toString());
    if (filters?.prescriptionId) params.append('prescriptionId', filters.prescriptionId.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId.toString());

    const response = await this.api.get<ApiResponse<ExerciseLog[]>>(`exercise-logs?${params.toString()}`);
    return response.data.data;
  }

  async getExerciseLog(id: number): Promise<ExerciseLog> {
    const response = await this.api.get<ExerciseLog>(`exercise-logs/${id}`);
    return response.data;
  }

  async createExerciseLog(data: CreateExerciseLogInput): Promise<ExerciseLog> {
    const response = await this.api.post<ExerciseLog>('exercise-logs', data);
    return response.data;
  }

  async updateExerciseLog(id: number, data: Partial<CreateExerciseLogInput>): Promise<ExerciseLog> {
    const response = await this.api.put<ExerciseLog>(`exercise-logs/${id}`, data);
    return response.data;
  }

  async deleteExerciseLog(id: number): Promise<void> {
    await this.api.delete(`exercise-logs/${id}`);
  }

  async getExerciseLogStats(filters?: { startDate?: string; endDate?: string; userId?: number }): Promise<ExerciseLogStats> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId.toString());

    const response = await this.api.get<ExerciseLogStats>(`exercise-logs/stats?${params.toString()}`);
    return response.data;
  }

  // ==================== CALORIES / ENERGY BALANCE ENDPOINTS ====================
  async getCalorieSummary(filters?: { startDate?: string; endDate?: string; userId?: number }): Promise<CalorieSummary> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId.toString());

    const response = await this.api.get<CalorieSummary>(`calories/summary?${params.toString()}`);
    return response.data;
  }

  async getDailyCalories(filters?: { startDate?: string; endDate?: string; userId?: number }): Promise<DailyCalories[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId.toString());

    const response = await this.api.get<{ data: DailyCalories[] }>(`calories/daily?${params.toString()}`);
    return response.data.data;
  }

  async getWeightCorrelation(userId?: number): Promise<WeightCorrelation> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId.toString());

    const response = await this.api.get<WeightCorrelation>(`calories/weight-correlation?${params.toString()}`);
    return response.data;
  }

  // ==================== HYDRATION LOGS ENDPOINTS ====================
  async getHydrationLogs(filters?: { startDate?: string; endDate?: string; date?: string; userId?: number }): Promise<HydrationLog[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.userId) params.append('userId', filters.userId.toString());

    const response = await this.api.get<ApiResponse<HydrationLog[]>>(`hydration-logs?${params.toString()}`);
    return response.data.data;
  }

  async getHydrationLog(id: number): Promise<HydrationLog> {
    const response = await this.api.get<HydrationLog>(`hydration-logs/${id}`);
    return response.data;
  }

  async getHydrationLogByDate(date: string, userId?: number): Promise<HydrationLog> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId.toString());

    const response = await this.api.get<HydrationLog>(`hydration-logs/date/${date}?${params.toString()}`);
    return response.data;
  }

  async createHydrationLog(data: CreateHydrationLogInput): Promise<HydrationLog> {
    const response = await this.api.post<HydrationLog>('hydration-logs', data);
    return response.data;
  }

  async updateHydrationLog(id: number, data: Partial<CreateHydrationLogInput>): Promise<HydrationLog> {
    const response = await this.api.put<HydrationLog>(`hydration-logs/${id}`, data);
    return response.data;
  }

  async deleteHydrationLog(id: number): Promise<void> {
    await this.api.delete(`hydration-logs/${id}`);
  }

  async getHydrationStats(filters?: { startDate?: string; endDate?: string; userId?: number }): Promise<HydrationStats> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId.toString());

    const response = await this.api.get<HydrationStats>(`hydration-logs/stats?${params.toString()}`);
    return response.data;
  }

  // ==================== DAILY SCORES ENDPOINTS ====================
  async getDailyScores(filters?: { startDate?: string; endDate?: string; minScore?: number; maxScore?: number; userId?: number }): Promise<DailyScore[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.minScore !== undefined) params.append('minScore', filters.minScore.toString());
    if (filters?.maxScore !== undefined) params.append('maxScore', filters.maxScore.toString());
    if (filters?.userId) params.append('userId', filters.userId.toString());

    const response = await this.api.get<ApiResponse<DailyScore[]>>(`daily-scores?${params.toString()}`);
    return response.data.data;
  }

  async getDailyScore(id: number): Promise<DailyScore> {
    const response = await this.api.get<DailyScore>(`daily-scores/${id}`);
    return response.data;
  }

  async getDailyScoreByDate(date: string, userId?: number): Promise<DailyScore> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId.toString());

    const response = await this.api.get<DailyScore>(`daily-scores/date/${date}?${params.toString()}`);
    return response.data;
  }

  async createOrUpdateDailyScore(data: CreateDailyScoreInput): Promise<DailyScore> {
    const response = await this.api.post<DailyScore>('daily-scores', data);
    return response.data;
  }

  async deleteDailyScore(id: number): Promise<void> {
    await this.api.delete(`daily-scores/${id}`);
  }

  async getDailyScoreStats(filters?: { startDate?: string; endDate?: string; userId?: number }): Promise<DailyScoreStats> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId.toString());

    const response = await this.api.get<DailyScoreStats>(`daily-scores/stats?${params.toString()}`);
    return response.data;
  }

  async getDailyScoreTrends(filters?: { startDate?: string; endDate?: string; interval?: 'day' | 'week'; userId?: number }): Promise<DailyScoreTrends> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.interval) params.append('interval', filters.interval);
    if (filters?.userId) params.append('userId', filters.userId.toString());

    const response = await this.api.get<DailyScoreTrends>(`daily-scores/trends?${params.toString()}`);
    return response.data;
  }

  // ==================== DEVICE CONNECTIONS ENDPOINTS ====================
  async getDevices(): Promise<DeviceConnection[]> {
    const response = await this.api.get<ApiResponse<DeviceConnection[]>>('devices');
    return response.data.data;
  }

  async getDevice(id: number): Promise<DeviceConnection> {
    const response = await this.api.get<ApiResponse<DeviceConnection>>(`devices/${id}`);
    return response.data.data;
  }

  async deleteDevice(id: number): Promise<void> {
    await this.api.delete(`devices/${id}`);
  }

  async updateDeviceSettings(id: number, settings: UpdateDeviceSettingsInput): Promise<DeviceConnection> {
    const response = await this.api.put<ApiResponse<DeviceConnection>>(`devices/${id}/settings`, settings);
    return response.data.data;
  }

  async getSyncHistory(deviceId: number, limit: number = 20): Promise<DeviceSyncLog[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    const response = await this.api.get<ApiResponse<DeviceSyncLog[]>>(`devices/${deviceId}/sync-history?${params.toString()}`);
    return response.data.data;
  }

  async getLatestDeviceVitals(): Promise<any> {
    try {
      const response = await this.api.get<ApiResponse<any>>('devices/vitals/latest');
      return response.data.data;
    } catch (error) {
      // Return null if no vitals available (devices not connected)
      return null;
    }
  }

  async triggerDeviceSync(deviceId: number, data?: TriggerSyncInput): Promise<DeviceSyncLog> {
    const response = await this.api.post<ApiResponse<DeviceSyncLog>>(`devices/${deviceId}/sync`, data || {});
    return response.data.data;
  }

  async initiatePolarAuth(): Promise<{ authUrl: string }> {
    const response = await this.api.get<ApiResponse<{ authUrl: string }>>('polar/auth');
    return response.data.data;
  }

  async initiateSamsungAuth(): Promise<{ authUrl: string }> {
    const response = await this.api.get<ApiResponse<{ authUrl: string }>>('samsung/auth');
    return response.data.data;
  }

  async initiateStravaAuth(): Promise<{ authUrl: string }> {
    const response = await this.api.get<ApiResponse<{ authUrl: string }>>('strava/auth');
    return response.data.data;
  }

  // ==================== PROVIDERS ENDPOINTS ====================
  async getProviders(): Promise<Provider[]> {
    const response = await this.api.get<ApiResponse<Provider[]>>('providers');
    return response.data.data;
  }

  async getProvider(id: number): Promise<Provider> {
    const response = await this.api.get<ApiResponse<Provider>>(`providers/${id}`);
    return response.data.data;
  }

  async addProvider(data: CreateProviderInput): Promise<Provider> {
    const response = await this.api.post<ApiResponse<Provider>>('providers', data);
    return response.data.data;
  }

  async updateProvider(id: number, data: Partial<CreateProviderInput>): Promise<Provider> {
    const response = await this.api.put<ApiResponse<Provider>>(`providers/${id}`, data);
    return response.data.data;
  }

  async deleteProvider(id: number): Promise<void> {
    await this.api.delete(`providers/${id}`);
  }

  async getUpcomingAppointments(): Promise<Provider[]> {
    const response = await this.api.get<ApiResponse<Provider[]>>('providers/upcoming');
    return response.data.data;
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;
