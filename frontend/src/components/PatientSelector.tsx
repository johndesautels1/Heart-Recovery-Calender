import React, { useState, useEffect } from 'react';
import { User, ChevronDown } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import api from '../services/api';
import { Patient } from '../types';

interface PatientSelectorProps {
  onPatientChange: (userId: number | null) => void;
  selectedUserId: number | null;
}

/**
 * PatientSelector Component
 *
 * Displays who's data is being viewed:
 * - Patient/User: Shows their name (no dropdown)
 * - Therapist/Admin: Shows dropdown to select patient or view own data
 *
 * Therapist = Admin (same role)
 * Patient = User (same entity)
 */
export function PatientSelector({ onPatientChange, selectedUserId }: PatientSelectorProps) {
  const { user } = useSession();
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [ownPatientProfile, setOwnPatientProfile] = useState<Patient | null>(null);

  const isTherapist = user?.role === 'therapist' || user?.role === 'admin';

  // Load all patients if user is therapist/admin
  useEffect(() => {
    const loadPatients = async () => {
      if (isTherapist) {
        try {
          const response = await api.getPatients();
          const patientsList = response.data || response;
          setAllPatients(patientsList);
        } catch (error) {
          console.error('Failed to load patients list:', error);
        }
      }
    };

    loadPatients();
  }, [isTherapist]);

  // Load therapist's own patient profile if they have one
  useEffect(() => {
    const loadOwnProfile = async () => {
      if (isTherapist && user) {
        try {
          const result = await api.checkPatientProfile();
          if (result.hasProfile && result.patient) {
            setOwnPatientProfile(result.patient);
          }
        } catch (error) {
          console.error('Failed to load own patient profile:', error);
        }
      }
    };

    loadOwnProfile();
  }, [isTherapist, user]);

  // Get display name
  const getDisplayName = () => {
    if (!isTherapist) {
      // Patient/User - just show their name
      return user?.name || 'My Data';
    }

    // Therapist/Admin viewing their own data
    if (!selectedUserId && ownPatientProfile) {
      return `${user?.name || 'My Data'} (My Patient Data)`;
    }

    // Therapist/Admin viewing their own data but no patient profile
    if (!selectedUserId) {
      return `${user?.name || 'Therapist'} (Viewing My Data)`;
    }

    // Therapist/Admin viewing a patient's data
    const selectedPatient = allPatients.find(p => p.userId === selectedUserId);
    return selectedPatient ? selectedPatient.name : 'Select Patient';
  };

  // For patients/users - just show their name, no dropdown
  if (!isTherapist) {
    return (
      <div className="glass rounded-xl p-4 border-2 border-blue-500">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <User className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Viewing Data For:</p>
            <p className="text-lg font-bold text-white">{user?.name || 'My Data'}</p>
          </div>
        </div>
      </div>
    );
  }

  // For therapist/admin - show dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass rounded-xl p-4 border-2 border-purple-500 w-full hover:border-purple-400 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <User className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400">
                {selectedUserId ? 'Viewing Patient:' : 'Viewing Data For:'}
              </p>
              <p className="text-lg font-bold text-white">{getDisplayName()}</p>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-purple-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl border-2 border-purple-500 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {/* Own Data Option */}
          <button
            onClick={() => {
              console.log('👤 [PATIENT SELECTOR] Switching to own data (userId: null)');
              onPatientChange(null);
              setIsOpen(false);
            }}
            className={`w-full p-4 text-left hover:bg-purple-500/10 transition-colors border-b border-gray-700 ${
              !selectedUserId ? 'bg-purple-500/20' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <User className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {user?.name || 'My Data'}
                  {ownPatientProfile && ' (My Patient Data)'}
                </p>
                <p className="text-xs text-gray-400">
                  {ownPatientProfile ? 'View my own patient data' : 'Therapist/Admin view'}
                </p>
              </div>
            </div>
          </button>

          {/* Patient List */}
          {allPatients
            .filter(p => p.userId !== user?.id) // Exclude own patient profile from list
            .map(patient => (
              <button
                key={patient.id}
                onClick={() => {
                  console.log(`👤 [PATIENT SELECTOR] Switching to patient: ${patient.name} (userId: ${patient.userId})`);
                  onPatientChange(patient.userId);
                  setIsOpen(false);
                }}
                className={`w-full p-4 text-left hover:bg-blue-500/10 transition-colors border-b border-gray-700 last:border-0 ${
                  selectedUserId === patient.userId ? 'bg-blue-500/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <User className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{patient.name}</p>
                    {patient.surgeryDate && (
                      <p className="text-xs text-gray-400">
                        Surgery: {new Date(patient.surgeryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}

          {allPatients.filter(p => p.userId !== user?.id).length === 0 && (
            <div className="p-4 text-center text-gray-400">
              No other patients found
            </div>
          )}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
