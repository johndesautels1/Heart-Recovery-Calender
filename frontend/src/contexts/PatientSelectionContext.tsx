import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Patient } from '../types';
import { useAuth } from './AuthContext';
import api from '../services/api';

interface PatientSelectionContextType {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  isViewingAsTherapist: boolean;
}

const PatientSelectionContext = createContext<PatientSelectionContextType | undefined>(undefined);

export function PatientSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Auto-load patient's own record if they're a patient-role user
  useEffect(() => {
    const loadOwnPatientRecord = async () => {
      if (isAuthenticated && user?.role === 'patient' && user.id && !selectedPatient) {
        try {
          const result = await api.checkPatientProfile();
          if (result.hasProfile && result.patient) {
            setSelectedPatient(result.patient);
            console.log('[PatientSelectionContext] Auto-loaded own patient record:', result.patient);
          }
        } catch (error) {
          console.error('[PatientSelectionContext] Failed to load own patient record:', error);
        }
      }
    };

    loadOwnPatientRecord();
  }, [isAuthenticated, user, selectedPatient]);

  // Check if a therapist is viewing patient data
  // For patient-role users viewing their own data, this should be false
  const isViewingAsTherapist = user?.role === 'therapist' && selectedPatient !== null;

  return (
    <PatientSelectionContext.Provider
      value={{
        selectedPatient,
        setSelectedPatient,
        isViewingAsTherapist,
      }}
    >
      {children}
    </PatientSelectionContext.Provider>
  );
}

export function usePatientSelection() {
  const context = useContext(PatientSelectionContext);
  if (context === undefined) {
    throw new Error('usePatientSelection must be used within a PatientSelectionProvider');
  }
  return context;
}
