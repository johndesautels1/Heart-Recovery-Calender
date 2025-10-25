import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  UserCircle2,
  Plus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Video,
  Calendar as CalendarIcon,
  Activity
} from 'lucide-react';
import { Patient, CreatePatientInput, PostOpWeekResponse } from '../types';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { format, parseISO } from 'date-fns';

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [postOpData, setPostOpData] = useState<Record<number, PostOpWeekResponse>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePatientInput>();

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
      setPatients(data.data || []);

      // Load post-op week data for each patient with surgery date
      for (const patient of data.data || []) {
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

  const onSubmit = async (data: CreatePatientInput) => {
    try {
      const token = localStorage.getItem('token');
      const url = editingPatient
        ? `/api/patients/${editingPatient.id}`
        : '/api/patients';
      const method = editingPatient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save patient');

      toast.success(editingPatient ? 'Patient updated successfully' : 'Patient added successfully');
      setIsAddModalOpen(false);
      setEditingPatient(null);
      reset();
      await loadPatients();
    } catch (error) {
      console.error('Error saving patient:', error);
      toast.error('Failed to save patient');
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    reset({
      name: patient.name,
      email: patient.email || '',
      phone: patient.phone || '',
      address: patient.address || '',
      zoomHandle: patient.zoomHandle || '',
      surgeryDate: patient.surgeryDate ? format(parseISO(patient.surgeryDate), 'yyyy-MM-dd') : '',
      notes: patient.notes || '',
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/patients/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete patient');

      toast.success('Patient deleted successfully');
      await loadPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Failed to delete patient');
    }
  };

  const handleToggleActive = async (patient: Patient) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/patients/${patient.id}/toggle-active`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to toggle patient status');

      toast.success(`Patient ${patient.isActive ? 'deactivated' : 'activated'} successfully`);
      await loadPatients();
    } catch (error) {
      console.error('Error toggling patient status:', error);
      toast.error('Failed to update patient status');
    }
  };

  const handleAddNew = () => {
    setEditingPatient(null);
    reset({
      name: '',
      email: '',
      phone: '',
      address: '',
      zoomHandle: '',
      surgeryDate: '',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const getPostOpDisplay = (patientId: number) => {
    const data = postOpData[patientId];
    if (!data) return null;

    if (data.isPreSurgery) {
      return (
        <div className="flex items-center space-x-2 text-sm" style={{ color: '#60a5fa' }}>
          <CalendarIcon className="h-4 w-4" />
          <span className="font-medium">Pre-Surgery</span>
          <span style={{ color: 'var(--ink)' }}>({Math.abs(data.daysSinceSurgery || 0)} days until surgery)</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-sm" style={{ color: '#10b981' }}>
        <Activity className="h-4 w-4" />
        <span className="font-medium">Week {data.postOpWeek}</span>
        <span style={{ color: 'var(--ink)' }}>({data.daysSinceSurgery} days post-op)</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl" style={{ color: 'var(--ink)' }}>Loading patients...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Patient Management</h1>
          <p style={{ color: 'var(--ink)' }} className="text-sm">
            Manage your patients and track their recovery progress
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-5 w-5 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Patient Grid */}
      {patients.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <UserCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>No patients yet</h3>
          <p style={{ color: 'var(--ink)' }} className="mb-6 opacity-70">
            Add your first patient to start tracking their recovery journey
          </p>
          <Button onClick={handleAddNew}>
            <Plus className="h-5 w-5 mr-2" />
            Add Your First Patient
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div key={patient.id} className="glass rounded-xl p-6 hover:scale-[1.02] transition-transform">
              {/* Patient Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full glass flex items-center justify-center" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)' }}>
                    <UserCircle2 className="h-7 w-7" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{patient.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${patient.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {patient.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(patient)}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    title="Edit patient"
                  >
                    <Edit2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  </button>
                  <button
                    onClick={() => handleDelete(patient.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="Delete patient"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Post-Op Week */}
              {patient.surgeryDate && (
                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                  {getPostOpDisplay(patient.id)}
                  <div className="text-xs mt-1" style={{ color: 'var(--ink)', opacity: 0.7 }}>
                    Surgery: {format(parseISO(patient.surgeryDate), 'MMM d, yyyy')}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {patient.email && (
                  <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--ink)' }}>
                    <Mail className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                    <span className="truncate">{patient.email}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--ink)' }}>
                    <Phone className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--ink)' }}>
                    <MapPin className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                    <span className="truncate">{patient.address}</span>
                  </div>
                )}
                {patient.zoomHandle && (
                  <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--ink)' }}>
                    <Video className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                    <span className="truncate">{patient.zoomHandle}</span>
                  </div>
                )}
              </div>

              {/* Notes Preview */}
              {patient.notes && (
                <div className="text-xs p-2 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}>
                  <span className="opacity-70">Notes: </span>
                  {patient.notes.length > 80 ? `${patient.notes.substring(0, 80)}...` : patient.notes}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => handleToggleActive(patient)}
                className="w-full mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: patient.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: patient.isActive ? '#dc2626' : '#10b981',
                }}
              >
                {patient.isActive ? 'Deactivate Patient' : 'Activate Patient'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingPatient(null);
          reset();
        }}
        title={editingPatient ? 'Edit Patient' : 'Add New Patient'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Patient Name *
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="John Doe"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Email
              </label>
              <input
                type="email"
                className="glass-input"
                placeholder="john@example.com"
                {...register('email')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Phone
              </label>
              <input
                type="tel"
                className="glass-input"
                placeholder="(555) 123-4567"
                {...register('phone')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Address
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="123 Main St, City, State 12345"
              {...register('address')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Zoom Handle
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="john.doe@zoom.us"
              {...register('zoomHandle')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Surgery Date (Day 0)
            </label>
            <input
              type="date"
              className="glass-input"
              {...register('surgeryDate')}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--ink)', opacity: 0.7 }}>
              Set the surgery date to track post-operative recovery progress
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Notes
            </label>
            <textarea
              className="glass-input"
              rows={3}
              placeholder="Additional notes about the patient..."
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="glass"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingPatient(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingPatient ? 'Update Patient' : 'Add Patient'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
