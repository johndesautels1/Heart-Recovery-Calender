import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { useSession } from '../contexts/SessionContext';
import api from '../services/api';

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompleteProfileModal({ isOpen, onClose }: CompleteProfileModalProps) {
  const { refreshPatientProfile } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    surgeryDate: '',
    height: '',
    heightUnit: 'in',
    startingWeight: '',
    weightUnit: 'lbs',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = {
        surgeryDate: formData.surgeryDate,
        height: formData.height ? parseFloat(formData.height) : undefined,
        heightUnit: formData.heightUnit,
        startingWeight: formData.startingWeight ? parseFloat(formData.startingWeight) : undefined,
        weightUnit: formData.weightUnit,
      };

      await api.completePatientProfile(data);
      await refreshPatientProfile();
      onClose();
    } catch (err: any) {
      console.error('Error completing profile:', err);
      setError(err.response?.data?.error || 'Failed to complete profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Your Patient Profile"
      size="md"
      showCloseButton={false}
    >
      <div className="space-y-4">
        <p style={{ color: 'var(--ink)', opacity: 0.8 }} className="text-sm mb-4">
          Please provide your surgery details to continue. This information helps us provide
          personalized tracking and insights for your recovery journey.
        </p>

        {error && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'rgb(239, 68, 68)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Surgery Date */}
          <div>
            <label
              htmlFor="surgeryDate"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ink)' }}
            >
              Surgery Date <span style={{ color: 'rgb(239, 68, 68)' }}>*</span>
            </label>
            <input
              type="date"
              id="surgeryDate"
              name="surgeryDate"
              value={formData.surgeryDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-lg glass"
              style={{
                color: 'var(--ink)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
              }}
            />
          </div>

          {/* Height */}
          <div>
            <label
              htmlFor="height"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ink)' }}
            >
              Height (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="height"
                name="height"
                value={formData.height}
                onChange={handleChange}
                step="0.1"
                placeholder="e.g., 5.8"
                className="flex-1 px-3 py-2 rounded-lg glass"
                style={{
                  color: 'var(--ink)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                }}
              />
              <select
                name="heightUnit"
                value={formData.heightUnit}
                onChange={handleChange}
                className="px-3 py-2 rounded-lg glass"
                style={{
                  color: 'var(--ink)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                }}
              >
                <option value="in">inches</option>
                <option value="ft">feet</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>

          {/* Starting Weight */}
          <div>
            <label
              htmlFor="startingWeight"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ink)' }}
            >
              Starting Weight (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="startingWeight"
                name="startingWeight"
                value={formData.startingWeight}
                onChange={handleChange}
                step="0.1"
                placeholder="e.g., 180"
                className="flex-1 px-3 py-2 rounded-lg glass"
                style={{
                  color: 'var(--ink)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                }}
              />
              <select
                name="weightUnit"
                value={formData.weightUnit}
                onChange={handleChange}
                className="px-3 py-2 rounded-lg glass"
                style={{
                  color: 'var(--ink)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                }}
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <button
              type="submit"
              disabled={isSubmitting || !formData.surgeryDate}
              className="px-6 py-2 rounded-lg font-medium transition-all duration-300"
              style={{
                backgroundColor: formData.surgeryDate && !isSubmitting ? 'var(--accent)' : 'rgba(148, 163, 184, 0.3)',
                color: formData.surgeryDate && !isSubmitting ? 'white' : 'rgba(148, 163, 184, 0.6)',
                cursor: formData.surgeryDate && !isSubmitting ? 'pointer' : 'not-allowed',
              }}
            >
              {isSubmitting ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
