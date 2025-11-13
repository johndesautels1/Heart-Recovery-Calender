import React, { useState } from 'react';
import { Wind, X, Save, Upload } from 'lucide-react';
import { GlassCard, Button, Input } from './ui';
import { toast } from 'sonner';

interface SpirometryDataEntryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpirometryDataEntry: React.FC<SpirometryDataEntryProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    testDate: new Date().toISOString().split('T')[0],
    testTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    fev1: '', // Forced Expiratory Volume in 1 second (liters)
    fvc: '',  // Forced Vital Capacity (liters)
    fev1FvcRatio: '', // FEV1/FVC Ratio (percentage)
    pef: '',  // Peak Expiratory Flow (L/min)
    fef2575: '', // Forced Expiratory Flow 25-75% (L/sec)
    notes: '',
    techniCAInName: '',
    location: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Spirometry test data saved successfully!');
      setFormData({
        testDate: new Date().toISOString().split('T')[0],
        testTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        fev1: '',
        fvc: '',
        fev1FvcRatio: '',
        pef: '',
        fef2575: '',
        notes: '',
        techniCAInName: '',
        location: '',
      });
      onClose();
    } catch (error) {
      console.error('Error saving spirometry data:', error);
      toast.error('Failed to save spirometry data');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <GlassCard className="border-2 border-cyan-500/30">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Wind className="h-8 w-8 text-cyan-400" />
                <div>
                  <h2 className="text-2xl font-bold text-cyan-400">Spirometry Test Results</h2>
                  <p className="text-sm text-gray-400">Enter lung function test data</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Test Date</label>
                  <input
                    type="date"
                    value={formData.testDate}
                    onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Test Time</label>
                  <input
                    type="time"
                    value={formData.testTime}
                    onChange={(e) => setFormData({ ...formData, testTime: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                  />
                </div>
              </div>

              {/* Primary Measurements */}
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-3">Primary Measurements</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      FEV1 (Liters) *
                      <span className="text-xs text-gray-500 ml-1">Forced Expiratory Volume</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.fev1}
                      onChange={(e) => setFormData({ ...formData, fev1: e.target.value })}
                      required
                      placeholder="e.g., 3.45"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      FVC (Liters) *
                      <span className="text-xs text-gray-500 ml-1">Forced Vital Capacity</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.fvc}
                      onChange={(e) => setFormData({ ...formData, fvc: e.target.value })}
                      required
                      placeholder="e.g., 4.20"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      FEV1/FVC Ratio (%) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.fev1FvcRatio}
                      onChange={(e) => setFormData({ ...formData, fev1FvcRatio: e.target.value })}
                      required
                      placeholder="e.g., 82.5"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      PEF (L/min)
                      <span className="text-xs text-gray-500 ml-1">Peak Expiratory Flow</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={formData.pef}
                      onChange={(e) => setFormData({ ...formData, pef: e.target.value })}
                      placeholder="e.g., 450"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      FEF 25-75% (L/sec)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.fef2575}
                      onChange={(e) => setFormData({ ...formData, fef2575: e.target.value })}
                      placeholder="e.g., 3.20"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-3">Additional Information</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">TechniCAIn Name</label>
                    <input
                      type="text"
                      value={formData.techniCAInName}
                      onChange={(e) => setFormData({ ...formData, techniCAInName: e.target.value })}
                      placeholder="e.g., Dr. Sarah Johnson"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Location/Facility</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., St. Mary's Cardiology"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Any additional observations or notes..."
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save Test Results'}
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>

              {/* Future MIR Device Integration Notice */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400">
                  <Upload className="h-3 w-3 inline mr-1" />
                  Future: Connect MIR Spirobank Smart for automated real-time data import
                </p>
              </div>
            </form>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
