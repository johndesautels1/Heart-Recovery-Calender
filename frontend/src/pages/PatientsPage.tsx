import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  UserCircle2,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Dumbbell,
  FileText,
  Plus,
  Eye,
  Clock,
  Activity,
  UserPlus,
  Users,
  Download,
  Save,
  Edit
} from 'lucide-react';
import { Patient, PostOpWeekResponse } from '../types';
import { Button } from '../components/ui/Button';
import { format, parseISO, subDays } from 'date-fns';
import { usePatientSelection } from '../contexts/PatientSelectionContext';

type ComplianceStatus = 'excellent' | 'warning' | 'poor' | 'unknown';
type TabType = 'patients' | 'exercises' | 'templates';
type PatientSubTab = 'add-new' | 'select-existing' | 'import' | 'add-calendar';

interface PatientWithCompliance extends Patient {
  complianceStatus: ComplianceStatus;
  nextAppointment?: string;
  recentEvents: number;
  completionRate: number;
}

export function PatientsPage() {
  const [patients, setPatients] = useState<PatientWithCompliance[]>([]);
  const [postOpData, setPostOpData] = useState<Record<number, PostOpWeekResponse>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('patients');
  const [patientSubTab, setPatientSubTab] = useState<PatientSubTab>('select-existing');
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    surgeryDate: '',
    height: '',
    heightUnit: 'in' as 'in' | 'cm',
    notes: '',
    startingWeight: '',
    currentWeight: '',
    targetWeight: '',
    weightUnit: 'lbs' as 'kg' | 'lbs',
    createUserAccount: false,
    password: ''
  });
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editPatientForm, setEditPatientForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    surgeryDate: '',
    height: '',
    heightUnit: 'in' as 'in' | 'cm',
    notes: '',
    startingWeight: '',
    currentWeight: '',
    targetWeight: '',
    weightUnit: 'lbs' as 'kg' | 'lbs',
    createUserAccount: false,
    password: ''
  });
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarPatient, setCalendarPatient] = useState<Patient | null>(null);
  const [calendarFormData, setCalendarFormData] = useState({ name: '', type: 'general', color: '#607d8b' });
  const navigate = useNavigate();
  const { selectedPatient, setSelectedPatient } = usePatientSelection();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load patients');

      const data = await response.json();

      // Enhance patients with real compliance data from backend
      const enhancedPatients: PatientWithCompliance[] = await Promise.all(
        (data.data || []).map(async (patient: Patient) => {
          try {
            // Fetch real metrics from backend API
            const metricsResponse = await fetch(`/api/patients/${patient.id}/metrics`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (!metricsResponse.ok) {
              throw new Error('Failed to fetch patient metrics');
            }

            const metrics = await metricsResponse.json();

            return {
              ...patient,
              complianceStatus: metrics.complianceStatus || 'unknown',
              completionRate: metrics.completionRate || 0,
              recentEvents: metrics.recentEvents || 0,
              nextAppointment: patient.surgeryDate ? format(new Date(), 'yyyy-MM-dd') : undefined,
            };
          } catch (error) {
            console.error(`Error fetching metrics for patient ${patient.id}:`, error);
            // Fallback to unknown status if API call fails
            return {
              ...patient,
              complianceStatus: 'unknown' as ComplianceStatus,
              completionRate: 0,
              recentEvents: 0,
              nextAppointment: patient.surgeryDate ? format(new Date(), 'yyyy-MM-dd') : undefined,
            };
          }
        })
      );

      setPatients(enhancedPatients);

      // Load post-op week data
      for (const patient of enhancedPatients) {
        if (patient.surgeryDate) {
          loadPostOpWeek(patient.id);
        }
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const loadPostOpWeek = async (patientId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/patients/${patientId}/post-op-week`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      setPostOpData(prev => ({ ...prev, [patientId]: data }));
    } catch (error) {
      console.error(`Error loading post-op week for patient ${patientId}:`, error);
    }
  };

  const getComplianceColor = (status: ComplianceStatus) => {
    switch (status) {
      case 'excellent':
        return {
          bg: 'rgba(16, 185, 129, 0.1)',
          border: '#10b981',
          text: '#10b981',
          icon: CheckCircle2,
          label: 'Excellent Compliance'
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          border: '#f59e0b',
          text: '#f59e0b',
          icon: AlertTriangle,
          label: 'Needs Attention'
        };
      case 'poor':
        return {
          bg: 'rgba(239, 68, 68, 0.1)',
          border: '#ef4444',
          text: '#ef4444',
          icon: XCircle,
          label: 'Poor Compliance'
        };
      default:
        return {
          bg: 'rgba(107, 114, 128, 0.1)',
          border: '#6b7280',
          text: '#6b7280',
          icon: Activity,
          label: 'No Data'
        };
    }
  };

  const viewPatientCalendar = (patientId: number) => {
    navigate(`/patients/${patientId}/calendar`);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    toast.success(`Now viewing data for ${patient.name}`);
  };

  const handleImportData = async () => {
    try {
      toast.success('Import from cardiac-recovery-pro coming soon!');
      // TODO: Implement import from cardiac-recovery-pro
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data');
    }
  };

  const handleNewPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPatientForm),
      });

      if (!response.ok) throw new Error('Failed to create patient');

      toast.success('Patient added successfully!');
      setNewPatientForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        surgeryDate: '',
        height: '',
        heightUnit: 'in',
        notes: '',
        startingWeight: '',
        currentWeight: '',
        targetWeight: '',
        weightUnit: 'lbs',
        createUserAccount: false,
        password: ''
      });
      loadPatients();
      setPatientSubTab('select-existing');
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error('Failed to create patient');
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setEditPatientForm({
      name: patient.name,
      email: patient.email || '',
      phone: patient.phone || '',
      address: patient.address || '',
      surgeryDate: patient.surgeryDate || '',
      height: patient.height?.toString() || '',
      heightUnit: patient.heightUnit || 'in',
      notes: patient.notes || '',
      startingWeight: patient.startingWeight?.toString() || '',
      currentWeight: patient.currentWeight?.toString() || '',
      targetWeight: patient.targetWeight?.toString() || '',
      weightUnit: patient.weightUnit || 'lbs',
      createUserAccount: false,
      password: ''
    });
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    try {
      const token = localStorage.getItem('token');

      // Prepare the update data
      const updateData = {
        ...editPatientForm
      };

      const response = await fetch(`/api/patients/${editingPatient.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update patient');
      }

      toast.success(editPatientForm.createUserAccount && !editingPatient.userId
        ? 'Patient updated and user account created!'
        : 'Patient updated successfully!');
      setEditingPatient(null);
      loadPatients();
    } catch (error: any) {
      console.error('Error updating patient:', error);
      toast.error(error.message || 'Failed to update patient');
    }
  };

  const handleCancelEdit = () => {
    setEditingPatient(null);
    setEditPatientForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      surgeryDate: '',
      height: '',
      heightUnit: 'in',
      notes: '',
      startingWeight: '',
      currentWeight: '',
      targetWeight: '',
      weightUnit: 'lbs',
      createUserAccount: false,
      password: ''
    });
  };

  const handleCreateCalendar = (patient: Patient) => {
    setCalendarPatient(patient);
    setCalendarFormData({ name: `${patient.name}'s Calendar`, type: 'general', color: '#607d8b' });
    setIsCalendarModalOpen(true);
  };

  const handleSubmitCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calendarPatient) {
      toast.error('Please select a patient');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      let patientUserId = calendarPatient.userId;

      // If patient doesn't have a user account, create one automatically
      if (!patientUserId) {
        toast('Creating user account for patient...', { icon: 'ℹ️' });

        // Generate a default password
        const defaultPassword = `${calendarPatient.name.replace(/\s+/g, '').toLowerCase()}123`;

        const updateResponse = await fetch(`/api/patients/${calendarPatient.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...calendarPatient,
            createUserAccount: true,
            password: defaultPassword
          }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || 'Failed to create user account for patient');
        }

        const updatedPatient = await updateResponse.json();
        patientUserId = updatedPatient.userId;

        // Refresh patients list
        await loadPatients();

        toast.success(`User account created with password: ${defaultPassword}`);
      }

      // Now create the calendar
      const response = await fetch('/api/calendars', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...calendarFormData,
          assignToUserId: patientUserId
        }),
      });

      if (!response.ok) throw new Error('Failed to create calendar');

      toast.success(`Calendar created successfully for ${calendarPatient.name}`);
      setIsCalendarModalOpen(false);
      setCalendarPatient(null);
      setCalendarFormData({ name: '', type: 'general', color: '#607d8b' });
    } catch (error: any) {
      console.error('Error creating calendar:', error);
      toast.error(error.message || 'Failed to create calendar');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Patients</h1>
          <p className="text-sm opacity-70 mt-1">Manage patient profiles and track their recovery progress</p>
        </div>
      </div>

      {/* Patient Sub-Tabs */}
      <div className="flex space-x-2 border-b border-white/10">
        <button
          onClick={() => setPatientSubTab('select-existing')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            patientSubTab === 'select-existing'
              ? 'text-white'
              : 'text-white/50 hover:text-white/75'
          }`}
        >
          <Users className="inline-block w-4 h-4 mr-2" />
          Select Existing
          {patientSubTab === 'select-existing' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>

        <button
          onClick={() => setPatientSubTab('add-new')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            patientSubTab === 'add-new'
              ? 'text-white'
              : 'text-white/50 hover:text-white/75'
          }`}
        >
          <UserPlus className="inline-block w-4 h-4 mr-2" />
          Add New Patient
          {patientSubTab === 'add-new' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>

        <button
          onClick={() => setPatientSubTab('add-calendar')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            patientSubTab === 'add-calendar'
              ? 'text-white'
              : 'text-white/50 hover:text-white/75'
          }`}
        >
          <CalendarIcon className="inline-block w-4 h-4 mr-2" />
          Add New Patient Calendar
          {patientSubTab === 'add-calendar' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>

        <button
          onClick={() => setPatientSubTab('import')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            patientSubTab === 'import'
              ? 'text-white'
              : 'text-white/50 hover:text-white/75'
          }`}
        >
          <Download className="inline-block w-4 h-4 mr-2" />
          Import Data
          {patientSubTab === 'import' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {patientSubTab === 'select-existing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="mt-4 text-sm opacity-70">Loading patients...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <UserCircle2 className="h-16 w-16 mx-auto opacity-30 mb-4" />
              <p className="text-lg font-medium">No patients found</p>
              <p className="text-sm opacity-70 mt-2">Add your first patient to get started</p>
              <Button
                onClick={() => setPatientSubTab('add-new')}
                variant="primary"
                size="sm"
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Patient
              </Button>
            </div>
          ) : (
            patients.map((patient) => {
              const compliance = getComplianceColor(patient.complianceStatus);
              const ComplianceIcon = compliance.icon;
              const postOpInfo = postOpData[patient.id];

              return (
                <div
                  key={patient.id}
                  className="glass rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all"
                  style={{
                    backgroundColor: selectedPatient?.id === patient.id ? 'rgba(255, 255, 255, 0.05)' : undefined,
                    borderColor: selectedPatient?.id === patient.id ? 'var(--accent)' : undefined
                  }}
                >
                  {/* Patient Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{patient.name}</h3>
                      {patient.email && (
                        <p className="text-sm opacity-70 truncate">{patient.email}</p>
                      )}
                    </div>
                    <UserCircle2 className="h-10 w-10 opacity-30" />
                  </div>

                  {/* Compliance Status */}
                  <div
                    className="rounded-lg p-3 mb-4 flex items-center space-x-2"
                    style={{
                      backgroundColor: compliance.bg,
                      borderLeft: `3px solid ${compliance.border}`
                    }}
                  >
                    <ComplianceIcon className="h-4 w-4" style={{ color: compliance.text }} />
                    <span className="text-sm font-medium" style={{ color: compliance.text }}>
                      {compliance.label}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs opacity-60 mb-1">Completion Rate</div>
                      <div className="text-2xl font-bold">{patient.completionRate}%</div>
                    </div>
                    <div>
                      <div className="text-xs opacity-60 mb-1">Recent Events</div>
                      <div className="text-2xl font-bold">{patient.recentEvents}</div>
                    </div>
                  </div>

                  {/* Post-Op Week */}
                  {postOpInfo && postOpInfo.postOpWeek && (
                    <div className="mb-4 p-3 rounded-lg bg-white/5">
                      <div className="flex items-center space-x-2 mb-1">
                        <Clock className="h-4 w-4 opacity-70" />
                        <span className="text-xs opacity-70">Post-Op Progress</span>
                      </div>
                      <div className="text-sm font-medium">
                        Week {postOpInfo.postOpWeek} ({postOpInfo.daysSinceSurgery} days)
                      </div>
                    </div>
                  )}

                  {/* Surgery Date */}
                  {patient.surgeryDate && (
                    <div className="text-xs opacity-60 mb-4 flex items-center space-x-2">
                      <CalendarIcon className="h-3 w-3" />
                      <span>Surgery: {format(parseISO(patient.surgeryDate), 'MMM d, yyyy')}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleSelectPatient(patient)}
                      variant={selectedPatient?.id === patient.id ? "primary" : "glass"}
                      size="sm"
                      className="col-span-2"
                    >
                      <UserCircle2 className="h-4 w-4" />
                      <span>{selectedPatient?.id === patient.id ? 'Selected' : 'Select'}</span>
                    </Button>
                    <Button
                      onClick={() => handleEditPatient(patient)}
                      variant="glass"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      onClick={() => viewPatientCalendar(patient.id)}
                      variant="glass"
                      size="sm"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </Button>
                    <Button
                      onClick={() => handleCreateCalendar(patient)}
                      variant="glass"
                      size="sm"
                      className="col-span-2"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      <span>Create Calendar</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Edit Patient Modal/Form */}
      {editingPatient && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCancelEdit}
        >
          <div
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">Edit Patient: {editingPatient.name}</h2>
              <form onSubmit={handleUpdatePatient} className="space-y-3">
                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={editPatientForm.name}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                    placeholder="Enter patient's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Email</label>
                  <input
                    type="email"
                    value={editPatientForm.email}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                    placeholder="patient@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Phone</label>
                  <input
                    type="tel"
                    value={editPatientForm.phone}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Address</label>
                  <input
                    type="text"
                    value={editPatientForm.address}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, address: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                    placeholder="Street address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Surgery Date</label>
                  <input
                    type="date"
                    value={editPatientForm.surgeryDate}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, surgeryDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>

                {/* Height Field */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Height</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={editPatientForm.height}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, height: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                      placeholder="70"
                    />
                    <select
                      value={editPatientForm.heightUnit}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, heightUnit: e.target.value as 'in' | 'cm' })}
                      className="px-3 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                    >
                      <option value="in" className="bg-gray-800 text-white">inches</option>
                      <option value="cm" className="bg-gray-800 text-white">cm</option>
                    </select>
                  </div>
                </div>

                {/* Weight Tracking Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-cyan-300">Starting Weight</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={editPatientForm.startingWeight}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, startingWeight: e.target.value })}
                        className="flex-1 px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                        placeholder="165.5"
                      />
                      <select
                        value={editPatientForm.weightUnit}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, weightUnit: e.target.value as 'kg' | 'lbs' })}
                        className="px-3 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                      >
                        <option value="lbs" className="bg-gray-800 text-white">lbs</option>
                        <option value="kg" className="bg-gray-800 text-white">kg</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-cyan-300">Current Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editPatientForm.currentWeight}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, currentWeight: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                      placeholder="165.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-cyan-300">Target Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editPatientForm.targetWeight}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, targetWeight: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                      placeholder="155.0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Notes</label>
                  <textarea
                    value={editPatientForm.notes}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, notes: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                    rows={3}
                    placeholder="Additional notes about the patient..."
                  />
                </div>

                {/* Create User Account Section - Only show if patient doesn't have userId */}
                {!editingPatient?.userId && (
                  <div className="pt-4 border-t border-cyan-400/20">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPatientForm.createUserAccount}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, createUserAccount: e.target.checked, password: e.target.checked ? editPatientForm.password : '' })}
                        className="w-5 h-5 rounded border-cyan-400/30 bg-white/10 checked:bg-cyan-500 focus:ring-2 focus:ring-cyan-500/50"
                      />
                      <div>
                        <span className="text-sm font-bold text-cyan-300">Create user account for this patient</span>
                        <p className="text-xs text-gray-400">Allow patient to log in and manage their own data</p>
                      </div>
                    </label>

                    {editPatientForm.createUserAccount && (
                      <div className="mt-4">
                        <label className="block text-sm font-bold mb-2 text-cyan-300">Initial Password *</label>
                        <input
                          type="password"
                          required={editPatientForm.createUserAccount}
                          value={editPatientForm.password}
                          onChange={(e) => setEditPatientForm({ ...editPatientForm, password: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                          placeholder="Enter password for patient"
                          minLength={6}
                        />
                        <p className="text-xs text-gray-400 mt-1">Patient can change this password after first login</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <Button type="submit" variant="primary" className="flex-1">
                    <Save className="h-4 w-4" />
                    <span>Update Patient</span>
                  </Button>
                  <Button
                    type="button"
                    variant="glass"
                    onClick={handleCancelEdit}
                  >
                    <span>Cancel</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {patientSubTab === 'add-new' && (
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold mb-6 text-cyan-400">Add New Patient</h2>
            <form onSubmit={handleNewPatientSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Patient Name *</label>
                <input
                  type="text"
                  required
                  value={newPatientForm.name}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Enter patient's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Email</label>
                <input
                  type="email"
                  value={newPatientForm.email}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="patient@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Phone</label>
                <input
                  type="tel"
                  value={newPatientForm.phone}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Address</label>
                <input
                  type="text"
                  value={newPatientForm.address}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, address: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Surgery Date</label>
                <input
                  type="date"
                  value={newPatientForm.surgeryDate}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, surgeryDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Height Field */}
              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Height</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={newPatientForm.height}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, height: e.target.value })}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                    placeholder="70"
                  />
                  <select
                    value={newPatientForm.heightUnit}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, heightUnit: e.target.value as 'in' | 'cm' })}
                    className="px-3 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                  >
                    <option value="in" className="bg-gray-800 text-white">inches</option>
                    <option value="cm" className="bg-gray-800 text-white">cm</option>
                  </select>
                </div>
              </div>

              {/* Weight Tracking Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Starting Weight</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={newPatientForm.startingWeight}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, startingWeight: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                      placeholder="165.5"
                    />
                    <select
                      value={newPatientForm.weightUnit}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, weightUnit: e.target.value as 'kg' | 'lbs' })}
                      className="px-3 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                    >
                      <option value="lbs" className="bg-gray-800 text-white">lbs</option>
                      <option value="kg" className="bg-gray-800 text-white">kg</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Current Weight</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPatientForm.currentWeight}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, currentWeight: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                    placeholder="165.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Target Weight</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPatientForm.targetWeight}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, targetWeight: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                    placeholder="155.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Notes</label>
                <textarea
                  value={newPatientForm.notes}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, notes: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                  rows={3}
                  placeholder="Additional notes about the patient..."
                />
              </div>

              {/* Create User Account Section */}
              <div className="pt-4 border-t border-cyan-400/20">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPatientForm.createUserAccount}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, createUserAccount: e.target.checked, password: e.target.checked ? newPatientForm.password : '' })}
                    className="w-5 h-5 rounded border-cyan-400/30 bg-white/10 checked:bg-cyan-500 focus:ring-2 focus:ring-cyan-500/50"
                  />
                  <div>
                    <span className="text-sm font-bold text-cyan-300">Create user account for this patient</span>
                    <p className="text-xs text-gray-400">Allow patient to log in and manage their own data</p>
                  </div>
                </label>

                {newPatientForm.createUserAccount && (
                  <div className="mt-4">
                    <label className="block text-sm font-bold mb-2 text-cyan-300">Initial Password *</label>
                    <input
                      type="password"
                      required={newPatientForm.createUserAccount}
                      value={newPatientForm.password}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, password: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                      placeholder="Enter password for patient"
                      minLength={6}
                    />
                    <p className="text-xs text-gray-400 mt-1">Patient can change this password after first login</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="primary" className="flex-1 gap-2">
                  <Save className="h-4 w-4" />
                  <span>Save Patient</span>
                </Button>
                <Button
                  type="button"
                  variant="glass"
                  onClick={() => {
                    setNewPatientForm({
                      name: '',
                      email: '',
                      phone: '',
                      address: '',
                      surgeryDate: '',
                      height: '',
                      heightUnit: 'in',
                      notes: '',
                      startingWeight: '',
                      currentWeight: '',
                      targetWeight: '',
                      weightUnit: 'lbs',
                      createUserAccount: false,
                      password: ''
                    });
                    setPatientSubTab('select-existing');
                  }}
                >
                  <span>Cancel</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {patientSubTab === 'import' && (
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-xl p-8 border border-white/10 text-center">
            <Download className="h-16 w-16 mx-auto opacity-30 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Import Patient Data</h2>
            <p className="text-sm opacity-70 mb-6">
              Import patient data from the main cardiac-recovery-pro application
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleImportData} variant="primary">
                <Download className="h-4 w-4" />
                <span>Import from Cardiac Recovery Pro</span>
              </Button>
              <Button onClick={() => setPatientSubTab('select-existing')} variant="glass">
                <span>Cancel</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {patientSubTab === 'add-calendar' && (
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold mb-6 text-cyan-400">Add New Patient Calendar</h2>
            <form onSubmit={handleSubmitCalendar} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Select Patient *</label>
                <select
                  required
                  value={calendarPatient?.id || ''}
                  onChange={(e) => {
                    const patient = patients.find(p => p.id === parseInt(e.target.value));
                    setCalendarPatient(patient || null);
                    if (patient) {
                      setCalendarFormData({ ...calendarFormData, name: `${patient.name}'s Calendar` });
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                >
                  <option value="" className="bg-gray-800 text-white">-- Select a Patient --</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id} className="bg-gray-800 text-white">
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Calendar Name *</label>
                <input
                  type="text"
                  required
                  value={calendarFormData.name}
                  onChange={(e) => setCalendarFormData({ ...calendarFormData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                  placeholder="Patient's Calendar"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Calendar Type *</label>
                <select
                  value={calendarFormData.type}
                  onChange={(e) => setCalendarFormData({ ...calendarFormData, type: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                >
                  <option value="general" className="bg-gray-800 text-white">General</option>
                  <option value="vitals" className="bg-gray-800 text-white">Vitals</option>
                  <option value="medications" className="bg-gray-800 text-white">Medications</option>
                  <option value="meals" className="bg-gray-800 text-white">Meals</option>
                  <option value="diet" className="bg-gray-800 text-white">Food Diary</option>
                  <option value="sleep" className="bg-gray-800 text-white">Sleep Journal</option>
                  <option value="exercise" className="bg-gray-800 text-white">Exercise & Activities</option>
                  <option value="appointments" className="bg-gray-800 text-white">Appointments</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-cyan-300">Calendar Color *</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={calendarFormData.color}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, color: e.target.value })}
                    className="h-12 w-20 rounded border-2 border-cyan-400/30 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={calendarFormData.color}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, color: e.target.value })}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                    placeholder="#607d8b"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="glass"
                  className="flex-1"
                  onClick={() => {
                    setPatientSubTab('select-existing');
                    setCalendarPatient(null);
                    setCalendarFormData({ name: '', type: 'general', color: '#607d8b' });
                  }}
                >
                  <span>Cancel</span>
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>Create Calendar</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Creation Modal */}
      {isCalendarModalOpen && calendarPatient && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setIsCalendarModalOpen(false);
            setCalendarPatient(null);
            setCalendarFormData({ name: '', type: 'general', color: '#607d8b' });
          }}
        >
          <div
            className="max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">Create Calendar for {calendarPatient.name}</h2>
              <form onSubmit={handleSubmitCalendar} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Calendar Name *</label>
                  <input
                    type="text"
                    required
                    value={calendarFormData.name}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                    placeholder="My Calendar"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Calendar Type *</label>
                  <select
                    value={calendarFormData.type}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors"
                  >
                    <option value="general" className="bg-gray-800 text-white">General</option>
                    <option value="vitals" className="bg-gray-800 text-white">Vitals</option>
                    <option value="medications" className="bg-gray-800 text-white">Medications</option>
                    <option value="meals" className="bg-gray-800 text-white">Meals</option>
                    <option value="diet" className="bg-gray-800 text-white">Food Diary</option>
                    <option value="sleep" className="bg-gray-800 text-white">Sleep Journal</option>
                    <option value="exercise" className="bg-gray-800 text-white">Exercise & Activities</option>
                    <option value="appointments" className="bg-gray-800 text-white">Appointments</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-cyan-300">Calendar Color *</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={calendarFormData.color}
                      onChange={(e) => setCalendarFormData({ ...calendarFormData, color: e.target.value })}
                      className="h-12 w-20 rounded border-2 border-cyan-400/30 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={calendarFormData.color}
                      onChange={(e) => setCalendarFormData({ ...calendarFormData, color: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/10 border-2 border-cyan-400/30 text-white font-medium focus:border-cyan-400 focus:outline-none transition-colors placeholder-gray-400"
                      placeholder="#607d8b"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="glass"
                    className="flex-1"
                    onClick={() => {
                      setIsCalendarModalOpen(false);
                      setCalendarPatient(null);
                      setCalendarFormData({ name: '', type: 'general', color: '#607d8b' });
                    }}
                  >
                    <span>Cancel</span>
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 gap-2"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span>Create Calendar</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
