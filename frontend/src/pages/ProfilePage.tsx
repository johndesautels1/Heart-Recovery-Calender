import React, { useState, useRef, useEffect } from 'react';
import { GlassCard, Button, Input } from '../components/ui';
import {
  User, Mail, Phone, Heart, Stethoscope, Save, Camera,
  ChevronDown, ChevronUp, Calendar, MapPin, Users,
  Activity, Pill, Hospital, Shield, Smartphone, Wallet,
  Upload, FileText, CreditCard, AlertCircle, Clock, Settings,
  Download, X, Edit2, Trash2, Plus, Eye, Check, Key, Server, Cloud, Watch
} from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { searchMedications, getMedicationInfo, type MedicationInfo } from '../data/medicationDatabase';

interface PatientData {
  // Name
  firstName?: string;
  lastName?: string;

  // Demographics
  dateOfBirth?: string;
  gender?: string;
  age?: number;

  // Contact
  email?: string;
  primaryPhone?: string;
  primaryPhoneType?: string;
  alternatePhone?: string;
  whatsAppNumber?: string;
  preferredContactMethod?: string;
  bestTimeToContact?: string;

  // Address
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  // Emergency Contact 1
  emergencyContact1Name?: string;
  emergencyContact1Relationship?: string;
  emergencyContact1Phone?: string;
  emergencyContact1AlternatePhone?: string;
  emergencyContact1Email?: string;
  emergencyContact1SameAddress?: boolean;

  // Emergency Contact 2
  emergencyContact2Name?: string;
  emergencyContact2Relationship?: string;
  emergencyContact2Phone?: string;
  emergencyContact2AlternatePhone?: string;
  emergencyContact2Email?: string;
  emergencyContact2SameAddress?: boolean;

  // Physical Measurements
  height?: number;
  heightUnit?: string;
  startingWeight?: number;
  currentWeight?: number;
  targetWeight?: number;
  weightUnit?: string;
  race?: string;
  nationality?: string;

  // Surgical History
  priorSurgicalProcedures?: string[];
  devicesImplanted?: string[];
  priorSurgeryNotes?: string;
  hospitalName?: string;
  surgeonName?: string;
  surgeryDate?: string;
  dischargeDate?: string;
  dischargeInstructions?: string;

  // Medical History
  priorHealthConditions?: string[];
  currentConditions?: string[];
  nonCardiacMedications?: string;
  allergies?: string;

  // Lab Results
  labResults?: Array<{
    id?: string;
    testName: string;
    testDate: string;
    testCategory?: string; // 'Blood Work', 'Cardiac', 'Metabolic', 'Other'
    results: Array<{
      parameter: string;
      value: string;
      unit: string;
      referenceRange?: string;
      status?: 'Normal' | 'High' | 'Low' | 'Critical';
    }>;
    orderedBy?: string;
    labFacility?: string;
    notes?: string;
  }>;

  // Medical Reports
  medicalReports?: Array<{
    id?: string;
    reportType: string; // 'Imaging', 'Pathology', 'Cardiology', 'Consultation', 'Other'
    reportName: string;
    reportDate: string;
    provider?: string;
    facility?: string;
    findings?: string;
    recommendations?: string;
    fileUrl?: string; // URL or base64 for uploaded file
    fileName?: string;
    fileType?: string; // 'pdf', 'jpg', 'png', 'dcm'
    notes?: string;
  }>;


  // Cardiac Profile
  diagnosisDate?: string;
  heartConditions?: string[];
  currentTreatmentProtocol?: string[];
  recommendedTreatments?: string[];
  restingHeartRate?: number;
  maxHeartRate?: number;
  targetHeartRateMin?: number;
  targetHeartRateMax?: number;
  baselineBpSystolic?: number;
  baselineBpDiastolic?: number;
  ejectionFraction?: number;
  cardiacDiagnosis?: string[];
  medicationsAffectingHR?: string[];
  activityRestrictions?: string;
  cardiacNotes?: string;

  // Device Integration (Consumer wearables/fitness trackers)
  polarDeviceId?: string;
  samsungHealthAccount?: string;
  preferredDataSource?: string;

  // Implanted Devices & Critical Medical IDs (Life-critical medical devices)
  implantedDevices?: Array<{
    deviceType: string; // e.g., "Heart Valve", "Pacemaker", "Loop Recorder", "Stent", "ICD", "CRT Device"
    manufacturer: string;
    model: string;
    serialNumber: string;
    size?: string;
    implantDate?: string;
    notes?: string;
  }>;
  medicalAlertBracelet?: {
    hasDevice: boolean;
    manufacturer?: string;
    serialNumber?: string;
    qrCode?: string;
    emergencyAccessURL?: string;
  };
  criticalAccessInfo?: {
    medicalRecordNumber?: string;
    healthSystemPortalURL?: string;
    healthSystemUsername?: string;
    healthSystemPassword?: string;
    additionalNotes?: string;
  };
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
}

export function ProfilePage() {
  const { user, updateUser } = useSession();
  const [isEditing, setIsEditing] = useState(true);  // Changed to true by default
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['personal']);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(user?.preferences?.timeFormat || '12h');
  const [exportFormat, setExportFormat] = useState<'ics' | 'json' | 'csv'>(user?.preferences?.exportFormat || 'ics');
  const [importFormat, setImportFormat] = useState<string>(user?.preferences?.importFormat || 'ics');
  const [availableExportFormats, setAvailableExportFormats] = useState<string[]>(
    user?.preferences?.availableExportFormats || ['ics', 'json', 'csv', 'xlsx', 'pdf']
  );
  const [availableImportFormats, setAvailableImportFormats] = useState<string[]>(
    user?.preferences?.availableImportFormats || ['ics', 'json', 'csv']
  );
  const [showExportFormatsModal, setShowExportFormatsModal] = useState(false);
  const [showImportFormatsModal, setShowImportFormatsModal] = useState(false);
  const [showAddSettingModal, setShowAddSettingModal] = useState(false);
  const [newFormatName, setNewFormatName] = useState('');

  // Medication autocomplete state
  const [medInputValue, setMedInputValue] = useState('');
  const [medSuggestions, setMedSuggestions] = useState<MedicationInfo[]>([]);
  const [showMedSuggestions, setShowMedSuggestions] = useState(false);
  const [highlightedMedIndex, setHighlightedMedIndex] = useState(-1);
  const [originalMedications, setOriginalMedications] = useState<string[]>([]);

  // Medical History tab state
  const [medicalHistoryTab, setMedicalHistoryTab] = useState<'overview' | 'labs' | 'reports'>('overview');

  // Document upload state - stores base64 data URLs for previews
  const [uploadedDocuments, setUploadedDocuments] = useState<{
    passportFront?: string;
    passportBack?: string;
    insuranceFront?: string;
    insuranceBack?: string;
    allergyCardFront?: string;
    allergyCardBack?: string;
    driverLicenseFront?: string;
    driverLicenseBack?: string;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const medAutocompleteRef = useRef<HTMLDivElement>(null);

  // Document upload refs - front and back for each document
  const passportFrontInputRef = useRef<HTMLInputElement>(null);
  const passportBackInputRef = useRef<HTMLInputElement>(null);
  const insuranceFrontInputRef = useRef<HTMLInputElement>(null);
  const insuranceBackInputRef = useRef<HTMLInputElement>(null);
  const allergyCardFrontInputRef = useRef<HTMLInputElement>(null);
  const allergyCardBackInputRef = useRef<HTMLInputElement>(null);
  const driverLicenseFrontInputRef = useRef<HTMLInputElement>(null);
  const driverLicenseBackInputRef = useRef<HTMLInputElement>(null);

  const sections: Section[] = [
    { id: 'apiCredentials', title: 'Login Credentials & API Calls', icon: <Key className="h-5 w-5" />, color: '#0ea5e9' },
    { id: 'settings', title: 'App Settings', icon: <Settings className="h-5 w-5" />, color: '#6366f1' },
    { id: 'personal', title: 'Personal Information', icon: <User className="h-5 w-5" />, color: '#3b82f6' },
    { id: 'contact', title: 'Contact & Address', icon: <MapPin className="h-5 w-5" />, color: '#10b981' },
    { id: 'emergency', title: 'Emergency Contacts', icon: <Users className="h-5 w-5" />, color: '#ef4444' },
    { id: 'cardiac', title: 'Cardiac Profile', icon: <Heart className="h-5 w-5" />, color: '#ec4899' },
    { id: 'medical', title: 'Medical History', icon: <Stethoscope className="h-5 w-5" />, color: '#8b5cf6' },
    { id: 'surgical', title: 'Surgical History', icon: <Hospital className="h-5 w-5" />, color: '#f59e0b' },
    { id: 'wallet', title: 'My Wallet', icon: <Wallet className="h-5 w-5" />, color: '#a855f7' },
    { id: 'implantedDevices', title: 'Implanted Devices & Critical Medical IDs', icon: <Shield className="h-5 w-5" />, color: '#dc2626' },
  ];

  useEffect(() => {
    fetchPatientData();
  }, []);

  // Click outside handler for medication autocomplete
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (medAutocompleteRef.current && !medAutocompleteRef.current.contains(event.target as Node)) {
        setShowMedSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to format dates from ISO to YYYY-MM-DD for date inputs
  const formatDateForInput = (date: any) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const fetchPatientData = async () => {
    try {
      setIsLoading(true);
      if (!user?.id) {
        toast.error('No user logged in');
        return;
      }

      // Build query to get patient record for current user
      const queryParams = new URLSearchParams({ userId: user.id.toString() });
      const response = await fetch(`http://localhost:4000/api/patients?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patient data');
      }

      const patientsResponse = await response.json();

      if (!patientsResponse.data || patientsResponse.data.length === 0) {
        // No patient record exists yet - initialize empty data
        setPatientData({
          firstName: user.name?.split(' ')[0] || '',
          lastName: user.name?.split(' ')[1] || '',
          email: user.email || ''
        });
        setIsLoading(false);
        return;
      }

      // Get the patient record and format date fields for HTML date inputs
      const patientData = patientsResponse.data[0];

      // Format date fields from ISO to YYYY-MM-DD for date inputs
      if (patientData.surgeryDate) {
        patientData.surgeryDate = formatDateForInput(patientData.surgeryDate);
      }
      if (patientData.dischargeDate) {
        patientData.dischargeDate = formatDateForInput(patientData.dischargeDate);
      }
      if (patientData.dateOfBirth) {
        patientData.dateOfBirth = formatDateForInput(patientData.dateOfBirth);
      }
      if (patientData.diagnosisDate) {
        patientData.diagnosisDate = formatDateForInput(patientData.diagnosisDate);
      }

      setPatientData(patientData as any);
      // Store original medications for comparison when saving
      setOriginalMedications(patientData.medicationsAffectingHR || []);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast.error('Failed to load patient profile');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    console.log('[PROFILE] Toggling section:', sectionId);
    console.log('[PROFILE] Current expanded sections:', expandedSections);
    setExpandedSections(prev => {
      const newSections = prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      console.log('[PROFILE] New expanded sections:', newSections);
      return newSections;
    });
  };

  const handleChange = (field: string, value: any) => {
    setPatientData(prev => {
      if (!prev) return null;

      const updated = { ...prev, [field]: value };

      // Auto-calculate age when date of birth changes
      if (field === 'dateOfBirth' && value) {
        const birthDate = new Date(value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        updated.age = age;
      }

      return updated;
    });
  };

  const handleArrayChange = (field: string, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    setPatientData(prev => prev ? { ...prev, [field]: items } : null);
  };

  const handleCheckboxArrayChange = (field: string, value: string, checked: boolean) => {
    setPatientData(prev => {
      if (!prev) return null;

      const currentArray = (prev[field as keyof typeof prev] as string[]) || [];
      let updatedArray: string[];

      if (checked) {
        updatedArray = [...currentArray, value];
      } else {
        updatedArray = currentArray.filter(item => item !== value);
      }

      return { ...prev, [field]: updatedArray };
    });
  };

  // Medication autocomplete handlers
  const handleMedInputChange = (value: string) => {
    setMedInputValue(value);

    if (value.length >= 2) {
      const results = searchMedications(value);
      setMedSuggestions(results);
      setShowMedSuggestions(true);
      setHighlightedMedIndex(-1);
    } else {
      setMedSuggestions([]);
      setShowMedSuggestions(false);
    }
  };

  const handleSelectMedication = (medication: MedicationInfo) => {
    // Add medication to the array if not already present
    setPatientData(prev => {
      if (!prev) return null;

      const currentMeds = prev.medicationsAffectingHR || [];
      if (!currentMeds.includes(medication.name)) {
        return {
          ...prev,
          medicationsAffectingHR: [...currentMeds, medication.name]
        };
      }
      return prev;
    });

    // Clear input and hide suggestions
    setMedInputValue('');
    setShowMedSuggestions(false);
    setMedSuggestions([]);
  };

  const handleRemoveMedication = (medName: string) => {
    setPatientData(prev => {
      if (!prev) return null;

      return {
        ...prev,
        medicationsAffectingHR: (prev.medicationsAffectingHR || []).filter(m => m !== medName)
      };
    });
  };

  const handleMedKeyDown = (e: React.KeyboardEvent) => {
    if (!showMedSuggestions || medSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedMedIndex(prev =>
          prev < medSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedMedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedMedIndex >= 0 && highlightedMedIndex < medSuggestions.length) {
          handleSelectMedication(medSuggestions[highlightedMedIndex]);
        }
        break;
      case 'Escape':
        setShowMedSuggestions(false);
        break;
    }
  };

  const handleClearPersonalInfo = () => {
    if (!confirm('Clear all Personal Information fields? This will not save until you click Save Profile.')) {
      return;
    }

    setPatientData(prev => prev ? {
      ...prev,
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      age: 0,
      race: '',
      nationality: '',
      height: 0,
      heightUnit: 'in'
    } : null);

    toast.success('Personal Information fields cleared. Click Save Profile to persist changes.');
  };

  const handleDeletePersonalInfo = async () => {
    if (!confirm('⚠️ DELETE all Personal Information from the database? This CANNOT be undone!')) {
      return;
    }

    if (!confirm('Are you ABSOLUTELY SURE? This will permanently delete: First Name, Last Name, Date of Birth, Gender, Age, Race, Nationality, and Height.')) {
      return;
    }

    try {
      const clearedData = {
        ...patientData,
        firstName: null,
        lastName: null,
        dateOfBirth: null,
        gender: null,
        age: null,
        race: null,
        nationality: null,
        height: null,
        heightUnit: null
      };

      const patientId = (patientData as any)?.id;
      if (!patientId) {
        toast.error('No patient profile found');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(clearedData)
      });

      if (!response.ok) {
        throw new Error('Failed to delete personal information');
      }

      const updated = await response.json();
      setPatientData(updated as any);
      toast.success('Personal Information permanently deleted from database');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete personal information');
    }
  };

  // Sync profile vitals to Vitals Tab (2-way sync)
  const syncProfileToVitals = async (updatedProfile: any) => {
    try {
      // Only sync if there are vitals fields to sync
      const hasVitalsData =
        updatedProfile.currentWeight ||
        updatedProfile.restingHeartRate ||
        (updatedProfile.baselineBpSystolic && updatedProfile.baselineBpDiastolic);

      if (!hasVitalsData) return;

      // Check if there's already a vital record for today
      const today = new Date().toISOString().split('T')[0];
      const vitalsResponse = await fetch(
        `http://localhost:4000/api/vitals?startDate=${today}&endDate=${today}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!vitalsResponse.ok) return;

      const vitalsData = await vitalsResponse.json();
      const todayVital = vitalsData.data?.[0];

      const vitalUpdate: any = {
        timestamp: new Date().toISOString(),
        source: 'manual', // Valid values: 'manual' | 'device' | 'import'
      };

      // Sync weight
      if (updatedProfile.currentWeight) {
        vitalUpdate.weight = updatedProfile.currentWeight;
      }

      // Sync resting heart rate
      if (updatedProfile.restingHeartRate) {
        vitalUpdate.heartRate = updatedProfile.restingHeartRate;
      }

      // Sync baseline blood pressure
      if (updatedProfile.baselineBpSystolic && updatedProfile.baselineBpDiastolic) {
        vitalUpdate.bloodPressureSystolic = updatedProfile.baselineBpSystolic;
        vitalUpdate.bloodPressureDiastolic = updatedProfile.baselineBpDiastolic;
      }

      if (todayVital) {
        // Update today's vital record
        await fetch(`http://localhost:4000/api/vitals/${todayVital.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            ...todayVital,
            ...vitalUpdate
          })
        });
        console.log('✓ Updated today\'s vital record from profile');
      } else {
        // Create new vital record
        await fetch('http://localhost:4000/api/vitals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(vitalUpdate)
        });
        console.log('✓ Created new vital record from profile');
      }
    } catch (error) {
      console.error('Failed to sync profile to vitals:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!patientData) {
        toast.error('No patient data to save');
        return;
      }

      setIsSaving(true);

      // Get patient ID from the data
      const patientId = (patientData as any).id;

      let response;
      let updated;

      if (!patientId) {
        // No patient record exists yet - create one
        console.log('Creating new patient record for user:', user?.id);

        // Prepare data for new patient creation
        const newPatientData = {
          ...patientData,
          userId: user?.id, // Link to current user
          name: `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || user?.name || 'Unknown',
          email: patientData.email || user?.email,
          therapistId: user?.id // Self-managed: user is their own therapist for profile management
        };

        response = await fetch(`http://localhost:4000/api/patients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(newPatientData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create patient profile');
        }

        updated = await response.json();

        // Format date fields from ISO to YYYY-MM-DD for date inputs
        if (updated.surgeryDate) updated.surgeryDate = formatDateForInput(updated.surgeryDate);
        if (updated.dischargeDate) updated.dischargeDate = formatDateForInput(updated.dischargeDate);
        if (updated.dateOfBirth) updated.dateOfBirth = formatDateForInput(updated.dateOfBirth);
        if (updated.diagnosisDate) updated.diagnosisDate = formatDateForInput(updated.diagnosisDate);

        setPatientData(updated as any);

        // Sync profile vitals to Vitals Tab
        await syncProfileToVitals(updated);
      } else {
        // Update existing patient profile
        // Only send non-null/non-undefined fields to avoid erasing existing data
        const updateData: any = {};
        Object.keys(patientData).forEach(key => {
          const value = (patientData as any)[key];
          // Only include fields that have actual values (not null, undefined, or empty string)
          if (value !== null && value !== undefined && value !== '') {
            updateData[key] = value;
          }
          // Include arrays even if empty (they might be intentionally cleared)
          if (Array.isArray(value)) {
            updateData[key] = value;
          }
        });

        response = await fetch(`http://localhost:4000/api/patients/${patientId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          throw new Error('Failed to update profile');
        }

        updated = await response.json();

        // Format date fields from ISO to YYYY-MM-DD for date inputs
        if (updated.surgeryDate) updated.surgeryDate = formatDateForInput(updated.surgeryDate);
        if (updated.dischargeDate) updated.dischargeDate = formatDateForInput(updated.dischargeDate);
        if (updated.dateOfBirth) updated.dateOfBirth = formatDateForInput(updated.dateOfBirth);
        if (updated.diagnosisDate) updated.diagnosisDate = formatDateForInput(updated.diagnosisDate);

        setPatientData(updated as any);

        // Sync profile vitals to Vitals Tab
        await syncProfileToVitals(updated);
      }

      // Auto-create medication cards for newly added cardiac medications
      const currentMeds = patientData.medicationsAffectingHR || [];
      const newMeds = currentMeds.filter(med => !originalMedications.includes(med));

      if (newMeds.length > 0 && user?.id) {
        toast.success(`Profile updated! Creating ${newMeds.length} medication card(s)...`);

        // Create medication cards for each new medication
        for (const medName of newMeds) {
          try {
            const medInfo = getMedicationInfo(medName);

            if (medInfo) {
              // Create medication card with default values from database
              const medicationData = {
                userId: user.id,
                name: medInfo.name,
                dosage: medInfo.commonDosages[0] || '10mg',  // Default to first common dosage
                frequency: medInfo.commonFrequencies[0] || 'Once daily',
                prescribedBy: '',
                startDate: new Date().toISOString(),
                timeOfDay: 'Morning',  // Default time
                purpose: medInfo.description || medInfo.category,
                sideEffects: medInfo.sideEffects?.map(se => se.effect).join(', ') || '',
                instructions: medInfo.therapyWarnings?.join('. ') || 'Take as prescribed',
                isActive: true,
                reminderEnabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              const medResponse = await fetch('http://localhost:4000/api/medications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(medicationData)
              });

              if (medResponse.ok) {
                console.log(`✓ Created medication card for ${medName}`);
              } else {
                console.error(`Failed to create medication card for ${medName}`);
              }
            }
          } catch (medError) {
            console.error(`Error creating medication card for ${medName}:`, medError);
          }
        }

        toast.success(`Profile and ${newMeds.length} medication card(s) created successfully!`);
      } else {
        toast.success('Profile updated successfully!');
      }

      // Update the original medications list
      setOriginalMedications(currentMeds);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    fetchPatientData();  // Reload original data to discard changes
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleTimeFormatChange = async (format: '12h' | '24h') => {
    try {
      setTimeFormat(format);
      const updatedPreferences = {
        ...user?.preferences,
        timeFormat: format
      };
      const updatedUser = await api.updateProfile({ preferences: updatedPreferences });
      updateUser(updatedUser);
      toast.success('Time format updated successfully!');
    } catch (error: any) {
      console.error('Error updating time format:', error);
      toast.error('Failed to update time format');
      setTimeFormat(user?.preferences?.timeFormat || '12h'); // Revert on error
    }
  };

  const handleExportFormatChange = async (format: 'ics' | 'json' | 'csv') => {
    try {
      setExportFormat(format);
      const updatedPreferences = {
        ...user?.preferences,
        exportFormat: format
      };
      const updatedUser = await api.updateProfile({ preferences: updatedPreferences });
      updateUser(updatedUser);
      toast.success('Export format updated successfully!');
    } catch (error: any) {
      console.error('Error updating export format:', error);
      toast.error('Failed to update export format');
      setExportFormat(user?.preferences?.exportFormat || 'ics'); // Revert on error
    }
  };

  const handleImportFormatChange = async (format: string) => {
    try {
      setImportFormat(format);
      const updatedPreferences = {
        ...user?.preferences,
        importFormat: format
      };
      const updatedUser = await api.updateProfile({ preferences: updatedPreferences });
      updateUser(updatedUser);
      toast.success('Import format updated successfully!');
    } catch (error: any) {
      console.error('Error updating import format:', error);
      toast.error('Failed to update import format');
      setImportFormat(user?.preferences?.importFormat || 'ics'); // Revert on error
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const updatedUser = await api.updateProfile({ profilePhoto: base64String });
          updateUser(updatedUser);
          toast.success('Profile photo updated successfully!');
        } catch (error: any) {
          console.error('Error uploading photo:', error);
          toast.error(error.response?.data?.error || 'Failed to upload photo');
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing photo:', error);
      toast.error('Failed to process photo');
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    try {
      setIsUploadingPhoto(true);
      const updatedUser = await api.updateProfile({ profilePhoto: undefined });
      updateUser(updatedUser);
      toast.success('Profile photo removed successfully!');
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error(error.response?.data?.error || 'Failed to remove photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (
    type: 'passport' | 'insurance' | 'allergyCard' | 'driverLicense',
    side: 'front' | 'back',
    file: File
  ) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please select an image or PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        // Store in state for preview
        const key = `${type}${side.charAt(0).toUpperCase() + side.slice(1)}` as keyof typeof uploadedDocuments;
        setUploadedDocuments(prev => ({
          ...prev,
          [key]: base64String
        }));

        // TODO: Implement document storage API to save to backend

        const documentName = type === 'driverLicense' ? "Driver's License" :
                           type === 'allergyCard' ? 'Allergy Card' :
                           type === 'insurance' ? 'Insurance Card' : 'Passport';
        toast.success(`${documentName} (${side === 'front' ? 'Front' : 'Back'}) uploaded successfully!`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    }
  };

  const handleDocumentDelete = (
    type: 'passport' | 'insurance' | 'allergyCard' | 'driverLicense',
    side: 'front' | 'back'
  ) => {
    const key = `${type}${side.charAt(0).toUpperCase() + side.slice(1)}` as keyof typeof uploadedDocuments;
    setUploadedDocuments(prev => ({
      ...prev,
      [key]: undefined
    }));

    const documentName = type === 'driverLicense' ? "Driver's License" :
                       type === 'allergyCard' ? 'Allergy Card' :
                       type === 'insurance' ? 'Insurance Card' : 'Passport';
    toast.success(`${documentName} (${side === 'front' ? 'Front' : 'Back'}) deleted`);
  };

  const handleDocumentView = (dataUrl: string) => {
    // Open in new tab
    const win = window.open();
    if (win) {
      win.document.write(`<img src="${dataUrl}" style="max-width: 100%; height: auto;" />`);
    }
  };

  const handleAddExportFormat = async () => {
    if (!newFormatName.trim()) {
      toast.error('Please enter a format name');
      return;
    }
    if (availableExportFormats.includes(newFormatName.toLowerCase())) {
      toast.error('Format already exists');
      return;
    }
    const updated = [...availableExportFormats, newFormatName.toLowerCase()];
    setAvailableExportFormats(updated);
    try {
      const updatedUser = await api.updateProfile({
        preferences: { ...user?.preferences, availableExportFormats: updated }
      });
      updateUser(updatedUser);
      toast.success(`Export format '${newFormatName}' added successfully!`);
      setNewFormatName('');
    } catch (error: any) {
      console.error('Error adding export format:', error);
      toast.error('Failed to add export format');
      setAvailableExportFormats(availableExportFormats);
    }
  };

  const handleRemoveExportFormat = async (format: string) => {
    const updated = availableExportFormats.filter(f => f !== format);
    setAvailableExportFormats(updated);
    try {
      const updatedUser = await api.updateProfile({
        preferences: { ...user?.preferences, availableExportFormats: updated }
      });
      updateUser(updatedUser);
      toast.success(`Export format '${format}' removed successfully!`);
    } catch (error: any) {
      console.error('Error removing export format:', error);
      toast.error('Failed to remove export format');
      setAvailableExportFormats(availableExportFormats);
    }
  };

  const handleAddImportFormat = async () => {
    if (!newFormatName.trim()) {
      toast.error('Please enter a format name');
      return;
    }
    if (availableImportFormats.includes(newFormatName.toLowerCase())) {
      toast.error('Format already exists');
      return;
    }
    const updated = [...availableImportFormats, newFormatName.toLowerCase()];
    setAvailableImportFormats(updated);
    try {
      const updatedUser = await api.updateProfile({
        preferences: { ...user?.preferences, availableImportFormats: updated }
      });
      updateUser(updatedUser);
      toast.success(`Import format '${newFormatName}' added successfully!`);
      setNewFormatName('');
    } catch (error: any) {
      console.error('Error adding import format:', error);
      toast.error('Failed to add import format');
      setAvailableImportFormats(availableImportFormats);
    }
  };

  const handleRemoveImportFormat = async (format: string) => {
    const updated = availableImportFormats.filter(f => f !== format);
    setAvailableImportFormats(updated);
    try {
      const updatedUser = await api.updateProfile({
        preferences: { ...user?.preferences, availableImportFormats: updated }
      });
      updateUser(updatedUser);
      toast.success(`Import format '${format}' removed successfully!`);
    } catch (error: any) {
      console.error('Error removing import format:', error);
      toast.error('Failed to remove import format');
      setAvailableImportFormats(availableImportFormats);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>Profile Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <GlassCard>
            <div className="p-6 text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <div
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={handlePhotoClick}
                >
                  {user?.profilePhoto ? (
                    <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-16 w-16 text-white" />
                  )}
                </div>
                {user?.profilePhoto && (
                  <button
                    onClick={handlePhotoDelete}
                    disabled={isUploadingPhoto}
                    className="absolute w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                    style={{
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                      top: '0',
                      left: '-16px'
                    }}
                    title="Delete photo"
                  >
                    {isUploadingPhoto ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <X className="h-4 w-4 text-white" />
                    )}
                  </button>
                )}
                <button
                  onClick={handlePhotoClick}
                  disabled={isUploadingPhoto}
                  className="absolute w-10 h-10 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center transition-colors"
                  style={{
                    boxShadow: '0 2px 8px rgba(236, 72, 153, 0.4)',
                    bottom: '0',
                    right: '-16px'
                  }}
                >
                  {isUploadingPhoto ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </button>
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink-bright)' }}>
                {patientData?.firstName} {patientData?.lastName}
              </h2>
              <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
                {user?.email}
              </p>
              <div className="mt-4 inline-block px-4 py-1 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: user?.role === 'admin' ? 'rgba(147, 51, 234, 0.2)' :
                                  user?.role === 'therapist' ? 'rgba(34, 197, 94, 0.2)' :
                                  'rgba(236, 72, 153, 0.2)',
                  color: user?.role === 'admin' ? '#a855f7' :
                        user?.role === 'therapist' ? '#22c55e' :
                        '#ec4899'
                }}
              >
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
              </div>

              {patientData?.age && (
                <div className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>
                  Age: {patientData.age} years
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Profile Sections */}
        <div className="lg:col-span-3 space-y-4">
          {sections.map((section) => (
            <GlassCard key={section.id} className="overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${section.color}20`, color: section.color }}
                  >
                    {section.icon}
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--ink-bright)' }}>
                    {section.title}
                  </h3>
                </div>
                {expandedSections.includes(section.id) ? (
                  <ChevronUp className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                ) : (
                  <ChevronDown className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                )}
              </button>

              {expandedSections.includes(section.id) && (
                <div className="p-6 pt-0 space-y-4 animate-slideDown">
                  {section.id === 'apiCredentials' && (
                    <>
                      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                        <h4 className="font-semibold mb-2" style={{ color: 'var(--ink-bright)' }}>
                          Centralized Credentials Management
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>
                          Store and manage all third-party API credentials in one secure location. Credentials are listed alphabetically.
                        </p>
                      </div>

                      {/* Twilio SMS - FIRST AND CRITICAL */}
                      <div className="p-5 rounded-lg border-2 border-red-500" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Phone className="h-6 w-6 text-red-500" />
                            <div>
                              <h4 className="font-bold text-lg" style={{ color: 'var(--ink-bright)' }}>
                                Twilio SMS
                              </h4>
                              <div className="flex gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500 text-white">
                                  CRITICAL
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-500 text-white">
                                  Heart-Health Alerts
                                </span>
                              </div>
                            </div>
                          </div>
                          <a
                            href="https://console.twilio.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                          >
                            Get Credentials →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Sends real-time SMS alerts when patients approach or exceed sodium/cholesterol limits. REQUIRED for patient safety.
                        </p>

                        <div className="space-y-3">
                          <Input
                            label="Google Account Email"
                            type="email"
                            value="brokerpinellas@gmail.com"
                            readOnly
                            className="bg-white/5"
                          />
                          <Input
                            label="Recovery Code"
                            type="password"
                            value="LXF1ULP2C8KZWBXR2ZM3YZA3"
                            readOnly
                            className="bg-white/5"
                          />
                          <Input
                            label="Account SID"
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            className="bg-white/5"
                          />
                          <Input
                            label="Auth Token"
                            type="password"
                            placeholder="Enter Twilio Auth Token"
                            className="bg-white/5"
                          />
                          <Input
                            label="Phone Number"
                            placeholder="+1234567890"
                            className="bg-white/5"
                          />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: 'var(--muted)' }}>
                          ENV Variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
                        </p>
                      </div>

                      {/* Claude AI / Anthropic API */}
                      <div className="p-5 rounded-lg border-2 border-purple-500" style={{ backgroundColor: 'rgba(168, 85, 247, 0.05)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Cloud className="h-6 w-6 text-purple-500" />
                            <div>
                              <h4 className="font-bold text-lg" style={{ color: 'var(--ink-bright)' }}>
                                Claude AI API (Anthropic)
                              </h4>
                              <div className="flex gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500 text-white">
                                  ACTIVE
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500 text-white">
                                  CAI Reports
                                </span>
                              </div>
                            </div>
                          </div>
                          <a
                            href="https://console.anthropic.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition-colors"
                          >
                            API Console →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Powers CAI (Cardiac Intelligence Analysis) reports with advanced multi-modal AI analysis of patient recovery data using international medical standards (AHA/ESC/ACC guidelines).
                        </p>

                        <div className="space-y-3">
                          <Input
                            label="Account Email"
                            type="email"
                            value="brokerpinellas@gmail.com"
                            readOnly
                            className="bg-white/5"
                          />
                          <Input
                            label="Password"
                            type="password"
                            value="Puspin15!"
                            readOnly
                            className="bg-white/5"
                          />
                          <Input
                            label="Subscription Plan"
                            value="Claude Max (Professional)"
                            readOnly
                            className="bg-white/5"
                          />
                          <Input
                            label="API Key"
                            type="password"
                            value="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"
                            readOnly
                            className="bg-white/5 font-mono text-xs"
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <a
                            href="https://docs.anthropic.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-semibold hover:bg-purple-600/30 transition-colors text-center"
                          >
                            📚 API Documentation
                          </a>
                          <a
                            href="https://claude.com/claude-code"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-semibold hover:bg-purple-600/30 transition-colors text-center"
                          >
                            💻 Claude Code
                          </a>
                        </div>

                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: 'var(--muted)' }}>
                          ENV Variable: CLAUDE_API_KEY
                        </p>
                      </div>

                      {/* Apple Sign In */}
                      <div className="p-5 rounded-lg border border-gray-600" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Smartphone className="h-5 w-5 text-gray-400" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                Apple Sign In
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500 text-white">
                                READY
                              </span>
                            </div>
                          </div>
                          <a
                            href="https://developer.apple.com/account/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-gray-600 text-white text-sm font-semibold hover:bg-gray-500 transition-colors"
                          >
                            Get Credentials →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          OAuth authentication for iOS users. Optional but recommended for iOS app distribution.
                        </p>
                        <div className="space-y-3">
                          <Input label="Client ID" placeholder="com.yourapp.identifier" className="bg-white/5" />
                          <Input label="Team ID" placeholder="XXXXXXXXXX" className="bg-white/5" />
                          <Input label="Key ID" placeholder="XXXXXXXXXX" className="bg-white/5" />
                          <Input label="Private Key" placeholder="Paste .p8 key contents" className="bg-white/5" />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--muted)' }}>
                          ENV Variables: APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
                        </p>
                      </div>

                      {/* Firebase */}
                      <div className="p-5 rounded-lg border border-gray-600" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-orange-400" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                Firebase Admin SDK
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-500 text-white">
                                INSTALLED
                              </span>
                            </div>
                          </div>
                          <a
                            href="https://console.firebase.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-gray-600 text-white text-sm font-semibold hover:bg-gray-500 transition-colors"
                          >
                            Get Credentials →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Push notifications (installed but not implemented). Optional enhancement for mobile alerts.
                        </p>
                        <div className="space-y-3">
                          <Input label="Project ID" placeholder="your-firebase-project-id" className="bg-white/5" />
                          <Input label="Client Email" placeholder="firebase-adminsdk@project.iam.gserviceaccount.com" className="bg-white/5" />
                          <Input label="Private Key" placeholder="Paste private key from service account JSON" className="bg-white/5" />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--muted)' }}>
                          ENV Variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
                        </p>
                      </div>

                      {/* Google OAuth 2.0 */}
                      <div className="p-5 rounded-lg border border-gray-600" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-blue-400" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                Google OAuth 2.0
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500 text-white">
                                READY
                              </span>
                            </div>
                          </div>
                          <a
                            href="https://console.cloud.google.com/apis/credentials"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-gray-600 text-white text-sm font-semibold hover:bg-gray-500 transition-colors"
                          >
                            Get Credentials →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Sign in with Google authentication. Optional but recommended for easier user onboarding.
                        </p>
                        <div className="space-y-3">
                          <Input label="Client ID" placeholder="xxxxxx.apps.googleusercontent.com" className="bg-white/5" />
                          <Input label="Client Secret" placeholder="Enter Google OAuth client secret" type="password" className="bg-white/5" />
                          <Input label="Redirect URI" placeholder="http://localhost:4000/api/auth/google/callback" className="bg-white/5" />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--muted)' }}>
                          ENV Variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
                        </p>
                      </div>

                      {/* JWT Secret */}
                      <div className="p-5 rounded-lg border border-green-600" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-green-500" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                JWT Secret Key
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500 text-white">
                                REQUIRED
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Token signing key for authentication. REQUIRED for the app to function. Generate with: <code className="bg-white/10 px-1 rounded">node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"</code>
                        </p>
                        <div className="space-y-3">
                          <Input
                            label="JWT Secret"
                            type="password"
                            placeholder="Generate a secure random 64-character hex string"
                            className="bg-white/5"
                          />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--muted)' }}>
                          ENV Variable: JWT_SECRET
                        </p>
                      </div>

                      {/* Polar API */}
                      <div className="p-5 rounded-lg border-2 border-blue-500" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-blue-500" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                Polar API
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500 text-white">
                                CONFIGURED
                              </span>
                            </div>
                          </div>
                          <a
                            href="https://admin.polaraccesslink.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
                          >
                            Manage Account →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Live heart rate and HRV data from Polar H10. Real-time ECG streaming enabled.
                        </p>
                        <div className="space-y-3">
                          <Input
                            label="Polar Account Email"
                            value="brokerpinellas@gmail.com"
                            readOnly
                            className="bg-white/5"
                          />
                          <Input
                            label="Polar Account Password"
                            type="password"
                            value="6922FargoTrail1!"
                            readOnly
                            className="bg-white/5"
                          />
                          <Input
                            label="Client ID"
                            value="4e6d92e4-f988-4ebb-a0d0-8baa5a79c452"
                            readOnly
                            className="bg-white/5 font-mono text-sm"
                          />
                          <Input
                            label="Client Secret"
                            type="password"
                            value="8a782e02-ce7e-4ff1-a0ed-1f832c1752eb"
                            readOnly
                            className="bg-white/5 font-mono text-sm"
                          />
                          <Input
                            label="Redirect URI"
                            value="http://localhost:4000/api/polar/callback"
                            readOnly
                            className="bg-white/5"
                          />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--muted)' }}>
                          ENV Variables: POLAR_CLIENT_ID, POLAR_CLIENT_SECRET, POLAR_REDIRECT_URI
                        </p>
                        <div className="mt-3 p-3 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                          <div className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5" />
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              <p className="font-semibold text-green-400 mb-1">Polar H10 Ready for Live Streaming</p>
                              <p>Connect your Polar H10 via Bluetooth to stream real-time ECG, heart rate, and HRV data directly to the ACD-1000 display.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PostgreSQL */}
                      <div className="p-5 rounded-lg border-2 border-green-500" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Server className="h-5 w-5 text-green-500" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                PostgreSQL Database
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500 text-white">
                                REQUIRED
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Primary database for all application data. REQUIRED for the app to function.
                        </p>
                        <div className="space-y-3">
                          <Input label="Host" placeholder="localhost" className="bg-white/5" />
                          <Input label="Port" placeholder="5432" className="bg-white/5" />
                          <Input label="Database Name" placeholder="heart_recovery_calendar" className="bg-white/5" />
                          <Input label="Username" placeholder="postgres" className="bg-white/5" />
                          <Input label="Password" type="password" placeholder="Enter database password" className="bg-white/5" />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--muted)' }}>
                          ENV Variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
                        </p>
                      </div>

                      {/* Samsung Health */}
                      <div className="p-5 rounded-lg border-2 border-purple-500" style={{ backgroundColor: 'rgba(168, 85, 247, 0.05)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Watch className="h-5 w-5 text-purple-500" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                Samsung Health API
                              </h4>
                              <div className="flex gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500 text-white">
                                  READY
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500 text-white">
                                  Galaxy Watch 8
                                </span>
                              </div>
                            </div>
                          </div>
                          <a
                            href="https://developer.samsung.com/health"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition-colors"
                          >
                            Get Credentials →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Comprehensive health data from Samsung Galaxy Watch: ECG, Heart Rate, HRV, Blood Pressure, SpO2, Respiratory Rate, Sleep, and Exercise.
                        </p>
                        <div className="space-y-3">
                          <Input label="Samsung Account Email" placeholder="Your Samsung account email" className="bg-white/5" />
                          <Input label="Client ID" placeholder="Enter Samsung Health client ID" className="bg-white/5 font-mono text-sm" />
                          <Input label="Client Secret" placeholder="Enter Samsung Health client secret" type="password" className="bg-white/5 font-mono text-sm" />
                          <Input label="Redirect URI" value="http://localhost:4000/api/samsung/callback" readOnly className="bg-white/5" />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: 'var(--muted)' }}>
                          ENV Variables: SAMSUNG_CLIENT_ID, SAMSUNG_CLIENT_SECRET, SAMSUNG_REDIRECT_URI
                        </p>
                        <div className="mt-3 p-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              <p className="font-semibold text-blue-400 mb-1">Samsung Galaxy Watch Integration</p>
                              <p>Once configured, your Galaxy Watch 8 will stream real-time vitals including ECG waveforms directly to the ACD-1000 display on the Vitals page.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SMTP Email */}
                      <div className="p-5 rounded-lg border-2 border-orange-500" style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-orange-500" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                SMTP Email
                              </h4>
                              <div className="flex gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-500 text-white">
                                  CRITICAL
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500 text-white">
                                  Heart-Health Alerts
                                </span>
                              </div>
                            </div>
                          </div>
                          <a
                            href="https://myaccount.google.com/apppasswords"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
                          >
                            Gmail App Password →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Sends detailed email alerts when patients approach or exceed sodium/cholesterol limits. REQUIRED for patient safety.
                        </p>
                        <div className="space-y-3">
                          <Input label="SMTP Host" placeholder="smtp.gmail.com" className="bg-white/5" />
                          <Input label="SMTP Port" placeholder="587" className="bg-white/5" />
                          <Input label="SMTP User (Email)" placeholder="your_email@gmail.com" className="bg-white/5" />
                          <Input label="SMTP Password (App Password)" type="password" placeholder="Enter Gmail App Password" className="bg-white/5" />
                          <Input label="From Email" placeholder="noreply@heartrecovery.com" className="bg-white/5" />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--muted)' }}>
                          ENV Variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL
                        </p>
                      </div>

                      {/* Strava API */}
                      <div className="p-5 rounded-lg border-2 border-orange-500" style={{ backgroundColor: 'rgba(249, 115, 22, 0.05)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-orange-500" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                Strava API
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500 text-white">
                                CONFIGURED
                              </span>
                            </div>
                          </div>
                          <a
                            href="https://www.strava.com/settings/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
                          >
                            Manage Account →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Exercise tracking with heart rate zones, pace, distance, elevation. Syncs workouts and treadmill sessions automatically.
                        </p>
                        <div className="space-y-3">
                          <Input
                            label="Client ID"
                            value="183361"
                            readOnly
                            className="bg-white/5 font-mono text-sm"
                          />
                          <Input
                            label="Client Secret"
                            type="password"
                            value="c3f614787ac74ebb9a70f013a7850d32fef82f98"
                            readOnly
                            className="bg-white/5 font-mono text-sm"
                          />
                          <Input
                            label="Redirect URI"
                            value="http://localhost:4000/api/strava/callback"
                            readOnly
                            className="bg-white/5"
                          />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--muted)' }}>
                          ENV Variables: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI
                        </p>
                        <div className="mt-3 p-3 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                          <div className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5" />
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              <p className="font-semibold text-green-400 mb-1">Strava Treadmill & Exercise Sync Active</p>
                              <p>All runs, walks, and cycling activities will automatically sync to your exercise logs with real-time heart rate data.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* MIR Spirometry */}
                      <div className="p-5 rounded-lg border-2 border-cyan-500" style={{ backgroundColor: 'rgba(6, 182, 212, 0.05)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-cyan-500" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                MIR Spirometry (Smart One / Spirobank Smart)
                              </h4>
                              <div className="flex gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500 text-white">
                                  READY
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500 text-white">
                                  Bluetooth SDK
                                </span>
                              </div>
                            </div>
                          </div>
                          <a
                            href="https://spirometry.com/oem-api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-600 transition-colors"
                          >
                            Get SDK →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Professional spirometry with FEV1, FVC, PEF measurements. Bluetooth Smart BLE 4.0 for real-time lung function monitoring.
                        </p>
                        <div className="space-y-3">
                          <Input
                            label="SDK License Key"
                            placeholder="Enter MIR SDK license key (optional for personal use)"
                            className="bg-white/5 font-mono text-sm"
                          />
                          <Input
                            label="Device Serial Number"
                            placeholder="Enter spirometer serial number"
                            className="bg-white/5"
                          />
                          <Input
                            label="Bluetooth Device Name"
                            placeholder="MIR SmartOne or Spirobank"
                            className="bg-white/5"
                          />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--muted)' }}>
                          SDK Available: Android, iOS, Windows | Connection: Bluetooth Smart 5.0
                        </p>
                        <div className="mt-3 p-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              <p className="font-semibold text-blue-400 mb-1">Live Spirometry Display Integration</p>
                              <p>Once paired, test results (FEV1, FVC, PEF) stream in real-time to the Vitals page spirometry display with flow-volume curves and trend charts.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* OpenWeather API */}
                      <div className="p-5 rounded-lg border border-blue-600 mt-6" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Cloud className="h-5 w-5 text-blue-500" />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                OpenWeather API
                              </h4>
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500 text-white">
                                CONFIGURED
                              </span>
                            </div>
                          </div>
                          <a
                            href="https://openweathermap.org/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-gray-600 text-white text-sm font-semibold hover:bg-gray-500 transition-colors"
                          >
                            Get API Key →
                          </a>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Real-time weather data for HAWK alerts and hydration recommendations. CRITICAL for detecting dangerous weather conditions.
                        </p>
                        <div className="space-y-3">
                          <Input
                            label="Account Email"
                            value="cluesnomads@gmail.com"
                            placeholder="OpenWeather account email"
                            className="bg-white/5"
                            readOnly
                          />
                          <Input
                            label="Account Password"
                            value="6922FargoTrail1!"
                            type="password"
                            placeholder="OpenWeather account password"
                            className="bg-white/5"
                            readOnly
                          />
                          <Input
                            label="API Key"
                            value="ee1f0de4b821991aea24df913acca451"
                            placeholder="Enter OpenWeather API key"
                            className="bg-white/5 font-mono text-sm"
                            readOnly
                          />
                        </div>
                        <p className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--muted)' }}>
                          ENV Variable: OPENWEATHER_API_KEY
                        </p>
                        <div className="mt-3 p-3 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                          <div className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5" />
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              <p className="font-semibold text-green-400 mb-1">Account Owner: John Desautels</p>
                              <p>This API enables weather-based HAWK alerts for detecting life-threatening combinations like outdoor exercise in extreme heat while on diuretics.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-sky-400" />
                          <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                            Security Note
                          </h4>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>
                          These credentials are currently stored in your local browser. For production deployment, all credentials should be stored securely in environment variables on your server. Never commit credentials to version control.
                        </p>
                      </div>
                    </>
                  )}

                  {section.id === 'settings' && (
                    <>
                      <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5" style={{ color: '#6366f1' }} />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                Time Format
                              </h4>
                              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                                Choose how times are displayed throughout the app
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toast.success('Edit time format settings')}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => toast.success('Delete time format setting')}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTimeFormatChange('12h')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                              timeFormat === '12h'
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            12h
                          </button>
                          <button
                            onClick={() => handleTimeFormatChange('24h')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                              timeFormat === '24h'
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            24h
                          </button>
                        </div>
                        <div className="mt-3 p-3 rounded bg-white/5 text-sm" style={{ color: 'var(--muted)' }}>
                          <strong>Preview:</strong> {timeFormat === '12h' ? '2:30 PM' : '14:30'}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Download className="h-5 w-5" style={{ color: '#6366f1' }} />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                Default Export Format
                              </h4>
                              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                                Choose the default format when exporting calendar data
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowExportFormatsModal(true)}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                              title="Edit Export Formats"
                            >
                              <Edit2 className="h-4 w-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => setShowExportFormatsModal(true)}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                              title="Manage Export Formats"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleExportFormatChange('ics')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                              exportFormat === 'ics'
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            ICS
                          </button>
                          <button
                            onClick={() => handleExportFormatChange('json')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                              exportFormat === 'json'
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            JSON
                          </button>
                          <button
                            onClick={() => handleExportFormatChange('csv')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                              exportFormat === 'csv'
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            CSV
                          </button>
                        </div>
                        <div className="mt-3 p-3 rounded bg-white/5 text-sm" style={{ color: 'var(--muted)' }}>
                          <strong>Format info:</strong>{' '}
                          {exportFormat === 'ics' && 'iCalendar format - Compatible with Google Calendar, Outlook, Apple Calendar'}
                          {exportFormat === 'json' && 'JSON format - Best for data analysis and custom integrations'}
                          {exportFormat === 'csv' && 'CSV format - Compatible with Excel and spreadsheet applications'}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Download className="h-5 w-5" style={{ color: '#6366f1' }} />
                            <div>
                              <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>
                                Default Import Format
                              </h4>
                              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                                Choose the default format when importing calendar data
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowAddSettingModal(true)}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                              title="Edit Import Formats"
                            >
                              <Edit2 className="h-4 w-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => setShowAddSettingModal(true)}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                              title="Manage Import Formats"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {availableImportFormats.map((format) => (
                            <button
                              key={format}
                              onClick={() => handleImportFormatChange(format)}
                              className={`px-4 py-2 rounded-lg font-semibold uppercase transition-all ${
                                importFormat === format
                                  ? 'bg-indigo-500 text-white shadow-lg'
                                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
                              }`}
                            >
                              {format}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 p-3 rounded bg-white/5 text-sm" style={{ color: 'var(--muted)' }}>
                          <strong>Current format:</strong> {importFormat.toUpperCase()} - Click "Manage Import Formats" above to add or remove formats
                        </div>
                      </div>
                    </>
                  )}

                  {section.id === 'personal' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            First Name
                          </label>
                          <Input
                            value={patientData?.firstName || ''}
                            onChange={(e) => handleChange('firstName', e.target.value)}
                            icon={<User className="h-5 w-5" />}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Last Name
                          </label>
                          <Input
                            value={patientData?.lastName || ''}
                            onChange={(e) => handleChange('lastName', e.target.value)}
                            icon={<User className="h-5 w-5" />}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Date of Birth
                          </label>
                          <Input
                            type="date"
                            value={patientData?.dateOfBirth || ''}
                            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                            icon={<Calendar className="h-5 w-5" />}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Gender
                          </label>
                          <select
                            value={patientData?.gender || ''}
                            onChange={(e) => handleChange('gender', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                            style={{ color: '#000000', fontWeight: '800' }}
                          >
                            <option value="">Select...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Age (Auto-calculated)
                          </label>
                          <Input
                            type="number"
                            value={patientData?.age !== undefined && patientData?.age !== null ? patientData.age : ''}
                            disabled
                            icon={<Calendar className="h-5 w-5" />}
                            placeholder="Auto-calculated from Date of Birth"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Race
                          </label>
                          <input
                            type="text"
                            list="race-suggestions"
                            value={patientData?.race || ''}
                            onChange={(e) => handleChange('race', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                            style={{ color: '#000000', fontWeight: '800' }}
                            placeholder="Start typing to see suggestions..."
                          />
                          <datalist id="race-suggestions">
                            <option value="American Indian or Alaska Native" />
                            <option value="Asian" />
                            <option value="Black or African American" />
                            <option value="Hispanic or Latino" />
                            <option value="Native Hawaiian or Other Pacific Islander" />
                            <option value="White or Caucasian" />
                            <option value="Two or More Races" />
                            <option value="Other" />
                            <option value="Prefer not to say" />
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Nationality
                          </label>
                          <input
                            type="text"
                            list="nationality-suggestions"
                            value={patientData?.nationality || ''}
                            onChange={(e) => handleChange('nationality', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                            style={{ color: '#000000', fontWeight: '800' }}
                            placeholder="Start typing to see suggestions..."
                          />
                          <datalist id="nationality-suggestions">
                            <option value="Afghan" />
                            <option value="Albanian" />
                            <option value="Algerian" />
                            <option value="American" />
                            <option value="Argentinian" />
                            <option value="Australian" />
                            <option value="Austrian" />
                            <option value="Bangladeshi" />
                            <option value="Belgian" />
                            <option value="Brazilian" />
                            <option value="British" />
                            <option value="Bulgarian" />
                            <option value="Cambodian" />
                            <option value="Canadian" />
                            <option value="Chilean" />
                            <option value="Chinese" />
                            <option value="Colombian" />
                            <option value="Costa Rican" />
                            <option value="Croatian" />
                            <option value="Cuban" />
                            <option value="Czech" />
                            <option value="Danish" />
                            <option value="Dominican" />
                            <option value="Dutch" />
                            <option value="Ecuadorian" />
                            <option value="Egyptian" />
                            <option value="English" />
                            <option value="Ethiopian" />
                            <option value="Filipino" />
                            <option value="Finnish" />
                            <option value="French" />
                            <option value="German" />
                            <option value="Ghanaian" />
                            <option value="Greek" />
                            <option value="Guatemalan" />
                            <option value="Haitian" />
                            <option value="Honduran" />
                            <option value="Hungarian" />
                            <option value="Icelandic" />
                            <option value="Indian" />
                            <option value="Indonesian" />
                            <option value="Iranian" />
                            <option value="Iraqi" />
                            <option value="Irish" />
                            <option value="Israeli" />
                            <option value="Italian" />
                            <option value="Jamaican" />
                            <option value="Japanese" />
                            <option value="Jordanian" />
                            <option value="Kenyan" />
                            <option value="Korean" />
                            <option value="Lebanese" />
                            <option value="Malaysian" />
                            <option value="Mexican" />
                            <option value="Moroccan" />
                            <option value="Nepalese" />
                            <option value="New Zealander" />
                            <option value="Nigerian" />
                            <option value="Norwegian" />
                            <option value="Pakistani" />
                            <option value="Palestinian" />
                            <option value="Panamanian" />
                            <option value="Paraguayan" />
                            <option value="Peruvian" />
                            <option value="Polish" />
                            <option value="Portuguese" />
                            <option value="Puerto Rican" />
                            <option value="Romanian" />
                            <option value="Russian" />
                            <option value="Salvadoran" />
                            <option value="Saudi Arabian" />
                            <option value="Scottish" />
                            <option value="Senegalese" />
                            <option value="Serbian" />
                            <option value="Singaporean" />
                            <option value="Somali" />
                            <option value="South African" />
                            <option value="Spanish" />
                            <option value="Sri Lankan" />
                            <option value="Sudanese" />
                            <option value="Swedish" />
                            <option value="Swiss" />
                            <option value="Syrian" />
                            <option value="Taiwanese" />
                            <option value="Thai" />
                            <option value="Turkish" />
                            <option value="Ukrainian" />
                            <option value="Uruguayan" />
                            <option value="Venezuelan" />
                            <option value="Vietnamese" />
                            <option value="Welsh" />
                            <option value="Yemeni" />
                            <option value="Zimbabwean" />
                            <option value="Other" />
                          </datalist>
                        </div>
                      </div>

                      {/* Height Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Height
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            value={patientData?.height !== undefined && patientData?.height !== null ? patientData.height : ''}
                            onChange={(e) => handleChange('height', parseFloat(e.target.value) || 0)}
                            placeholder="Enter height"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Height Unit
                          </label>
                          <select
                            value={patientData?.heightUnit || 'in'}
                            onChange={(e) => handleChange('heightUnit', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                            style={{ color: '#000000', fontWeight: '800' }}
                          >
                            <option value="in">Inches (in)</option>
                            <option value="cm">Centimeters (cm)</option>
                          </select>
                        </div>
                      </div>

                      {/* Clear and Delete buttons for Personal Information */}
                      <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                        <button
                          onClick={handleClearPersonalInfo}
                          className="flex-1 px-4 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400 text-yellow-100 font-semibold transition-colors flex items-center justify-center gap-2"
                          title="Clear all fields (not saved until you click Save Profile)"
                        >
                          <Edit2 className="h-4 w-4" />
                          Clear Fields
                        </button>
                        <button
                          onClick={handleDeletePersonalInfo}
                          className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400 text-red-100 font-semibold transition-colors flex items-center justify-center gap-2"
                          title="Permanently delete from database"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete from DB
                        </button>
                      </div>
                    </>
                  )}

                  {section.id === 'contact' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Email
                          </label>
                          <Input
                            type="email"
                            value={patientData?.email || ''}
                            onChange={(e) => handleChange('email', e.target.value)}
                            icon={<Mail className="h-5 w-5" />}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Primary Phone
                          </label>
                          <Input
                            type="tel"
                            value={patientData?.primaryPhone || ''}
                            onChange={(e) => handleChange('primaryPhone', e.target.value)}
                            icon={<Phone className="h-5 w-5" />}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            WhatsApp Number
                          </label>
                          <Input
                            type="tel"
                            value={patientData?.whatsAppNumber || ''}
                            onChange={(e) => handleChange('whatsAppNumber', e.target.value)}
                            placeholder="+1 234 567 8900"
                            icon={<Phone className="h-5 w-5" />}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Phone Type
                          </label>
                          <select
                            value={patientData?.primaryPhoneType || ''}
                            onChange={(e) => handleChange('primaryPhoneType', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                            style={{ color: '#000000', fontWeight: '800' }}
                          >
                            <option value="">Select...</option>
                            <option value="mobile">Mobile</option>
                            <option value="home">Home</option>
                            <option value="work">Work</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Preferred Contact
                          </label>
                          <select
                            value={patientData?.preferredContactMethod || ''}
                            onChange={(e) => handleChange('preferredContactMethod', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                            style={{ color: '#000000', fontWeight: '800' }}
                          >
                            <option value="">Select...</option>
                            <option value="phone">Phone</option>
                            <option value="email">Email</option>
                            <option value="text">Text</option>
                            <option value="whatsapp">WhatsApp</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Best Time to Contact
                          </label>
                          <select
                            value={patientData?.bestTimeToContact || ''}
                            onChange={(e) => handleChange('bestTimeToContact', e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                            style={{ color: '#000000', fontWeight: '800' }}
                          >
                            <option value="">Select...</option>
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="evening">Evening</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Street Address
                        </label>
                        <Input
                          value={patientData?.streetAddress || ''}
                          onChange={(e) => handleChange('streetAddress', e.target.value)}
                          icon={<MapPin className="h-5 w-5" />}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            City
                          </label>
                          <Input
                            value={patientData?.city || ''}
                            onChange={(e) => handleChange('city', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            State
                          </label>
                          <Input
                            value={patientData?.state || ''}
                            onChange={(e) => handleChange('state', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Postal Code
                          </label>
                          <Input
                            value={patientData?.postalCode || ''}
                            onChange={(e) => handleChange('postalCode', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {section.id === 'emergency' && (
                    <>
                      <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#ef4444' }}>
                          <Shield className="h-5 w-5" />
                          Emergency Contact #1
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                Full Name
                              </label>
                              <Input
                                value={patientData?.emergencyContact1Name || ''}
                                onChange={(e) => handleChange('emergencyContact1Name', e.target.value)}
                                    icon={<User className="h-5 w-5" />}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                Relationship
                              </label>
                              <Input
                                value={patientData?.emergencyContact1Relationship || ''}
                                onChange={(e) => handleChange('emergencyContact1Relationship', e.target.value)}
                                    placeholder="e.g., Spouse, Parent, Sibling"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                Phone
                              </label>
                              <Input
                                type="tel"
                                value={patientData?.emergencyContact1Phone || ''}
                                onChange={(e) => handleChange('emergencyContact1Phone', e.target.value)}
                                    icon={<Phone className="h-5 w-5" />}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                Alternate Phone
                              </label>
                              <Input
                                type="tel"
                                value={patientData?.emergencyContact1AlternatePhone || ''}
                                onChange={(e) => handleChange('emergencyContact1AlternatePhone', e.target.value)}
                                    icon={<Phone className="h-5 w-5" />}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                Email
                              </label>
                              <Input
                                type="email"
                                value={patientData?.emergencyContact1Email || ''}
                                onChange={(e) => handleChange('emergencyContact1Email', e.target.value)}
                                    icon={<Mail className="h-5 w-5" />}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#ef4444' }}>
                          <Shield className="h-5 w-5" />
                          Emergency Contact #2
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                Full Name
                              </label>
                              <Input
                                value={patientData?.emergencyContact2Name || ''}
                                onChange={(e) => handleChange('emergencyContact2Name', e.target.value)}
                                    icon={<User className="h-5 w-5" />}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                Relationship
                              </label>
                              <Input
                                value={patientData?.emergencyContact2Relationship || ''}
                                onChange={(e) => handleChange('emergencyContact2Relationship', e.target.value)}
                                    placeholder="e.g., Spouse, Parent, Sibling"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                Phone
                              </label>
                              <Input
                                type="tel"
                                value={patientData?.emergencyContact2Phone || ''}
                                onChange={(e) => handleChange('emergencyContact2Phone', e.target.value)}
                                    icon={<Phone className="h-5 w-5" />}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                Alternate Phone
                              </label>
                              <Input
                                type="tel"
                                value={patientData?.emergencyContact2AlternatePhone || ''}
                                onChange={(e) => handleChange('emergencyContact2AlternatePhone', e.target.value)}
                                    icon={<Phone className="h-5 w-5" />}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                Email
                              </label>
                              <Input
                                type="email"
                                value={patientData?.emergencyContact2Email || ''}
                                onChange={(e) => handleChange('emergencyContact2Email', e.target.value)}
                                    icon={<Mail className="h-5 w-5" />}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {section.id === 'cardiac' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Ejection Fraction (%)
                        </label>
                        <Input
                          type="number"
                          value={patientData?.ejectionFraction !== undefined && patientData?.ejectionFraction !== null ? patientData.ejectionFraction : ''}
                          onChange={(e) => handleChange('ejectionFraction', parseFloat(e.target.value))}
                          icon={<Activity className="h-5 w-5" />}
                          placeholder="Enter ejection fraction percentage"
                        />
                      </div>
                      {/* SECTION 1: Current Heart Condition */}
                      <div
                        className="mt-8 p-6 rounded-2xl transition-all duration-300"
                        style={{
                          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08), rgba(219, 39, 119, 0.04))',
                          border: '2px solid rgba(236, 72, 153, 0.25)',
                          boxShadow: '0 8px 16px rgba(236, 72, 153, 0.12), inset 0 2px 0 rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b-2" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                          <div
                            className="px-4 py-2 rounded-lg"
                            style={{
                              background: 'linear-gradient(135deg, #ec4899, #db2777)',
                              boxShadow: '0 4px 8px rgba(236, 72, 153, 0.3)',
                            }}
                          >
                            <span className="text-white font-bold text-sm">SECTION 1</span>
                          </div>
                          <h3 className="text-xl font-extrabold" style={{ color: '#ec4899' }}>
                            Current Diagnosed Conditions
                          </h3>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Date of Diagnosis
                          </label>
                          <Input
                            type="date"
                            value={patientData?.diagnosisDate || ''}
                            onChange={(e) => handleChange('diagnosisDate', e.target.value)}
                            icon={<Calendar className="h-5 w-5" />}
                          />
                        </div>

                        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>
                          Select Your Heart Condition(s)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            'Coronary Artery Disease (CAD)',
                            'Heart Failure',
                            'Atrial Fibrillation (AFib)',
                            'Hypertension (High Blood Pressure)',
                            'Myocardial Infarction (Heart Attack)',
                            'Angina',
                            'Arrhythmia',
                            'Cardiomyopathy',
                            'Valvular Heart Disease',
                            'Congenital Heart Disease',
                            'Pericarditis',
                            'Peripheral Artery Disease (PAD)',
                            'Rheumatic Fever',
                            'Other (specify in notes)'
                          ].map((condition) => (
                            <label
                              key={condition}
                              className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300"
                              style={{
                                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(219, 39, 119, 0.05))',
                                border: '2px solid rgba(236, 72, 153, 0.3)',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(236, 72, 153, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.6)';
                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15), 0 12px 24px rgba(236, 72, 153, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.3)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(236, 72, 153, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={patientData?.cardiacDiagnosis?.includes(condition) || false}
                                onChange={(e) => handleCheckboxArrayChange('cardiacDiagnosis', condition, e.target.checked)}
                                className="w-5 h-5 rounded border-2 border-pink-400 bg-white/10 checked:bg-pink-500 checked:border-pink-500 focus:ring-2 focus:ring-pink-500/50 transition-all cursor-pointer"
                              />
                              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                                {condition}
                              </span>
                            </label>
                          ))}
                        </div>

                        {/* Critical Notes Field for Section 1 */}
                        <div className="mt-6">
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Clinical Notes & Additional Details
                            <span className="ml-2 text-xs font-normal text-pink-600">(Critical information about your conditions)</span>
                          </label>
                          <textarea
                            value={patientData?.cardiacNotes || ''}
                            onChange={(e) => handleChange('cardiacNotes', e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl transition-all duration-200 resize-none"
                            style={{
                              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.05), rgba(219, 39, 119, 0.02))',
                              border: '2px solid rgba(236, 72, 153, 0.3)',
                              color: '#000000',
                              fontWeight: '700',
                              fontSize: '0.95rem',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(8px)',
                            }}
                            placeholder="Enter important details about your cardiac conditions, symptoms, triggers, or any other critical information your care team should know..."
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.6)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(236, 72, 153, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.3)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                            }}
                          />
                        </div>
                      </div>

                      {/* SECTION 2: Current Planned Treatment Protocol */}
                      <div
                        className="mt-8 p-6 rounded-2xl transition-all duration-300"
                        style={{
                          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(124, 58, 237, 0.04))',
                          border: '2px solid rgba(139, 92, 246, 0.25)',
                          boxShadow: '0 8px 16px rgba(139, 92, 246, 0.12), inset 0 2px 0 rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b-2" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                          <div
                            className="px-4 py-2 rounded-lg"
                            style={{
                              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                              boxShadow: '0 4px 8px rgba(139, 92, 246, 0.3)',
                            }}
                          >
                            <span className="text-white font-bold text-sm">SECTION 2</span>
                          </div>
                          <h3 className="text-xl font-extrabold" style={{ color: '#8b5cf6' }}>
                            Active Treatment Plan
                          </h3>
                        </div>

                        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>
                          Current Treatment Methods
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            'No treatment presently',
                            'Lifestyle & Diet Modifications',
                            'Nutraceuticals',
                            'Managed Medications',
                            'Non-Invasive Medical Procedures'
                          ].map((protocol) => (
                            <label
                              key={protocol}
                              className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300"
                              style={{
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05))',
                                border: '2px solid rgba(139, 92, 246, 0.3)',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15), 0 12px 24px rgba(139, 92, 246, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={patientData?.currentTreatmentProtocol?.includes(protocol) || false}
                                onChange={(e) => handleCheckboxArrayChange('currentTreatmentProtocol', protocol, e.target.checked)}
                                className="w-5 h-5 rounded border-2 border-purple-400 bg-white/10 checked:bg-purple-500 checked:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer"
                              />
                              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                                {protocol}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* SECTION 3: Recommended Long-Term Treatment Options */}
                      <div
                        className="mt-8 p-6 rounded-2xl transition-all duration-300"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.04))',
                          border: '2px solid rgba(59, 130, 246, 0.25)',
                          boxShadow: '0 8px 16px rgba(59, 130, 246, 0.12), inset 0 2px 0 rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b-2" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                          <div
                            className="px-4 py-2 rounded-lg"
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                              boxShadow: '0 4px 8px rgba(59, 130, 246, 0.3)',
                            }}
                          >
                            <span className="text-white font-bold text-sm">SECTION 3</span>
                          </div>
                          <h3 className="text-xl font-extrabold" style={{ color: '#3b82f6' }}>
                            Future Treatment Options
                          </h3>
                        </div>

                        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>
                          Long-Term Interventions & Therapies
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            'Coronary Artery Bypass Grafting (CABG)',
                            'Percutaneous Coronary Intervention (PCI/Stenting)',
                            'Heart Valve Repair/Replacement',
                            'Implantable Cardioverter Defibrillator (ICD)',
                            'Pacemaker Implantation',
                            'Cardiac Rehabilitation Program',
                            'Anticoagulation Therapy',
                            'Beta Blocker Therapy',
                            'ACE Inhibitor/ARB Therapy',
                            'Statin Therapy',
                            'Catheter Ablation',
                            'Left Ventricular Assist Device (LVAD)',
                            'Heart Transplant Evaluation',
                            'Regular Cardiac Monitoring',
                            'Weight Management Program'
                          ].map((treatment) => (
                            <label
                              key={treatment}
                              className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300"
                              style={{
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))',
                                border: '2px solid rgba(59, 130, 246, 0.3)',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15), 0 12px 24px rgba(59, 130, 246, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={patientData?.recommendedTreatments?.includes(treatment) || false}
                                onChange={(e) => handleCheckboxArrayChange('recommendedTreatments', treatment, e.target.checked)}
                                className="w-5 h-5 rounded border-2 border-blue-400 bg-white/10 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                              />
                              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                                {treatment}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div ref={medAutocompleteRef} className="mt-8">
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Cardiac Medications
                        </label>

                        {/* Selected medications as chips */}
                        {patientData?.medicationsAffectingHR && patientData.medicationsAffectingHR.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {patientData.medicationsAffectingHR.map((medName, index) => (
                              <div
                                key={`${medName}-${index}`}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(219, 39, 119, 0.08))',
                                  border: '2px solid rgba(236, 72, 153, 0.4)',
                                  color: '#000000',
                                  fontWeight: '800',
                                  fontSize: '0.875rem'
                                }}
                              >
                                <Pill className="h-3.5 w-3.5" style={{ color: '#ec4899' }} />
                                <span>{medName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMedication(medName)}
                                  className="ml-1 hover:bg-pink-200 rounded-full p-0.5 transition-colors"
                                  title="Remove medication"
                                >
                                  <X className="h-3.5 w-3.5" style={{ color: '#ec4899' }} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Autocomplete input */}
                        <div className="relative">
                          <input
                            type="text"
                            value={medInputValue}
                            onChange={(e) => handleMedInputChange(e.target.value)}
                            onKeyDown={handleMedKeyDown}
                            onFocus={() => medInputValue.length >= 2 && setShowMedSuggestions(true)}
                            placeholder="Start typing medication name (e.g., Metoprolol, Lisinopril)..."
                            className="glass-input"
                            style={{
                              paddingLeft: '3rem',
                              color: '#000000',
                              fontWeight: '800'
                            }}
                            autoComplete="off"
                          />
                          <Pill className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-pink-500 pointer-events-none" />

                          {/* Autocomplete dropdown */}
                          {showMedSuggestions && medSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border-2 border-pink-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                              {medSuggestions.map((medication, index) => {
                                const alreadySelected = patientData?.medicationsAffectingHR?.includes(medication.name);

                                return (
                                  <div
                                    key={`${medication.name}-${index}`}
                                    className={`px-4 py-3 cursor-pointer transition-colors ${
                                      index === highlightedMedIndex
                                        ? 'bg-pink-100'
                                        : alreadySelected
                                        ? 'bg-gray-100 opacity-60'
                                        : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => !alreadySelected && handleSelectMedication(medication)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="font-bold text-gray-900 flex items-center gap-2">
                                          {medication.name}
                                          {alreadySelected && (
                                            <span className="text-xs bg-pink-200 text-pink-800 px-2 py-0.5 rounded-full">
                                              Already added
                                            </span>
                                          )}
                                        </div>
                                        {medication.brandNames && medication.brandNames.length > 0 && (
                                          <div className="text-xs text-gray-600 mt-1">
                                            Brand names: {medication.brandNames.join(', ')}
                                          </div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-1">
                                          {medication.category}
                                          {medication.description && ` • ${medication.description}`}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Activity Restrictions
                        </label>
                        <textarea
                          value={patientData?.activityRestrictions || ''}
                          onChange={(e) => handleChange('activityRestrictions', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30 outline-none transition-all resize-none"
                          style={{ color: '#000000', fontWeight: '800' }}
                          placeholder="Weight limits, movements to avoid, etc."
                        />
                      </div>
                    </>
                  )}

                  {section.id === 'medical' && (
                    <>
                      {/* Tab Navigation */}
                      <div className="flex gap-2 mb-6 border-b border-purple-500/30">
                        <button
                          onClick={() => setMedicalHistoryTab('overview')}
                          className={`px-6 py-3 font-semibold transition-all duration-300 ${
                            medicalHistoryTab === 'overview'
                              ? 'text-purple-600 border-b-2 border-purple-600'
                              : 'text-gray-500 hover:text-purple-500'
                          }`}
                        >
                          📋 Overview
                        </button>
                        <button
                          onClick={() => setMedicalHistoryTab('labs')}
                          className={`px-6 py-3 font-semibold transition-all duration-300 ${
                            medicalHistoryTab === 'labs'
                              ? 'text-purple-600 border-b-2 border-purple-600'
                              : 'text-gray-500 hover:text-purple-500'
                          }`}
                        >
                          🧪 My Labs
                        </button>
                        <button
                          onClick={() => setMedicalHistoryTab('reports')}
                          className={`px-6 py-3 font-semibold transition-all duration-300 ${
                            medicalHistoryTab === 'reports'
                              ? 'text-purple-600 border-b-2 border-purple-600'
                              : 'text-gray-500 hover:text-purple-500'
                          }`}
                        >
                          📄 My Reports
                        </button>
                      </div>

                      {/* Overview Tab */}
                      {medicalHistoryTab === 'overview' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                              Current Conditions (comma-separated)
                            </label>
                            <Input
                              value={patientData?.currentConditions?.join(', ') || ''}
                              onChange={(e) => handleArrayChange('currentConditions', e.target.value)}
                              placeholder="Non-cardiac current conditions"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                              Prior Health Conditions (comma-separated)
                            </label>
                            <Input
                              value={patientData?.priorHealthConditions?.join(', ') || ''}
                              onChange={(e) => handleArrayChange('priorHealthConditions', e.target.value)}
                              placeholder="Diabetes, CKD, COPD"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                              Non-Cardiac Medications
                            </label>
                            <textarea
                              value={patientData?.nonCardiacMedications || ''}
                              onChange={(e) => handleChange('nonCardiacMedications', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all resize-none"
                              style={{ color: '#000000', fontWeight: '800' }}
                              placeholder="List all medications..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                              Allergies
                            </label>
                            <textarea
                              value={patientData?.allergies || ''}
                              onChange={(e) => handleChange('allergies', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 outline-none transition-all resize-none"
                              style={{ color: '#000000', fontWeight: '800' }}
                              placeholder="List all known allergies..."
                            />
                          </div>
                        </>
                      )}

                      {/* My Labs Tab */}
                      {medicalHistoryTab === 'labs' && (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>Laboratory Results</h3>
                            <Button
                              onClick={() => {
                                // Add new lab result
                                const newLab = {
                                  id: Date.now().toString(),
                                  testName: '',
                                  testDate: new Date().toISOString().split('T')[0],
                                  testCategory: 'Blood Work',
                                  results: [],
                                  orderedBy: '',
                                  labFacility: '',
                                  notes: ''
                                };
                                setPatientData(prev => ({
                                  ...prev,
                                  labResults: [...(prev?.labResults || []), newLab]
                                }));
                              }}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Lab Result
                            </Button>
                          </div>

                          {/* Lab Results List */}
                          {patientData?.labResults && patientData.labResults.length > 0 ? (
                            <div className="space-y-4">
                              {patientData.labResults.map((lab, labIndex) => (
                                <div
                                  key={lab.id || labIndex}
                                  className="p-6 rounded-xl"
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(109, 40, 217, 0.05))',
                                    border: '2px solid rgba(139, 92, 246, 0.3)',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                  }}
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                        Test Name *
                                      </label>
                                      <Input
                                        value={lab.testName}
                                        onChange={(e) => {
                                          const updated = [...(patientData?.labResults || [])];
                                          updated[labIndex] = { ...updated[labIndex], testName: e.target.value };
                                          setPatientData(prev => ({ ...prev, labResults: updated }));
                                        }}
                                        placeholder="CBC, Lipid Panel, BMP"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                        Test Date *
                                      </label>
                                      <Input
                                        type="date"
                                        value={lab.testDate}
                                        onChange={(e) => {
                                          const updated = [...(patientData?.labResults || [])];
                                          updated[labIndex] = { ...updated[labIndex], testDate: e.target.value };
                                          setPatientData(prev => ({ ...prev, labResults: updated }));
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                        Category
                                      </label>
                                      <select
                                        value={lab.testCategory || 'Blood Work'}
                                        onChange={(e) => {
                                          const updated = [...(patientData?.labResults || [])];
                                          updated[labIndex] = { ...updated[labIndex], testCategory: e.target.value };
                                          setPatientData(prev => ({ ...prev, labResults: updated }));
                                        }}
                                        className="glass-input w-full"
                                      >
                                        <option value="Blood Work">Blood Work</option>
                                        <option value="Cardiac">Cardiac</option>
                                        <option value="Metabolic">Metabolic</option>
                                        <option value="Thyroid">Thyroid</option>
                                        <option value="Kidney">Kidney</option>
                                        <option value="Liver">Liver</option>
                                        <option value="Other">Other</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                        Ordered By
                                      </label>
                                      <Input
                                        value={lab.orderedBy || ''}
                                        onChange={(e) => {
                                          const updated = [...(patientData?.labResults || [])];
                                          updated[labIndex] = { ...updated[labIndex], orderedBy: e.target.value };
                                          setPatientData(prev => ({ ...prev, labResults: updated }));
                                        }}
                                        placeholder="Dr. Smith"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                        Lab Facility
                                      </label>
                                      <Input
                                        value={lab.labFacility || ''}
                                        onChange={(e) => {
                                          const updated = [...(patientData?.labResults || [])];
                                          updated[labIndex] = { ...updated[labIndex], labFacility: e.target.value };
                                          setPatientData(prev => ({ ...prev, labResults: updated }));
                                        }}
                                        placeholder="Quest Diagnostics"
                                      />
                                    </div>
                                  </div>

                                  <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                      Notes
                                    </label>
                                    <textarea
                                      value={lab.notes || ''}
                                      onChange={(e) => {
                                        const updated = [...(patientData?.labResults || [])];
                                        updated[labIndex] = { ...updated[labIndex], notes: e.target.value };
                                        setPatientData(prev => ({ ...prev, labResults: updated }));
                                      }}
                                      rows={2}
                                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all resize-none"
                                      style={{ color: '#000000', fontWeight: '800' }}
                                      placeholder="Additional notes about this lab test..."
                                    />
                                  </div>

                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => {
                                        const updated = patientData?.labResults?.filter((_, i) => i !== labIndex);
                                        setPatientData(prev => ({ ...prev, labResults: updated }));
                                      }}
                                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete Lab Result
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-500">
                              <p className="text-lg mb-2">No lab results added yet</p>
                              <p className="text-sm">Click "Add Lab Result" to track your laboratory tests</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* My Reports Tab */}
                      {medicalHistoryTab === 'reports' && (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>Medical Reports</h3>
                            <Button
                              onClick={() => {
                                // Add new medical report
                                const newReport = {
                                  id: Date.now().toString(),
                                  reportType: 'Imaging',
                                  reportName: '',
                                  reportDate: new Date().toISOString().split('T')[0],
                                  provider: '',
                                  facility: '',
                                  findings: '',
                                  recommendations: '',
                                  fileUrl: '',
                                  fileName: '',
                                  fileType: '',
                                  notes: ''
                                };
                                setPatientData(prev => ({
                                  ...prev,
                                  medicalReports: [...(prev?.medicalReports || []), newReport]
                                }));
                              }}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Report
                            </Button>
                          </div>

                          {/* Medical Reports List */}
                          {patientData?.medicalReports && patientData.medicalReports.length > 0 ? (
                            <div className="space-y-4">
                              {patientData.medicalReports.map((report, reportIndex) => (
                                <div
                                  key={report.id || reportIndex}
                                  className="p-6 rounded-xl"
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(109, 40, 217, 0.05))',
                                    border: '2px solid rgba(139, 92, 246, 0.3)',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                  }}
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                        Report Type *
                                      </label>
                                      <select
                                        value={report.reportType}
                                        onChange={(e) => {
                                          const updated = [...(patientData?.medicalReports || [])];
                                          updated[reportIndex] = { ...updated[reportIndex], reportType: e.target.value };
                                          setPatientData(prev => ({ ...prev, medicalReports: updated }));
                                        }}
                                        className="glass-input w-full"
                                      >
                                        <option value="Imaging">Imaging (X-ray, CT, MRI)</option>
                                        <option value="Cardiology">Cardiology (Echo, EKG, Stress Test)</option>
                                        <option value="Pathology">Pathology</option>
                                        <option value="Consultation">Consultation Note</option>
                                        <option value="Discharge Summary">Discharge Summary</option>
                                        <option value="Operative Report">Operative Report</option>
                                        <option value="Other">Other</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                        Report Name *
                                      </label>
                                      <Input
                                        value={report.reportName}
                                        onChange={(e) => {
                                          const updated = [...(patientData?.medicalReports || [])];
                                          updated[reportIndex] = { ...updated[reportIndex], reportName: e.target.value };
                                          setPatientData(prev => ({ ...prev, medicalReports: updated }));
                                        }}
                                        placeholder="Chest X-Ray, Echocardiogram"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                        Report Date *
                                      </label>
                                      <Input
                                        type="date"
                                        value={report.reportDate}
                                        onChange={(e) => {
                                          const updated = [...(patientData?.medicalReports || [])];
                                          updated[reportIndex] = { ...updated[reportIndex], reportDate: e.target.value };
                                          setPatientData(prev => ({ ...prev, medicalReports: updated }));
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                        Provider
                                      </label>
                                      <Input
                                        value={report.provider || ''}
                                        onChange={(e) => {
                                          const updated = [...(patientData?.medicalReports || [])];
                                          updated[reportIndex] = { ...updated[reportIndex], provider: e.target.value };
                                          setPatientData(prev => ({ ...prev, medicalReports: updated }));
                                        }}
                                        placeholder="Dr. Johnson"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                        Facility
                                      </label>
                                      <Input
                                        value={report.facility || ''}
                                        onChange={(e) => {
                                          const updated = [...(patientData?.medicalReports || [])];
                                          updated[reportIndex] = { ...updated[reportIndex], facility: e.target.value };
                                          setPatientData(prev => ({ ...prev, medicalReports: updated }));
                                        }}
                                        placeholder="City Hospital Radiology"
                                      />
                                    </div>
                                  </div>

                                  <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                      Findings
                                    </label>
                                    <textarea
                                      value={report.findings || ''}
                                      onChange={(e) => {
                                        const updated = [...(patientData?.medicalReports || [])];
                                        updated[reportIndex] = { ...updated[reportIndex], findings: e.target.value };
                                        setPatientData(prev => ({ ...prev, medicalReports: updated }));
                                      }}
                                      rows={3}
                                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all resize-none"
                                      style={{ color: '#000000', fontWeight: '800' }}
                                      placeholder="Summary of findings from the report..."
                                    />
                                  </div>

                                  <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                      Recommendations
                                    </label>
                                    <textarea
                                      value={report.recommendations || ''}
                                      onChange={(e) => {
                                        const updated = [...(patientData?.medicalReports || [])];
                                        updated[reportIndex] = { ...updated[reportIndex], recommendations: e.target.value };
                                        setPatientData(prev => ({ ...prev, medicalReports: updated }));
                                      }}
                                      rows={2}
                                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all resize-none"
                                      style={{ color: '#000000', fontWeight: '800' }}
                                      placeholder="Follow-up recommendations..."
                                    />
                                  </div>

                                  <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                                      Notes
                                    </label>
                                    <textarea
                                      value={report.notes || ''}
                                      onChange={(e) => {
                                        const updated = [...(patientData?.medicalReports || [])];
                                        updated[reportIndex] = { ...updated[reportIndex], notes: e.target.value };
                                        setPatientData(prev => ({ ...prev, medicalReports: updated }));
                                      }}
                                      rows={2}
                                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all resize-none"
                                      style={{ color: '#000000', fontWeight: '800' }}
                                      placeholder="Additional notes..."
                                    />
                                  </div>

                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => {
                                        const updated = patientData?.medicalReports?.filter((_, i) => i !== reportIndex);
                                        setPatientData(prev => ({ ...prev, medicalReports: updated }));
                                      }}
                                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete Report
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-500">
                              <p className="text-lg mb-2">No medical reports added yet</p>
                              <p className="text-sm">Click "Add Report" to track your medical reports and imaging studies</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {section.id === 'surgical' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Hospital Name
                          </label>
                          <Input
                            value={patientData?.hospitalName || ''}
                            onChange={(e) => handleChange('hospitalName', e.target.value)}
                            icon={<Hospital className="h-5 w-5" />}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Surgeon Name
                          </label>
                          <Input
                            value={patientData?.surgeonName || ''}
                            onChange={(e) => handleChange('surgeonName', e.target.value)}
                            icon={<Stethoscope className="h-5 w-5" />}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Surgery Date
                          </label>
                          <Input
                            type="date"
                            value={patientData?.surgeryDate || ''}
                            onChange={(e) => handleChange('surgeryDate', e.target.value)}
                            icon={<Calendar className="h-5 w-5" />}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Discharge Date
                          </label>
                          <Input
                            type="date"
                            value={patientData?.dischargeDate || ''}
                            onChange={(e) => handleChange('dischargeDate', e.target.value)}
                            icon={<Calendar className="h-5 w-5" />}
                          />
                        </div>
                      </div>
                      {/* Prior Surgical Procedures */}
                      <div className="mt-6">
                        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>
                          Prior Surgical Procedures Performed
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            'CABG (Bypass)',
                            'Valve Replacement',
                            'Valve Repair',
                            'Aortic Surgery',
                            'Atrial Septal Defect Repair',
                            'Maze Procedure for AFib',
                            'Pacemaker Implantation',
                            'ICD Implantation',
                            'CRT Device',
                            'Other'
                          ].map((procedure) => (
                            <label
                              key={procedure}
                              className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300"
                              style={{
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))',
                                border: '2px solid rgba(245, 158, 11, 0.3)',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.6)';
                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15), 0 12px 24px rgba(245, 158, 11, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={patientData?.priorSurgicalProcedures?.includes(procedure) || false}
                                onChange={(e) => handleCheckboxArrayChange('priorSurgicalProcedures', procedure, e.target.checked)}
                                className="w-5 h-5 rounded border-2 border-orange-400 bg-white/10 checked:bg-orange-500 checked:border-orange-500 focus:ring-2 focus:ring-orange-500/50 transition-all cursor-pointer"
                              />
                              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                                {procedure}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Devices Implanted */}
                      <div className="mt-6">
                        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--ink)' }}>
                          Devices in body that may affect imaging
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            'Pacemaker',
                            'ICD',
                            'CRT',
                            'Mechanical Valve',
                            'Bioprosthetic Valve / TAVR',
                            'Coronary Stents',
                            'WATCHMAN / LAA occluder',
                            'Cochlear Implant',
                            'Insulin / Medication Pump',
                            'Orthopedic Hardware'
                          ].map((device) => (
                            <label
                              key={device}
                              className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300"
                              style={{
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))',
                                border: '2px solid rgba(245, 158, 11, 0.3)',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.6)';
                                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15), 0 12px 24px rgba(245, 158, 11, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={patientData?.devicesImplanted?.includes(device) || false}
                                onChange={(e) => handleCheckboxArrayChange('devicesImplanted', device, e.target.checked)}
                                className="w-5 h-5 rounded border-2 border-orange-400 bg-white/10 checked:bg-orange-500 checked:border-orange-500 focus:ring-2 focus:ring-orange-500/50 transition-all cursor-pointer"
                              />
                              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                                {device}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Surgery Notes
                        </label>
                        <textarea
                          value={patientData?.priorSurgeryNotes || ''}
                          onChange={(e) => handleChange('priorSurgeryNotes', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 outline-none transition-all resize-none"
                          style={{ color: '#000000', fontWeight: '800' }}
                          placeholder="Additional surgical notes..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Discharge Instructions
                        </label>
                        <textarea
                          value={patientData?.dischargeInstructions || ''}
                          onChange={(e) => handleChange('dischargeInstructions', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 outline-none transition-all resize-none"
                          style={{ color: '#000000', fontWeight: '800' }}
                          placeholder="Post-discharge instructions..."
                        />
                      </div>
                    </>
                  )}

                  {section.id === 'wallet' && (
                    <div className="space-y-6">
                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px dashed rgba(168, 85, 247, 0.3)' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <FileText className="h-5 w-5 text-purple-400" />
                          <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>Passport</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Front Side */}
                          <div>
                            <input
                              ref={passportFrontInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload('passport', 'front', file);
                              }}
                              className="hidden"
                            />
                            {uploadedDocuments.passportFront ? (
                              <div className="space-y-2">
                                {/* Preview Thumbnail */}
                                <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                                  <img
                                    src={uploadedDocuments.passportFront}
                                    alt="Passport Front"
                                    className="w-full h-32 object-cover"
                                  />
                                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleDocumentView(uploadedDocuments.passportFront!)}
                                    variant="secondary"
                                    className="flex-1"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                  <Button
                                    onClick={() => handleDocumentDelete('passport', 'front')}
                                    variant="danger"
                                    className="flex-1"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                onClick={() => passportFrontInputRef.current?.click()}
                                variant="secondary"
                                className="w-full"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Front Side
                              </Button>
                            )}
                          </div>
                          {/* Back Side */}
                          <div>
                            <input
                              ref={passportBackInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload('passport', 'back', file);
                              }}
                              className="hidden"
                            />
                            {uploadedDocuments.passportBack ? (
                              <div className="space-y-2">
                                {/* Preview Thumbnail */}
                                <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                                  <img
                                    src={uploadedDocuments.passportBack}
                                    alt="Passport Back"
                                    className="w-full h-32 object-cover"
                                  />
                                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleDocumentView(uploadedDocuments.passportBack!)}
                                    variant="secondary"
                                    className="flex-1"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                  <Button
                                    onClick={() => handleDocumentDelete('passport', 'back')}
                                    variant="danger"
                                    className="flex-1"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                onClick={() => passportBackInputRef.current?.click()}
                                variant="secondary"
                                className="w-full"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Back Side
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px dashed rgba(34, 197, 94, 0.3)' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <CreditCard className="h-5 w-5 text-green-400" />
                          <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>Insurance Card</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Front Side */}
                          <div>
                            <input
                              ref={insuranceFrontInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload('insurance', 'front', file);
                              }}
                              className="hidden"
                            />
                            {uploadedDocuments.insuranceFront ? (
                              <div className="space-y-2">
                                <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                                  <img src={uploadedDocuments.insuranceFront} alt="Insurance Front" className="w-full h-32 object-cover" />
                                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleDocumentView(uploadedDocuments.insuranceFront!)} variant="secondary" className="flex-1">
                                    <Eye className="h-4 w-4 mr-2" />View
                                  </Button>
                                  <Button onClick={() => handleDocumentDelete('insurance', 'front')} variant="danger" className="flex-1">
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button onClick={() => insuranceFrontInputRef.current?.click()} variant="secondary" className="w-full">
                                <Upload className="h-4 w-4 mr-2" />Front Side
                              </Button>
                            )}
                          </div>
                          {/* Back Side */}
                          <div>
                            <input
                              ref={insuranceBackInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload('insurance', 'back', file);
                              }}
                              className="hidden"
                            />
                            {uploadedDocuments.insuranceBack ? (
                              <div className="space-y-2">
                                <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                                  <img src={uploadedDocuments.insuranceBack} alt="Insurance Back" className="w-full h-32 object-cover" />
                                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleDocumentView(uploadedDocuments.insuranceBack!)} variant="secondary" className="flex-1">
                                    <Eye className="h-4 w-4 mr-2" />View
                                  </Button>
                                  <Button onClick={() => handleDocumentDelete('insurance', 'back')} variant="danger" className="flex-1">
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button onClick={() => insuranceBackInputRef.current?.click()} variant="secondary" className="w-full">
                                <Upload className="h-4 w-4 mr-2" />Back Side
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <AlertCircle className="h-5 w-5 text-red-400" />
                          <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>Allergy Information</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Front Side */}
                          <div>
                            <input
                              ref={allergyCardFrontInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload('allergyCard', 'front', file);
                              }}
                              className="hidden"
                            />
                            {uploadedDocuments.allergyCardFront ? (
                              <div className="space-y-2">
                                <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                                  <img src={uploadedDocuments.allergyCardFront} alt="Allergy Card Front" className="w-full h-32 object-cover" />
                                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleDocumentView(uploadedDocuments.allergyCardFront!)} variant="secondary" className="flex-1">
                                    <Eye className="h-4 w-4 mr-2" />View
                                  </Button>
                                  <Button onClick={() => handleDocumentDelete('allergyCard', 'front')} variant="danger" className="flex-1">
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button onClick={() => allergyCardFrontInputRef.current?.click()} variant="secondary" className="w-full">
                                <Upload className="h-4 w-4 mr-2" />Front Side
                              </Button>
                            )}
                          </div>
                          {/* Back Side */}
                          <div>
                            <input
                              ref={allergyCardBackInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload('allergyCard', 'back', file);
                              }}
                              className="hidden"
                            />
                            {uploadedDocuments.allergyCardBack ? (
                              <div className="space-y-2">
                                <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                                  <img src={uploadedDocuments.allergyCardBack} alt="Allergy Card Back" className="w-full h-32 object-cover" />
                                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleDocumentView(uploadedDocuments.allergyCardBack!)} variant="secondary" className="flex-1">
                                    <Eye className="h-4 w-4 mr-2" />View
                                  </Button>
                                  <Button onClick={() => handleDocumentDelete('allergyCard', 'back')} variant="danger" className="flex-1">
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button onClick={() => allergyCardBackInputRef.current?.click()} variant="secondary" className="w-full">
                                <Upload className="h-4 w-4 mr-2" />Back Side
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px dashed rgba(59, 130, 246, 0.3)' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <CreditCard className="h-5 w-5 text-blue-400" />
                          <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>Driver's License</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Front Side */}
                          <div>
                            <input
                              ref={driverLicenseFrontInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload('driverLicense', 'front', file);
                              }}
                              className="hidden"
                            />
                            {uploadedDocuments.driverLicenseFront ? (
                              <div className="space-y-2">
                                <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                                  <img src={uploadedDocuments.driverLicenseFront} alt="Driver's License Front" className="w-full h-32 object-cover" />
                                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleDocumentView(uploadedDocuments.driverLicenseFront!)} variant="secondary" className="flex-1">
                                    <Eye className="h-4 w-4 mr-2" />View
                                  </Button>
                                  <Button onClick={() => handleDocumentDelete('driverLicense', 'front')} variant="danger" className="flex-1">
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button onClick={() => driverLicenseFrontInputRef.current?.click()} variant="secondary" className="w-full">
                                <Upload className="h-4 w-4 mr-2" />Front Side
                              </Button>
                            )}
                          </div>
                          {/* Back Side */}
                          <div>
                            <input
                              ref={driverLicenseBackInputRef}
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload('driverLicense', 'back', file);
                              }}
                              className="hidden"
                            />
                            {uploadedDocuments.driverLicenseBack ? (
                              <div className="space-y-2">
                                <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                                  <img src={uploadedDocuments.driverLicenseBack} alt="Driver's License Back" className="w-full h-32 object-cover" />
                                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleDocumentView(uploadedDocuments.driverLicenseBack!)} variant="secondary" className="flex-1">
                                    <Eye className="h-4 w-4 mr-2" />View
                                  </Button>
                                  <Button onClick={() => handleDocumentDelete('driverLicense', 'back')} variant="danger" className="flex-1">
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button onClick={() => driverLicenseBackInputRef.current?.click()} variant="secondary" className="w-full">
                                <Upload className="h-4 w-4 mr-2" />Back Side
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.id === 'implantedDevices' && (
                    <div className="space-y-6">
                      {/* Implanted Devices List */}
                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '2px solid rgba(220, 38, 38, 0.3)' }}>
                        <div className="flex items-center gap-3 mb-4">
                          <Heart className="h-6 w-6 text-red-500" />
                          <h4 className="font-bold text-lg" style={{ color: 'var(--ink-bright)' }}>Implanted Medical Devices</h4>
                        </div>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                          Record all implanted medical devices (pacemakers, heart valves, stents, loop recorders, ICDs, etc.)
                        </p>

                        {/* List of Devices */}
                        {patientData?.implantedDevices && patientData.implantedDevices.length > 0 ? (
                          <div className="space-y-3 mb-4">
                            {patientData.implantedDevices.map((device, index) => (
                              <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-semibold text-red-400">{device.deviceType}</span>
                                  <button
                                    onClick={() => {
                                      const updated = patientData.implantedDevices?.filter((_, i) => i !== index);
                                      setPatientData({ ...patientData, implantedDevices: updated });
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div><span className="text-gray-400">Manufacturer:</span> {device.manufacturer}</div>
                                  <div><span className="text-gray-400">Model:</span> {device.model}</div>
                                  <div><span className="text-gray-400">Serial #:</span> {device.serialNumber}</div>
                                  {device.size && <div><span className="text-gray-400">Size:</span> {device.size}</div>}
                                  {device.implantDate && <div><span className="text-gray-400">Implant Date:</span> {device.implantDate}</div>}
                                  {device.notes && <div className="col-span-2"><span className="text-gray-400">Notes:</span> {device.notes}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic mb-4">No implanted devices recorded yet.</p>
                        )}

                        {/* Add New Device Button */}
                        <Button
                          onClick={() => {
                            const newDevice = {
                              deviceType: '',
                              manufacturer: '',
                              model: '',
                              serialNumber: '',
                              size: '',
                              implantDate: '',
                              notes: ''
                            };
                            const updated = [...(patientData?.implantedDevices || []), newDevice];
                            setPatientData({ ...patientData, implantedDevices: updated });
                          }}
                          variant="secondary"
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Implanted Device
                        </Button>
                      </div>

                      {/* Medical Alert Bracelet */}
                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)', border: '1px dashed rgba(251, 146, 60, 0.3)' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <AlertCircle className="h-5 w-5 text-orange-400" />
                          <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>Medical Alert Bracelet</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="hasMedicalAlert"
                              checked={patientData?.medicalAlertBracelet?.hasDevice || false}
                              onChange={(e) => handleChange('medicalAlertBracelet', {
                                ...patientData?.medicalAlertBracelet,
                                hasDevice: e.target.checked
                              })}
                              className="w-4 h-4"
                            />
                            <label htmlFor="hasMedicalAlert" className="font-semibold" style={{ color: 'var(--ink)' }}>
                              I have a medical alert bracelet/device
                            </label>
                          </div>
                          {patientData?.medicalAlertBracelet?.hasDevice && (
                            <>
                              <Input
                                label="Manufacturer"
                                value={patientData?.medicalAlertBracelet?.manufacturer || ''}
                                onChange={(e) => handleChange('medicalAlertBracelet', {
                                  ...patientData?.medicalAlertBracelet,
                                  manufacturer: e.target.value
                                })}
                                placeholder="e.g., MedicAlert, Road ID"
                              />
                              <Input
                                label="Serial Number"
                                value={patientData?.medicalAlertBracelet?.serialNumber || ''}
                                onChange={(e) => handleChange('medicalAlertBracelet', {
                                  ...patientData?.medicalAlertBracelet,
                                  serialNumber: e.target.value
                                })}
                                placeholder="Device serial number"
                              />
                              <Input
                                label="QR Code / Tag Info"
                                value={patientData?.medicalAlertBracelet?.qrCode || ''}
                                onChange={(e) => handleChange('medicalAlertBracelet', {
                                  ...patientData?.medicalAlertBracelet,
                                  qrCode: e.target.value
                                })}
                                placeholder="QR code ID or tag number"
                              />
                              <Input
                                label="Emergency Access URL"
                                value={patientData?.medicalAlertBracelet?.emergencyAccessURL || ''}
                                onChange={(e) => handleChange('medicalAlertBracelet', {
                                  ...patientData?.medicalAlertBracelet,
                                  emergencyAccessURL: e.target.value
                                })}
                                placeholder="https://..."
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Critical Access Information */}
                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px dashed rgba(99, 102, 241, 0.3)' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <Shield className="h-5 w-5 text-indigo-400" />
                          <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>Critical Access Information</h4>
                        </div>
                        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                          Store medical record numbers, health system portals, and emergency access credentials
                        </p>
                        <div className="space-y-3">
                          <Input
                            label="Medical Record Number (MRN)"
                            value={patientData?.criticalAccessInfo?.medicalRecordNumber || ''}
                            onChange={(e) => handleChange('criticalAccessInfo', {
                              ...patientData?.criticalAccessInfo,
                              medicalRecordNumber: e.target.value
                            })}
                            placeholder="Your MRN"
                          />
                          <Input
                            label="Health System Portal URL"
                            value={patientData?.criticalAccessInfo?.healthSystemPortalURL || ''}
                            onChange={(e) => handleChange('criticalAccessInfo', {
                              ...patientData?.criticalAccessInfo,
                              healthSystemPortalURL: e.target.value
                            })}
                            placeholder="https://myhealth.example.com"
                          />
                          <Input
                            label="Portal Username"
                            value={patientData?.criticalAccessInfo?.healthSystemUsername || ''}
                            onChange={(e) => handleChange('criticalAccessInfo', {
                              ...patientData?.criticalAccessInfo,
                              healthSystemUsername: e.target.value
                            })}
                            placeholder="Username"
                          />
                          <Input
                            label="Portal Password"
                            type="password"
                            value={patientData?.criticalAccessInfo?.healthSystemPassword || ''}
                            onChange={(e) => handleChange('criticalAccessInfo', {
                              ...patientData?.criticalAccessInfo,
                              healthSystemPassword: e.target.value
                            })}
                            placeholder="Password (encrypted)"
                          />
                          <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                              Additional Notes
                            </label>
                            <textarea
                              value={patientData?.criticalAccessInfo?.additionalNotes || ''}
                              onChange={(e) => handleChange('criticalAccessInfo', {
                                ...patientData?.criticalAccessInfo,
                                additionalNotes: e.target.value
                              })}
                              rows={3}
                              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all resize-none"
                              style={{ color: '#000000', fontWeight: '800' }}
                              placeholder="Other important access information or device IDs..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          ))}

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              loading={isSaving}
              variant="success"
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button
              onClick={handleCancel}
              variant="secondary"
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Export Formats Modal */}
      {showExportFormatsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowExportFormatsModal(false)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-white/10" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink-bright)' }}>Manage Export Formats</h3>
            <div className="space-y-2 mb-4">
              {availableExportFormats.map((format) => (
                <div key={format} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="font-semibold uppercase" style={{ color: 'var(--ink)' }}>{format}</span>
                  <button
                    onClick={() => handleRemoveExportFormat(format)}
                    className="p-1 rounded hover:bg-red-500/20 transition-colors"
                  >
                    <X className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <Input
                value={newFormatName}
                onChange={(e) => setNewFormatName(e.target.value)}
                placeholder="Enter new format (e.g., xlsx)"
                onKeyPress={(e) => e.key === 'Enter' && handleAddExportFormat()}
              />
              <Button onClick={handleAddExportFormat}>Add</Button>
            </div>
            <Button onClick={() => setShowExportFormatsModal(false)} variant="secondary" className="w-full">Close</Button>
          </div>
        </div>
      )}

      {/* Add New Setting Modal - Import Formats */}
      {showAddSettingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddSettingModal(false)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-white/10" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink-bright)' }}>Import Formats</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Manage file formats that can be imported into the application</p>
            <div className="space-y-2 mb-4">
              {availableImportFormats.map((format) => (
                <div key={format} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="font-semibold uppercase" style={{ color: 'var(--ink)' }}>{format}</span>
                  <button
                    onClick={() => handleRemoveImportFormat(format)}
                    className="p-1 rounded hover:bg-red-500/20 transition-colors"
                  >
                    <X className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <Input
                value={newFormatName}
                onChange={(e) => setNewFormatName(e.target.value)}
                placeholder="Enter new format (e.g., xml)"
                onKeyPress={(e) => e.key === 'Enter' && handleAddImportFormat()}
              />
              <Button onClick={handleAddImportFormat}>Add</Button>
            </div>
            <Button onClick={() => setShowAddSettingModal(false)} variant="secondary" className="w-full">Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
