import React, { useState, useRef, useEffect } from 'react';
import { GlassCard, Button, Input } from '../components/ui';
import {
  User, Mail, Phone, Heart, Stethoscope, Save, Camera,
  ChevronDown, ChevronUp, Calendar, MapPin, Users,
  Activity, Pill, Hospital, Shield, Smartphone, Wallet,
  Upload, FileText, CreditCard, AlertCircle, Clock, Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setPatientData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleArrayChange = (field: string, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    setPatientData(prev => prev ? { ...prev, [field]: items } : null);
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
      toast.success('Profile updated successfully!');
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
                <button
                  onClick={handlePhotoClick}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center transition-colors"
                  style={{ boxShadow: '0 2px 8px rgba(236, 72, 153, 0.4)' }}
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
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
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
                        <div className="flex items-center justify-between">
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
                        </div>
                        <div className="mt-3 p-3 rounded bg-white/5 text-sm" style={{ color: 'var(--muted)' }}>
                          <strong>Preview:</strong> {timeFormat === '12h' ? '2:30 PM' : '14:30'}
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
                            style={{ color: '#1e293b', fontWeight: '800' }}
                          >
                            <option value="">Select...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Age
                          </label>
                          <Input
                            type="number"
                            value={patientData?.age || ''}
                            disabled
                            icon={<Calendar className="h-5 w-5" />}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Race
                          </label>
                          <Input
                            value={patientData?.race || ''}
                            onChange={(e) => handleChange('race', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                            Nationality
                          </label>
                          <Input
                            value={patientData?.nationality || ''}
                            onChange={(e) => handleChange('nationality', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {section.id === 'contact' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            style={{ color: '#1e293b', fontWeight: '800' }}
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
                            style={{ color: '#1e293b', fontWeight: '800' }}
                          >
                            <option value="">Select...</option>
                            <option value="phone">Phone</option>
                            <option value="email">Email</option>
                            <option value="text">Text</option>
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
                            style={{ color: '#1e293b', fontWeight: '800' }}
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
                            value={patientData?.ejectionFraction || ''}
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
                            value={patientData?.restingHeartRate || ''}
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
                            value={patientData?.maxHeartRate || ''}
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
                            value={patientData?.targetHeartRateMin || ''}
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
                            value={patientData?.targetHeartRateMax || ''}
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
                              value={patientData?.baselineBpSystolic || ''}
                              onChange={(e) => handleChange('baselineBpSystolic', parseInt(e.target.value))}
                                placeholder="120"
                            />
                            <Input
                              type="number"
                              value={patientData?.baselineBpDiastolic || ''}
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
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Medications Affecting HR (comma-separated)
                        </label>
                        <Input
                          value={patientData?.medicationsAffectingHR?.join(', ') || ''}
                          onChange={(e) => handleArrayChange('medicationsAffectingHR', e.target.value)}
                          placeholder="Beta-blockers, etc."
                          icon={<Pill className="h-5 w-5" />}
                        />
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
                          style={{ color: '#1e293b', fontWeight: '800' }}
                          placeholder="Weight limits, movements to avoid, etc."
                        />
                      </div>
                    </>
                  )}

                  {section.id === 'medical' && (
                    <>
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
                          Non-Cardiac Medications
                        </label>
                        <textarea
                          value={patientData?.nonCardiacMedications || ''}
                          onChange={(e) => handleChange('nonCardiacMedications', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all resize-none"
                          style={{ color: '#1e293b', fontWeight: '800' }}
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
                          style={{ color: '#1e293b', fontWeight: '800' }}
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
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Prior Surgical Procedures (comma-separated)
                        </label>
                        <Input
                          value={patientData?.priorSurgicalProcedures?.join(', ') || ''}
                          onChange={(e) => handleArrayChange('priorSurgicalProcedures', e.target.value)}
                          placeholder="CABG, Valve Replacement, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          Devices Implanted (comma-separated)
                        </label>
                        <Input
                          value={patientData?.devicesImplanted?.join(', ') || ''}
                          onChange={(e) => handleArrayChange('devicesImplanted', e.target.value)}
                          placeholder="Pacemaker, ICD, Stents, etc."
                        />
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
                          style={{ color: '#1e293b', fontWeight: '800' }}
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
                          style={{ color: '#1e293b', fontWeight: '800' }}
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
                          style={{ color: '#1e293b', fontWeight: '800' }}
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
    </div>
  );
}
