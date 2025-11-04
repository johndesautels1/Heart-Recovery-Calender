import React, { useState, useRef, useEffect } from 'react';
import { GlassCard, Button, Input } from '../components/ui';
import {
  User, Mail, Phone, Heart, Stethoscope, Save, Camera,
  ChevronDown, ChevronUp, Calendar, MapPin, Users,
  Activity, Pill, Hospital, Shield, Smartphone, Wallet,
  Upload, FileText, CreditCard, AlertCircle, Clock, Settings,
  Download, X, Edit2, Trash2, Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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

  // Device Integration
  polarDeviceId?: string;
  samsungHealthAccount?: string;
  preferredDataSource?: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
}

export function ProfilePage() {
  const { user, updateUser } = useAuth();
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const medAutocompleteRef = useRef<HTMLDivElement>(null);

  // Document upload refs
  const passportInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);
  const allergyCardInputRef = useRef<HTMLInputElement>(null);

  const sections: Section[] = [
    { id: 'settings', title: 'App Settings', icon: <Settings className="h-5 w-5" />, color: '#6366f1' },
    { id: 'personal', title: 'Personal Information', icon: <User className="h-5 w-5" />, color: '#3b82f6' },
    { id: 'contact', title: 'Contact & Address', icon: <MapPin className="h-5 w-5" />, color: '#10b981' },
    { id: 'emergency', title: 'Emergency Contacts', icon: <Users className="h-5 w-5" />, color: '#ef4444' },
    { id: 'cardiac', title: 'Cardiac Profile', icon: <Heart className="h-5 w-5" />, color: '#ec4899' },
    { id: 'medical', title: 'Medical History', icon: <Stethoscope className="h-5 w-5" />, color: '#8b5cf6' },
    { id: 'surgical', title: 'Surgical History', icon: <Hospital className="h-5 w-5" />, color: '#f59e0b' },
    { id: 'devices', title: 'Device Integration', icon: <Smartphone className="h-5 w-5" />, color: '#06b6d4' },
    { id: 'wallet', title: 'My Wallet', icon: <Wallet className="h-5 w-5" />, color: '#a855f7' },
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

      // Get the patient record
      const patientData = patientsResponse.data[0];
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
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
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

  const handleSave = async () => {
    try {
      if (!patientData) {
        toast.error('No patient data to save');
        return;
      }

      setIsSaving(true);

      // Get patient ID from the data
      const patientId = (patientData as any).id;

      if (!patientId) {
        // No patient record exists yet - need to create one
        toast.error('Please contact your therapist to set up your patient profile');
        return;
      }

      // Update patient profile using fetch
      const response = await fetch(`http://localhost:4000/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(patientData)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updated = await response.json();
      setPatientData(updated as any);

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
      const updatedUser = await api.updateProfile({ profilePhoto: null });
      updateUser(updatedUser);
      toast.success('Profile photo removed successfully!');
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error(error.response?.data?.error || 'Failed to remove photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (type: 'passport' | 'insurance' | 'allergyCard', file: File) => {
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
        // TODO: Implement document storage API
        toast.success(`${type} uploaded successfully!`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Diagnosis Date
                          </label>
                          <Input
                            type="date"
                            value={patientData?.diagnosisDate || ''}
                            onChange={(e) => handleChange('diagnosisDate', e.target.value)}
                            icon={<Calendar className="h-5 w-5" />}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Ejection Fraction (%)
                          </label>
                          <Input
                            type="number"
                            value={patientData?.ejectionFraction !== undefined && patientData?.ejectionFraction !== null ? patientData.ejectionFraction : ''}
                            onChange={(e) => handleChange('ejectionFraction', parseFloat(e.target.value))}
                            icon={<Activity className="h-5 w-5" />}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Resting HR (bpm)
                          </label>
                          <Input
                            type="number"
                            value={patientData?.restingHeartRate !== undefined && patientData?.restingHeartRate !== null ? patientData.restingHeartRate : ''}
                            onChange={(e) => handleChange('restingHeartRate', parseInt(e.target.value))}
                            icon={<Heart className="h-5 w-5" />}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Max HR (bpm)
                          </label>
                          <Input
                            type="number"
                            value={patientData?.maxHeartRate !== undefined && patientData?.maxHeartRate !== null ? patientData.maxHeartRate : ''}
                            onChange={(e) => handleChange('maxHeartRate', parseInt(e.target.value))}
                            icon={<Heart className="h-5 w-5" />}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Target HR Min
                          </label>
                          <Input
                            type="number"
                            value={patientData?.targetHeartRateMin !== undefined && patientData?.targetHeartRateMin !== null ? patientData.targetHeartRateMin : ''}
                            onChange={(e) => handleChange('targetHeartRateMin', parseInt(e.target.value))}
                            icon={<Heart className="h-5 w-5" />}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Target HR Max
                          </label>
                          <Input
                            type="number"
                            value={patientData?.targetHeartRateMax !== undefined && patientData?.targetHeartRateMax !== null ? patientData.targetHeartRateMax : ''}
                            onChange={(e) => handleChange('targetHeartRateMax', parseInt(e.target.value))}
                            icon={<Heart className="h-5 w-5" />}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Baseline BP (Systolic/Diastolic)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              value={patientData?.baselineBpSystolic !== undefined && patientData?.baselineBpSystolic !== null ? patientData.baselineBpSystolic : ''}
                              onChange={(e) => handleChange('baselineBpSystolic', parseInt(e.target.value))}
                                placeholder="120"
                            />
                            <Input
                              type="number"
                              value={patientData?.baselineBpDiastolic !== undefined && patientData?.baselineBpDiastolic !== null ? patientData.baselineBpDiastolic : ''}
                              onChange={(e) => handleChange('baselineBpDiastolic', parseInt(e.target.value))}
                                placeholder="80"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Heart Conditions (comma-separated)
                        </label>
                        <Input
                          value={patientData?.heartConditions?.join(', ') || ''}
                          onChange={(e) => handleArrayChange('heartConditions', e.target.value)}
                          placeholder="CAD, CHF, AFib"
                        />
                      </div>
                      <div ref={medAutocompleteRef}>
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

                  {section.id === 'devices' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Polar Device ID
                          </label>
                          <Input
                            value={patientData?.polarDeviceId || ''}
                            onChange={(e) => handleChange('polarDeviceId', e.target.value)}
                            icon={<Smartphone className="h-5 w-5" />}
                            placeholder="Enter Polar heart monitor ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Samsung Health Account
                          </label>
                          <Input
                            value={patientData?.samsungHealthAccount || ''}
                            onChange={(e) => handleChange('samsungHealthAccount', e.target.value)}
                            icon={<Smartphone className="h-5 w-5" />}
                            placeholder="Samsung account email"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Preferred Data Source
                        </label>
                        <select
                          value={patientData?.preferredDataSource || ''}
                          onChange={(e) => handleChange('preferredDataSource', e.target.value)}
                          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all"
                          style={{ color: '#000000', fontWeight: '800' }}
                        >
                          <option value="">Select...</option>
                          <option value="polar">Polar Heart Monitor</option>
                          <option value="samsung">Samsung Galaxy Watch</option>
                          <option value="manual">Manual Entry</option>
                        </select>
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
                        <input
                          ref={passportInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocumentUpload('passport', file);
                          }}
                          className="hidden"
                        />
                        <Button
                          onClick={() => passportInputRef.current?.click()}
                          variant="secondary"
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Passport Scan
                        </Button>
                      </div>

                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px dashed rgba(34, 197, 94, 0.3)' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <CreditCard className="h-5 w-5 text-green-400" />
                          <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>Insurance Card</h4>
                        </div>
                        <input
                          ref={insuranceInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocumentUpload('insurance', file);
                          }}
                          className="hidden"
                        />
                        <Button
                          onClick={() => insuranceInputRef.current?.click()}
                          variant="secondary"
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Insurance Card
                        </Button>
                      </div>

                      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <AlertCircle className="h-5 w-5 text-red-400" />
                          <h4 className="font-semibold" style={{ color: 'var(--ink-bright)' }}>Allergy Information</h4>
                        </div>
                        <input
                          ref={allergyCardInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocumentUpload('allergyCard', file);
                          }}
                          className="hidden"
                        />
                        <Button
                          onClick={() => allergyCardInputRef.current?.click()}
                          variant="secondary"
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Allergy Card
                        </Button>
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
