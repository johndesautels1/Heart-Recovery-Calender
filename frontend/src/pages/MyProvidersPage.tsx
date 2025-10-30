import React, { useState, useEffect } from 'react';
import { GlassCard, Button } from '../components/ui';
import { Stethoscope, Phone, Mail, MapPin, Calendar, Plus, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Provider, CreateProviderInput } from '../types';
import { toast } from 'sonner';

export function MyProvidersPage() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<CreateProviderInput>({
    name: '',
    specialty: '',
    phone: '',
    email: '',
    address: '',
    nextAppointment: '',
    notes: '',
    isPrimary: false,
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await api.getProviders();
      setProviders(data);
    } catch (error: any) {
      console.error('Error loading providers:', error);
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProvider = () => {
    setEditingProvider(null);
    setFormData({
      name: '',
      specialty: '',
      phone: '',
      email: '',
      address: '',
      nextAppointment: '',
      notes: '',
      isPrimary: false,
    });
    setShowModal(true);
  };

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      specialty: provider.specialty || '',
      phone: provider.phone || '',
      email: provider.email || '',
      address: provider.address || '',
      nextAppointment: provider.nextAppointment ? provider.nextAppointment.split('T')[0] : '',
      notes: provider.notes || '',
      isPrimary: provider.isPrimary,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Provider name is required');
      return;
    }

    try {
      if (editingProvider) {
        await api.updateProvider(editingProvider.id, formData);
        toast.success('Provider updated successfully');
      } else {
        await api.addProvider(formData);
        toast.success('Provider added successfully');
      }

      setShowModal(false);
      loadProviders();
    } catch (error: any) {
      console.error('Error saving provider:', error);
      toast.error(error.response?.data?.error || 'Failed to save provider');
    }
  };

  const handleDeleteProvider = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    try {
      await api.deleteProvider(id);
      toast.success('Provider deleted successfully');
      loadProviders();
    } catch (error: any) {
      console.error('Error deleting provider:', error);
      toast.error('Failed to delete provider');
    }
  };

  const handleScheduleAppointment = (provider: Provider) => {
    toast.info(`Opening calendar to schedule appointment with ${provider.name}`);
    // Navigate to calendar with provider pre-selected
    window.location.href = '/calendar?action=schedule&provider=' + provider.id;
  };

  const handleMessageProvider = (provider: Provider) => {
    if (provider.email) {
      window.location.href = `mailto:${provider.email}`;
    } else {
      toast.error('No email address available for this provider');
    }
  };

  const handleCallProvider = (provider: Provider) => {
    if (provider.phone) {
      window.location.href = `tel:${provider.phone}`;
    } else {
      toast.error('No phone number available for this provider');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>My Providers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Manage your healthcare providers and contact information
          </p>
        </div>
        <Button
          onClick={handleAddProvider}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <GlassCard key={provider.id}>
            <div className="p-6">
              {/* Provider Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <Stethoscope className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--ink-bright)' }}>
                      {provider.name}
                    </h3>
                    {provider.specialty && (
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        {provider.specialty}
                      </p>
                    )}
                    {provider.isPrimary && (
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
                        Primary
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Provider Details */}
              <div className="space-y-3 mb-4">
                {provider.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                    <a
                      href={`tel:${provider.phone}`}
                      className="text-sm hover:underline"
                      style={{ color: 'var(--ink)' }}
                    >
                      {provider.phone}
                    </a>
                  </div>
                )}
                {provider.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                    <a
                      href={`mailto:${provider.email}`}
                      className="text-sm hover:underline"
                      style={{ color: 'var(--ink)' }}
                    >
                      {provider.email}
                    </a>
                  </div>
                )}
                {provider.address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 mt-0.5" style={{ color: 'var(--accent)' }} />
                    <span className="text-sm" style={{ color: 'var(--ink)' }}>
                      {provider.address}
                    </span>
                  </div>
                )}
                {provider.nextAppointment && (
                  <div className="flex items-center space-x-2 pt-2 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <Calendar className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                    <div>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>Next Appointment</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--ink-bright)' }}>
                        {new Date(provider.nextAppointment).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <Button
                  onClick={() => handleEditProvider(provider)}
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDeleteProvider(provider.id, provider.name)}
                  variant="secondary"
                  className="flex items-center justify-center px-3"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Empty State */}
      {providers.length === 0 && (
        <GlassCard>
          <div className="p-12 text-center">
            <Stethoscope className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--muted)' }} />
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
              No Providers Yet
            </h3>
            <p className="mb-6" style={{ color: 'var(--muted)' }}>
              Add your healthcare providers to keep track of their contact information and appointments.
            </p>
            <Button
              onClick={handleAddProvider}
              variant="primary"
              className="flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Add Your First Provider
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Quick Actions Card */}
      {providers.length > 0 && (
        <GlassCard className="mt-6">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ink-bright)' }}>
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => providers[0] && handleScheduleAppointment(providers[0])}
                className="p-4 rounded-lg transition-all hover:scale-105"
                style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)' }}
              >
                <Calendar className="h-6 w-6 mb-2" style={{ color: 'var(--accent)' }} />
                <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                  Schedule Appointment
                </p>
              </button>
              <button
                onClick={() => providers[0] && handleMessageProvider(providers[0])}
                className="p-4 rounded-lg transition-all hover:scale-105"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
              >
                <Mail className="h-6 w-6 mb-2" style={{ color: '#22c55e' }} />
                <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                  Message Provider
                </p>
              </button>
              <button
                onClick={() => providers[0] && handleCallProvider(providers[0])}
                className="p-4 rounded-lg transition-all hover:scale-105"
                style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}
              >
                <Phone className="h-6 w-6 mb-2" style={{ color: '#fbbf24' }} />
                <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                  Call Provider
                </p>
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Add/Edit Provider Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <GlassCard className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                  {editingProvider ? 'Edit Provider' : 'Add Provider'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-opacity-20 transition-all"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <X className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Specialty
                  </label>
                  <input
                    type="text"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Next Appointment
                  </label>
                  <input
                    type="date"
                    value={formData.nextAppointment}
                    onChange={(e) => setFormData({ ...formData, nextAppointment: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={formData.isPrimary}
                    onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isPrimary" className="text-sm" style={{ color: 'var(--ink)' }}>
                    Set as primary provider
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowModal(false)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                  >
                    {editingProvider ? 'Update' : 'Add'} Provider
                  </Button>
                </div>
              </form>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
