import React, { useState } from 'react';
import { TrendingUp, X, Save, Video, Link as LinkIcon } from 'lucide-react';
import { GlassCard, Button } from './ui';
import { toast } from 'sonner';

interface TreadmillDataEntryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TreadmillDataEntry: React.FC<TreadmillDataEntryProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    testDate: new Date().toISOString().split('T')[0],
    testTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    duration: '', // Minutes
    maxSpeed: '', // mph
    maxIncline: '', // percentage
    preHeartRate: '',
    maxHeartRate: '',
    recoveryHeartRate: '', // 1 min post-exercise
    preBpSystolic: '',
    preBpDiastolic: '',
    peakBpSystolic: '',
    peakBpDiastolic: '',
    mets: '', // Metabolic Equivalents
    vo2Max: '', // mL/kg/min
    symptoms: '',
    ekgFindings: '',
    techniCAInName: '',
    location: '',
    videoLink: '', // Zoom/YouTube link for live stream
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideoEmbed, setShowVideoEmbed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Treadmill test data saved successfully!');
      setFormData({
        testDate: new Date().toISOString().split('T')[0],
        testTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        duration: '',
        maxSpeed: '',
        maxIncline: '',
        preHeartRate: '',
        maxHeartRate: '',
        recoveryHeartRate: '',
        preBpSystolic: '',
        preBpDiastolic: '',
        peakBpSystolic: '',
        peakBpDiastolic: '',
        mets: '',
        vo2Max: '',
        symptoms: '',
        ekgFindings: '',
        techniCAInName: '',
        location: '',
        videoLink: '',
        notes: '',
      });
      onClose();
    } catch (error) {
      console.error('Error saving treadmill data:', error);
      toast.error('Failed to save treadmill test data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const embedVideo = () => {
    if (formData.videoLink) {
      setShowVideoEmbed(true);
    } else {
      toast.error('Please enter a video link first');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <GlassCard className="border-2 border-blue-500/30">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-400" />
                <div>
                  <h2 className="text-2xl font-bold text-blue-400">Treadmill Stress Test Results</h2>
                  <p className="text-sm text-gray-400">Enter cardiac stress test data or live stream</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            {/* Live Video Stream Section */}
            {showVideoEmbed && formData.videoLink && (
              <div className="mb-6 p-4 rounded-lg bg-black/40 border border-blue-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-blue-400" />
                    <span className="text-sm font-semibold text-blue-400">Live Test Stream</span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                      LIVE
                    </span>
                  </div>
                  <button
                    onClick={() => setShowVideoEmbed(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                  <iframe
                    src={formData.videoLink}
                    className="w-full h-full rounded-lg"
                    allow="camera; microphone"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date, Time, Video Link */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Test Date *</label>
                  <input
                    type="date"
                    value={formData.testDate}
                    onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Test Time *</label>
                  <input
                    type="time"
                    value={formData.testTime}
                    onChange={(e) => setFormData({ ...formData, testTime: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.videoLink}
                    onChange={(e) => setFormData({ ...formData, videoLink: e.target.value })}
                    placeholder="Zoom/Video link (optional)"
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
                  />
                  <button
                    type="button"
                    onClick={embedVideo}
                    className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-all"
                    title="Show video"
                  >
                    <Video className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Exercise Parameters */}
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-3">Exercise Parameters</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Duration (min) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      required
                      placeholder="e.g., 12.5"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Max Speed (mph)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.maxSpeed}
                      onChange={(e) => setFormData({ ...formData, maxSpeed: e.target.value })}
                      placeholder="e.g., 4.2"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Max Incline (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.maxIncline}
                      onChange={(e) => setFormData({ ...formData, maxIncline: e.target.value })}
                      placeholder="e.g., 10"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Heart Rate Data */}
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-3">Heart Rate Data</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Pre-Exercise HR *</label>
                    <input
                      type="number"
                      value={formData.preHeartRate}
                      onChange={(e) => setFormData({ ...formData, preHeartRate: e.target.value })}
                      required
                      placeholder="bpm"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Max HR *</label>
                    <input
                      type="number"
                      value={formData.maxHeartRate}
                      onChange={(e) => setFormData({ ...formData, maxHeartRate: e.target.value })}
                      required
                      placeholder="bpm"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Recovery HR (1 min)</label>
                    <input
                      type="number"
                      value={formData.recoveryHeartRate}
                      onChange={(e) => setFormData({ ...formData, recoveryHeartRate: e.target.value })}
                      placeholder="bpm"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/30 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Blood Pressure */}
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-3">Blood Pressure</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Pre BP Sys</label>
                    <input
                      type="number"
                      value={formData.preBpSystolic}
                      onChange={(e) => setFormData({ ...formData, preBpSystolic: e.target.value })}
                      placeholder="mmHg"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Pre BP Dia</label>
                    <input
                      type="number"
                      value={formData.preBpDiastolic}
                      onChange={(e) => setFormData({ ...formData, preBpDiastolic: e.target.value })}
                      placeholder="mmHg"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Peak BP Sys</label>
                    <input
                      type="number"
                      value={formData.peakBpSystolic}
                      onChange={(e) => setFormData({ ...formData, peakBpSystolic: e.target.value })}
                      placeholder="mmHg"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Peak BP Dia</label>
                    <input
                      type="number"
                      value={formData.peakBpDiastolic}
                      onChange={(e) => setFormData({ ...formData, peakBpDiastolic: e.target.value })}
                      placeholder="mmHg"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">METs</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.mets}
                      onChange={(e) => setFormData({ ...formData, mets: e.target.value })}
                      placeholder="e.g., 10.5"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">VO2 Max (mL/kg/min)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.vo2Max}
                      onChange={(e) => setFormData({ ...formData, vo2Max: e.target.value })}
                      placeholder="e.g., 35.2"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/30 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">Clinical Observations</h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">TechniCAIn/PhysiCAIn</label>
                    <input
                      type="text"
                      value={formData.techniCAInName}
                      onChange={(e) => setFormData({ ...formData, techniCAInName: e.target.value })}
                      placeholder="e.g., Dr. John Smith"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Facility</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Memorial Hospital"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 outline-none"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2 text-gray-300">Symptoms During Test</label>
                  <textarea
                    value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    rows={2}
                    placeholder="e.g., Mild chest pressure at peak, resolved with rest..."
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 outline-none resize-none"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2 text-gray-300">EKG Findings</label>
                  <textarea
                    value={formData.ekgFindings}
                    onChange={(e) => setFormData({ ...formData, ekgFindings: e.target.value })}
                    rows={2}
                    placeholder="e.g., ST segment changes, arrhythmias, etc..."
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Additional Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Any other observations..."
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
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
            </form>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
