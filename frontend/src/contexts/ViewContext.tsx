import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type ViewMode = 'patient' | 'therapist';

interface ViewContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isTherapistView: boolean;
  isPatientView: boolean;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [viewMode, setViewModeState] = useState<ViewMode>('patient');

  // Load view preference from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('viewMode') as ViewMode;
    if (savedView && (savedView === 'patient' || savedView === 'therapist')) {
      setViewModeState(savedView);
    }
  }, []);

  // Reset to patient view if user is not a therapist
  useEffect(() => {
    if (user?.role !== 'therapist' && viewMode === 'therapist') {
      setViewModeState('patient');
      localStorage.setItem('viewMode', 'patient');
    }
  }, [user, viewMode]);

  const setViewMode = (mode: ViewMode) => {
    // Only therapists can switch to therapist view
    if (mode === 'therapist' && user?.role !== 'therapist') {
      return;
    }

    setViewModeState(mode);
    localStorage.setItem('viewMode', mode);
  };

  const value: ViewContextType = {
    viewMode,
    setViewMode,
    isTherapistView: viewMode === 'therapist',
    isPatientView: viewMode === 'patient',
  };

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}
