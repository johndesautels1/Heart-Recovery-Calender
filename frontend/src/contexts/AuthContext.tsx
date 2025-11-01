import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPatientProfile: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: 'patient' | 'therapist' | 'admin') => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshPatientProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPatientProfile, setHasPatientProfile] = useState(false);

  const refreshPatientProfile = async () => {
    if (!user) {
      setHasPatientProfile(false);
      return;
    }

    // Therapists don't need patient profiles
    if (user.role === 'therapist' || user.role === 'admin') {
      setHasPatientProfile(true);
      return;
    }

    // Check if patient-role user has a patient profile
    try {
      const result = await api.checkPatientProfile();
      setHasPatientProfile(result.hasProfile);
    } catch (error) {
      console.error('Failed to check patient profile:', error);
      setHasPatientProfile(false);
    }
  };

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          api.setToken(token);
          const userData = await api.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          api.clearToken();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    // Check patient profile whenever user changes
    if (user) {
      refreshPatientProfile();
    } else {
      setHasPatientProfile(false);
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await api.login(email, password);
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role?: 'patient' | 'therapist' | 'admin') => {
    try {
      const response: AuthResponse = await api.register(email, password, name, role);
      setUser(response.user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasPatientProfile,
    login,
    register,
    logout,
    updateUser,
    refreshPatientProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
