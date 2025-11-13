import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from './SessionContext';

type ViewMode = 'patient' | 'therapist';

interface ViewContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isTherapistView: boolean;
  isPatientView: boolean;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [viewMode, setViewModeState] = useState<ViewMode>('patient');

  // Load view preference from localStorage on mount, or auto-set for therapist/admin
  useEffect(() => {
    const savedView = localStorage.getItem('viewMode') as ViewMode;

    // If user is therapist or admin, default to therapist view
    if (user && (user.role === 'therapist' || user.role === 'admin')) {
      if (savedView && (savedView === 'patient' || savedView === 'therapist')) {
        setViewModeState(savedView);
      } else {
        // Auto-set therapists and admins to therapist view
        setViewModeState('therapist');
        localStorage.setItem('viewMode', 'therapist');
      }
    } else if (savedView && (savedView === 'patient' || savedView === 'therapist')) {
      setViewModeState(savedView);
    }
  }, [user]);

  // Reset to patient view if user is not a therapist or admin
  useEffect(() => {
    if (user && user.role !== 'therapist' && user.role !== 'admin' && viewMode === 'therapist') {
      setViewModeState('patient');
      localStorage.setItem('viewMode', 'patient');
    }
  }, [user, viewMode]);

  const setViewMode = (mode: ViewMode) => {
    // Only therapists and admins can switch to therapist view
    if (mode === 'therapist' && user?.role !== 'therapist' && user?.role !== 'admin') {
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
