import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Patient } from '../types';

interface PatientSelectionContextType {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  isViewingAsTherapist: boolean;
}

const PatientSelectionContext = createContext<PatientSelectionContextType | undefined>(undefined);

export function PatientSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Check if a patient is selected (therapist is viewing patient data)
  const isViewingAsTherapist = selectedPatient !== null;

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
