import React, { useState, useEffect } from 'react';
import { GlassCard, Button, Modal, Input, Select } from '../components/ui';
import {
  Pill,
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Bell,
  BellOff
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { Medication, CreateMedicationInput } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { MedicationAutocomplete } from '../components/MedicationAutocomplete';
import { SideEffectWarnings } from '../components/SideEffectWarnings';
import { type MedicationInfo, STANDARD_FREQUENCIES, STANDARD_TIMES_OF_DAY } from '../data/medicationDatabase';

const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  prescribedBy: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  timeOfDay: z.string().optional(),
  instructions: z.string().optional(),
  sideEffects: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
});

type MedicationFormData = z.infer<typeof medicationSchema>;

export function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [activeMeds, setActiveMeds] = useState<Medication[]>([]);
  const [inactiveMeds, setInactiveMeds] = useState<Medication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'active' | 'inactive'>('active');

  // Autocomplete state
  const [medicationName, setMedicationName] = useState('');
  const [selectedMedicationInfo, setSelectedMedicationInfo] = useState<MedicationInfo | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MedicationFormData>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      reminderEnabled: true,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      setIsLoading(true);
      const medsData = await api.getMedications();
      setMedications(medsData);
      setActiveMeds(medsData.filter(m => m.isActive));
      setInactiveMeds(medsData.filter(m => !m.isActive));
    } catch (error) {
      console.error('Failed to load medications:', error);
      toast.error('Failed to load medications');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: MedicationFormData) => {
    try {
      setIsLoading(true);
      
      if (editingMed) {
        const updated = await api.updateMedication(editingMed.id, data);
        setMedications(medications.map(m => m.id === updated.id ? updated : m));
        toast.success('Medication updated successfully');
      } else {
        const newMed = await api.createMedication({
          ...data,
          isActive: true,
        } as CreateMedicationInput);
        setMedications([...medications, newMed]);
        toast.success('Medication added successfully');
      }
      
      loadMedications();
      setIsModalOpen(false);
      reset();
      setEditingMed(null);
    } catch (error) {
      console.error('Failed to save medication:', error);
      toast.error('Failed to save medication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (medication: Medication) => {
    setEditingMed(medication);
    setValue('name', medication.name);
    setValue('dosage', medication.dosage);
    setValue('frequency', medication.frequency);
    setValue('prescribedBy', medication.prescribedBy || '');
    setValue('startDate', medication.startDate.split('T')[0]);
    setValue('endDate', medication.endDate ? medication.endDate.split('T')[0] : '');
    setValue('timeOfDay', medication.timeOfDay || '');
    setValue('instructions', medication.instructions || '');
    setValue('sideEffects', medication.sideEffects || '');
    setValue('reminderEnabled', medication.reminderEnabled);
    setIsModalOpen(true);
  };

  const handleDelete = async (medication: Medication) => {
    if (!window.confirm('Are you sure you want to delete this medication?')) return;
    
    try {
      await api.deleteMedication(medication.id);
      setMedications(medications.filter(m => m.id !== medication.id));
      loadMedications();
      toast.success('Medication deleted successfully');
    } catch (error) {
      console.error('Failed to delete medication:', error);
      toast.error('Failed to delete medication');
    }
  };

  const handleToggleActive = async (medication: Medication) => {
    try {
      const updated = await api.toggleMedicationActive(medication.id);
      setMedications(medications.map(m => m.id === updated.id ? updated : m));
      loadMedications();
      toast.success(`Medication ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Failed to toggle medication status:', error);
      toast.error('Failed to toggle medication status');
    }
  };

  const displayedMeds = 
    viewMode === 'active' ? activeMeds :
    viewMode === 'inactive' ? inactiveMeds :
    medications;

  const MedicationCard = ({ medication }: { medication: Medication }) => (
    <GlassCard className="relative">
      {!medication.isActive && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-full">
            Inactive
          </span>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#ffffff' }}>{medication.name}</h3>
            <p className="font-bold" style={{ color: '#ffffff' }}>{medication.dosage}</p>
          </div>
          <Pill className="h-8 w-8 text-purple-500" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center font-bold" style={{ color: '#ffffff' }}>
            <Clock className="h-4 w-4 mr-2" />
            {medication.frequency}
            {medication.timeOfDay && ` • ${medication.timeOfDay}`}
          </div>

          {medication.prescribedBy && (
            <div className="flex items-center font-bold" style={{ color: '#ffffff' }}>
              <User className="h-4 w-4 mr-2" />
              Dr. {medication.prescribedBy}
            </div>
          )}

          <div className="flex items-center font-bold" style={{ color: '#ffffff' }}>
            <Calendar className="h-4 w-4 mr-2" />
            Started {format(new Date(medication.startDate), 'MMM d, yyyy')}
            {medication.endDate && (
              <span> • Ends {format(new Date(medication.endDate), 'MMM d, yyyy')}</span>
            )}
          </div>

          <div className="flex items-center">
            {medication.reminderEnabled ? (
              <div className="flex items-center font-bold" style={{ color: '#ffffff' }}>
                <Bell className="h-4 w-4 mr-2" />
                Reminders enabled
              </div>
            ) : (
              <div className="flex items-center font-bold" style={{ color: '#ffffff' }}>
                <BellOff className="h-4 w-4 mr-2" />
                Reminders disabled
              </div>
            )}
          </div>
        </div>

        {medication.instructions && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs font-bold" style={{ color: '#ffffff' }}>
              <span className="font-bold">Instructions:</span> {medication.instructions}
            </p>
          </div>
        )}

        {medication.sideEffects && (
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
            <p className="text-xs font-bold" style={{ color: '#ffffff' }}>
              <span className="font-bold">Side effects:</span> {medication.sideEffects}
            </p>
          </div>
        )}

        <div className="flex justify-between pt-3 border-t border-gray-200">
          <Button
            size="sm"
            variant={medication.isActive ? 'secondary' : 'success'}
            onClick={() => handleToggleActive(medication)}
          >
            {medication.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="glass"
              onClick={() => handleEdit(medication)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDelete(medication)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={{ color: '#ffffff' }}>Medications</h1>
        <Button onClick={() => {
          reset({
            reminderEnabled: true,
            startDate: new Date().toISOString().split('T')[0],
          });
          setEditingMed(null);
          setIsModalOpen(true);
        }}>
          <Plus className="h-5 w-5 mr-2" />
          Add Medication
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>Total Medications</p>
              <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>{medications.length}</p>
            </div>
            <Pill className="h-8 w-8 text-purple-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>Active</p>
              <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>{activeMeds.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>With Reminders</p>
              <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>
                {medications.filter(m => m.reminderEnabled).length}
              </p>
            </div>
            <Bell className="h-8 w-8 text-blue-500" />
          </div>
        </GlassCard>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => setViewMode('active')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            viewMode === 'active'
              ? 'bg-purple-500'
              : 'glass-button'
          }`}
          style={{ color: '#ffffff' }}
        >
          Active ({activeMeds.length})
        </button>
        <button
          onClick={() => setViewMode('inactive')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            viewMode === 'inactive'
              ? 'bg-gray-500'
              : 'glass-button'
          }`}
          style={{ color: '#ffffff' }}
        >
          Inactive ({inactiveMeds.length})
        </button>
        <button
          onClick={() => setViewMode('all')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            viewMode === 'all'
              ? 'bg-blue-500'
              : 'glass-button'
          }`}
          style={{ color: '#ffffff' }}
        >
          All ({medications.length})
        </button>
      </div>

      {/* Medications Grid */}
      {displayedMeds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedMeds.map((medication) => (
            <MedicationCard key={medication.id} medication={medication} />
          ))}
        </div>
      ) : (
        <GlassCard>
          <div className="text-center py-12">
            <Pill className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="font-bold" style={{ color: '#ffffff' }}>
              {viewMode === 'active'
                ? 'No active medications'
                : viewMode === 'inactive'
                ? 'No inactive medications'
                : 'No medications added yet'}
            </p>
            {viewMode !== 'all' && (
              <Button
                className="mt-4"
                onClick={() => {
                  reset({
                    reminderEnabled: true,
                    startDate: new Date().toISOString().split('T')[0],
                  });
                  setEditingMed(null);
                  setIsModalOpen(true);
                }}
              >
                Add your first medication
              </Button>
            )}
          </div>
        </GlassCard>
      )}

      {/* Add/Edit Medication Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
          setEditingMed(null);
          setMedicationName('');
          setSelectedMedicationInfo(null);
        }}
        title={editingMed ? 'Edit Medication' : 'Add Medication'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Medication Name Autocomplete */}
          <MedicationAutocomplete
            value={medicationName}
            onChange={(value) => {
              setMedicationName(value);
              setValue('name', value);
            }}
            onMedicationSelect={(medInfo) => {
              setSelectedMedicationInfo(medInfo);
            }}
            error={errors.name?.message}
          />

          {/* Side Effect Warnings - Show after medication is selected */}
          {selectedMedicationInfo && (
            <SideEffectWarnings medication={selectedMedicationInfo} />
          )}

          {/* Dosage Selection - Dynamic based on selected medication */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#ffffff' }}>
              Dosage *
            </label>
            {selectedMedicationInfo && selectedMedicationInfo.commonDosages.length > 0 ? (
              <select
                {...register('dosage')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none font-bold bg-white"
                style={{ color: '#000000' }}
              >
                <option value="">Select dosage...</option>
                {selectedMedicationInfo.commonDosages.map((dosage) => (
                  <option key={dosage} value={dosage}>
                    {dosage}
                  </option>
                ))}
                <option value="custom">Custom dosage...</option>
              </select>
            ) : (
              <input
                type="text"
                {...register('dosage')}
                placeholder="e.g., 81mg"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none font-bold"
                style={{ color: '#000000' }}
              />
            )}
            {errors.dosage?.message && (
              <p className="mt-1 text-sm text-red-600 font-bold">{errors.dosage.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Frequency"
              error={errors.frequency?.message}
              options={[
                { value: 'Once daily', label: 'Once daily' },
                { value: 'Twice daily', label: 'Twice daily' },
                { value: 'Three times daily', label: 'Three times daily' },
                { value: 'Four times daily', label: 'Four times daily' },
                { value: 'Every 4 hours', label: 'Every 4 hours' },
                { value: 'Every 6 hours', label: 'Every 6 hours' },
                { value: 'Every 8 hours', label: 'Every 8 hours' },
                { value: 'Every 12 hours', label: 'Every 12 hours' },
                { value: 'As needed', label: 'As needed' },
                { value: 'Weekly', label: 'Weekly' },
                { value: 'Monthly', label: 'Monthly' },
              ]}
              {...register('frequency')}
            />

            <Select
              label="Time of Day (optional)"
              options={[
                { value: '', label: 'Not specified' },
                { value: 'Morning', label: 'Morning' },
                { value: 'Noon', label: 'Noon' },
                { value: 'Evening', label: 'Evening' },
                { value: 'Bedtime', label: 'Bedtime' },
                { value: 'With breakfast', label: 'With breakfast' },
                { value: 'With lunch', label: 'With lunch' },
                { value: 'With dinner', label: 'With dinner' },
                { value: 'Before meals', label: 'Before meals' },
                { value: 'After meals', label: 'After meals' },
              ]}
              {...register('timeOfDay')}
            />
          </div>

          <Input
            label="Prescribed By (optional)"
            placeholder="Doctor's name"
            icon={<User className="h-5 w-5" />}
            {...register('prescribedBy')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              error={errors.startDate?.message}
              {...register('startDate')}
            />

            <Input
              label="End Date (optional)"
              type="date"
              hint="Leave blank for ongoing medication"
              {...register('endDate')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Instructions (optional)
            </label>
            <textarea
              className="glass-input"
              rows={2}
              placeholder="e.g., Take with food, avoid alcohol"
              {...register('instructions')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Side Effects to Watch (optional)
            </label>
            <textarea
              className="glass-input"
              rows={2}
              placeholder="e.g., May cause dizziness, nausea"
              {...register('sideEffects')}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="reminderEnabled"
              className="rounded border-gray-300"
              {...register('reminderEnabled')}
            />
            <label htmlFor="reminderEnabled" className="text-sm text-gray-700">
              Enable reminders for this medication
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                reset();
                setEditingMed(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {editingMed ? 'Update Medication' : 'Add Medication'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
