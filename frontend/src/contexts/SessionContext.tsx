import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

/**
 * User interface matching backend User model
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'therapist' | 'admin';
  surgeryDate?: string;
  therapistId?: string;
  medicalData?: MedicalData;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Medical data stored in User.medicalData JSONB field
 * Replaces the old Patient model with flexible schema
 */
export interface MedicalData {
  demographics?: {
    firstName?: string;
    lastName?: string;
    age?: number;
    race?: string;
    nationality?: string;
  };
  contact?: {
    primaryPhone?: string;
    primaryPhoneType?: string;
    preferredContactMethod?: string;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;
  measurements?: {
    height?: number;
    weight?: number;
  };
  surgery?: {
    procedures?: string[];
    devices?: string[];
    surgeon?: string;
    hospital?: string;
    dischargeDate?: string;
  };
  history?: {
    priorConditions?: string[];
    allergies?: string[];
    diagnosisDate?: string;
  };
  cardiac?: {
    conditions?: string[];
    vitals?: {
      restingHR?: number;
      maxHR?: number;
      ejectionFraction?: number;
    };
  };
  devices?: {
    polarDeviceId?: string;
    preferredDataSource?: string;
  };
  telehealth?: {
    zoomHandle?: string;
  };
}

/**
 * Patient data structure (legacy format from api.checkPatientProfile)
 * Will be deprecated once frontend fully uses User.medicalData
 */
export interface Patient {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  // ... other legacy fields
  [key: string]: any;
}

/**
 * Session context state and methods
 * Merges AuthContext + PatientSelectionContext to eliminate redundant API calls
 */
export interface SessionContextType {
  // Authentication state
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Patient profile state (legacy - will transition to medicalData)
  hasPatientProfile: boolean;
  selectedPatient: Patient | null;

  // Derived state helpers
  isTherapist: boolean;
  isAdmin: boolean;
  isPatient: boolean;
  surgeryDate: string | null;
  patientData: MedicalData | null;

  // Authentication methods
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;

  // Patient selection (for therapists viewing patient data)
  setSelectedPatient: (patient: Patient | null) => void;
  isViewingAsTherapist: boolean;

  // Profile refresh (single call instead of 2-3 redundant calls)
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

/**
 * SessionProvider - Unified authentication and patient selection state
 *
 * Replaces:
 * - AuthContext (authentication, user state)
 * - PatientSelectionContext (patient selection for therapists)
 *
 * Benefits:
 * - Single API call to checkPatientProfile (was 2-3 redundant calls)
 * - Centralized session state
 * - Derived state helpers (isTherapist, surgeryDate, etc.)
 * - Cleaner component imports (one hook instead of two)
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  // Core state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPatientProfile, setHasPatientProfile] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  /**
   * Load user from localStorage and verify token on mount
   */
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);

          // Verify token is still valid by fetching fresh user data
          const response = await api.get('/users/me');
          if (response.data) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error('[SessionContext] Failed to load user:', error);
          // Token invalid, clear auth state
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    loadUser();
  }, []);

  /**
   * Check patient profile when user changes
   * SINGLE API CALL - eliminates redundancy from Auth + PatientSelection contexts
   */
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setHasPatientProfile(false);
        setSelectedPatient(null);
        return;
      }

      // Therapists and admins don't need patient profiles
      if (user.role === 'therapist' || user.role === 'admin') {
        setHasPatientProfile(true);
        return;
      }

      // Patient role: check if profile exists
      try {
        const result = await api.checkPatientProfile();
        setHasPatientProfile(result.hasProfile);

        // Auto-load patient's own record
        if (result.hasProfile && result.patient && !selectedPatient) {
          setSelectedPatient(result.patient);
          console.log('[SessionContext] Auto-loaded patient record:', result.patient);
        }
      } catch (error) {
        console.error('[SessionContext] Failed to check patient profile:', error);
        setHasPatientProfile(false);
      }
    };

    checkProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      console.log('[SessionContext] Login successful:', userData.email);
    } catch (error: any) {
      console.error('[SessionContext] Login failed:', error);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  /**
   * Register new user account
   */
  const register = async (name: string, email: string, password: string, role: string) => {
    try {
      const response = await api.post('/auth/register', { name, email, password, role });
      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      console.log('[SessionContext] Registration successful:', userData.email);
    } catch (error: any) {
      console.error('[SessionContext] Registration failed:', error);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  /**
   * Logout and clear session state
   */
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setHasPatientProfile(false);
    setSelectedPatient(null);
    console.log('[SessionContext] Logout successful');
  };

  /**
   * Update user data (optimistic update + persist to localStorage)
   */
  const updateUser = (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    console.log('[SessionContext] User updated:', updates);
  };

  /**
   * Manually refresh patient profile (for therapists or after profile changes)
   */
  const refreshProfile = async () => {
    if (!user) return;

    try {
      const result = await api.checkPatientProfile();
      setHasPatientProfile(result.hasProfile);

      if (result.hasProfile && result.patient) {
        setSelectedPatient(result.patient);
        console.log('[SessionContext] Profile refreshed:', result.patient);
      }
    } catch (error) {
      console.error('[SessionContext] Failed to refresh profile:', error);
    }
  };

  // Derived state
  const isAuthenticated = !!user;
  const isTherapist = user?.role === 'therapist';
  const isAdmin = user?.role === 'admin';
  const isPatient = user?.role === 'patient';
  const surgeryDate = user?.surgeryDate || null;
  const patientData = user?.medicalData || null;
  const isViewingAsTherapist = isTherapist && selectedPatient !== null;

  const value: SessionContextType = {
    // State
    user,
    isLoading,
    isAuthenticated,
    hasPatientProfile,
    selectedPatient,

    // Derived helpers
    isTherapist,
    isAdmin,
    isPatient,
    surgeryDate,
    patientData,

    // Methods
    login,
    register,
    logout,
    updateUser,
    setSelectedPatient,
    isViewingAsTherapist,
    refreshProfile,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Custom hook to access session context
 *
 * Usage:
 * ```typescript
 * const { user, isTherapist, surgeryDate, login, logout } = useSession();
 * ```
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
