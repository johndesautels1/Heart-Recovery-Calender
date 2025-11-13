import React, { useState, useEffect } from 'react';
import { GlassCard, Button } from '../components/ui';
import { Stethoscope, Phone, Mail, MapPin, Calendar, Plus, Edit, Trash2, X, CalendarPlus, CalendarCheck, QrCode, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Provider, CreateProviderInput, ProviderType, PreferredContactMethod, PROVIDER_TYPE_LABELS, PROVIDER_TYPE_ICONS, CONTACT_METHOD_LABELS } from '../types';
import { toast } from 'sonner';
import { QRScanner } from '../components/QRScanner';
import { QRGenerator } from '../components/QRGenerator';
import { useTranslation } from 'react-i18next';

export function MyProvidersPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<CreateProviderInput>({
    name: '',
    speCAIlty: '',
    providerType: undefined,
    phone: '',
    email: '',
    address: '',
    nextAppointment: '',
    notes: '',
    isPrimary: false,
    officeHours: '',
    faxNumber: '',
    patientPortalUrl: '',
    preferredContactMethod: undefined,
    acceptedInsurance: '',
    lastVisitDate: '',
    isEmergencyContact: false,
    pharmacyLicenseNumber: '',
  });
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [qrTitle, setQrTitle] = useState('');

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
      speCAIlty: '',
      providerType: undefined,
      phone: '',
      email: '',
      address: '',
      nextAppointment: '',
      notes: '',
      isPrimary: false,
      officeHours: '',
      faxNumber: '',
      patientPortalUrl: '',
      preferredContactMethod: undefined,
      acceptedInsurance: '',
      lastVisitDate: '',
      isEmergencyContact: false,
      pharmacyLicenseNumber: '',
    });
    setShowModal(true);
  };

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      speCAIlty: provider.speCAIlty || '',
      providerType: provider.providerType,
      phone: provider.phone || '',
      email: provider.email || '',
      address: provider.address || '',
      nextAppointment: provider.nextAppointment ? provider.nextAppointment.split('T')[0] : '',
      notes: provider.notes || '',
      isPrimary: provider.isPrimary,
      officeHours: provider.officeHours || '',
      faxNumber: provider.faxNumber || '',
      patientPortalUrl: provider.patientPortalUrl || '',
      preferredContactMethod: provider.preferredContactMethod,
      acceptedInsurance: provider.acceptedInsurance || '',
      lastVisitDate: provider.lastVisitDate ? provider.lastVisitDate.split('T')[0] : '',
      isEmergencyContact: provider.isEmergencyContact,
      pharmacyLicenseNumber: provider.pharmacyLicenseNumber || '',
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

  const handleQRScan = (data: string) => {
    try {
      const parsed = JSON.parse(data);

      // Validate and populate form
      setFormData({
        name: parsed.name || '',
        speCAIlty: parsed.speCAIlty || '',
        providerType: parsed.providerType,
        phone: parsed.phone || '',
        email: parsed.email || '',
        address: parsed.address || '',
        nextAppointment: parsed.nextAppointment ? parsed.nextAppointment.split('T')[0] : '',
        notes: parsed.notes || '',
        isPrimary: parsed.isPrimary || false,
        officeHours: parsed.officeHours || '',
        faxNumber: parsed.faxNumber || '',
        patientPortalUrl: parsed.patientPortalUrl || '',
        preferredContactMethod: parsed.preferredContactMethod,
        acceptedInsurance: parsed.acceptedInsurance || '',
        lastVisitDate: parsed.lastVisitDate ? parsed.lastVisitDate.split('T')[0] : '',
        isEmergencyContact: parsed.isEmergencyContact || false,
        pharmacyLicenseNumber: parsed.pharmacyLicenseNumber || '',
      });

      setShowQRScanner(false);
      toast.success('Provider data imported from QR code!');
    } catch (error) {
      toast.error('Invalid QR code data');
      console.error('QR parse error:', error);
    }
  };

  const handleGenerateQR = (provider: Provider) => {
    // Only include essential fields for sharing, exclude internal IDs and timestamps
    const essentialData = {
      name: provider.name,
      providerType: provider.providerType,
      speCAIlty: provider.speCAIlty,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      officeHours: provider.officeHours,
      faxNumber: provider.faxNumber,
      patientPortalUrl: provider.patientPortalUrl,
      preferredContactMethod: provider.preferredContactMethod,
      acceptedInsurance: provider.acceptedInsurance,
      isPrimary: provider.isPrimary,
      isEmergencyContact: provider.isEmergencyContact,
      notes: provider.notes,
    };
    setQrData(essentialData);
    setQrTitle(`${provider.name} - Provider Info`);
    setShowQRGenerator(true);
  };

  const handleGenerateBulkQR = () => {
    // Filter each provider to only essential fields
    const essentialProvidersData = providers.map(provider => ({
      name: provider.name,
      providerType: provider.providerType,
      speCAIlty: provider.speCAIlty,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      officeHours: provider.officeHours,
      faxNumber: provider.faxNumber,
      patientPortalUrl: provider.patientPortalUrl,
      preferredContactMethod: provider.preferredContactMethod,
      acceptedInsurance: provider.acceptedInsurance,
      isPrimary: provider.isPrimary,
      isEmergencyContact: provider.isEmergencyContact,
      notes: provider.notes,
    }));
    setQrData(essentialProvidersData);
    setQrTitle('All Providers');
    setShowQRGenerator(true);
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
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>{t('providers.title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {t('providers.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          {providers.length > 0 && (
            <Button
              onClick={handleGenerateBulkQR}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <QrCode className="h-4 w-4" />
              {t('providers.exportAllAsQR')}
            </Button>
          )}
          <Button
            onClick={handleAddProvider}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('providers.addProvider')}
          </Button>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <GlassCard key={provider.id}>
            <div className="p-6">
              {/* Provider Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl">
                    {provider.providerType ? PROVIDER_TYPE_ICONS[provider.providerType] : <Stethoscope className="h-6 w-6 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--ink-bright)' }}>
                      {provider.name}
                    </h3>
                    {provider.providerType && (
                      <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                        {PROVIDER_TYPE_LABELS[provider.providerType]}
                      </p>
                    )}
                    {provider.speCAIlty && (
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        {provider.speCAIlty}
                      </p>
                    )}
                    <div className="flex gap-2 mt-1">
                      {provider.isPrimary && (
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
                          {t('providers.primary')}
                        </span>
                      )}
                      {provider.isEmergencyContact && (
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                          {t('providers.emergencyContact')}
                        </span>
                      )}
                    </div>
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

              {/* Calendar Widgets */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => handleScheduleAppointment(provider)}
                  className="flex-1 p-2 rounded-lg transition-all hover:scale-105 flex items-center justify-center gap-2 text-xs font-medium"
                  style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)', color: 'var(--accent)' }}
                  title="Add to Calendar"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Add to Calendar
                </button>
                <button
                  onClick={() => window.location.href = '/calendar'}
                  className="flex-1 p-2 rounded-lg transition-all hover:scale-105 flex items-center justify-center gap-2 text-xs font-medium"
                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                  title="Go to Calendar"
                >
                  <CalendarCheck className="h-4 w-4" />
                  Go to Calendar
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <Button
                  onClick={() => handleEditProvider(provider)}
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {t('common.edit')}
                </Button>
                <Button
                  onClick={() => handleGenerateQR(provider)}
                  variant="secondary"
                  className="flex items-center justify-center px-3"
                  title="Export as QR Code"
                >
                  <QrCode className="h-4 w-4" />
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
                  {editingProvider ? t('providers.editProvider') : t('providers.addProvider')}
                </h2>
                <div className="flex gap-2">
                  {!editingProvider && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setShowQRScanner(true);
                      }}
                      className="p-2 rounded-lg hover:bg-opacity-20 transition-all"
                      style={{ backgroundColor: 'rgba(96, 165, 250, 0.2)' }}
                      title="Scan QR Code"
                    >
                      <Camera className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                    </button>
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg hover:bg-opacity-20 transition-all"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <X className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                  </button>
                </div>
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
                    Provider Type
                  </label>
                  <select
                    value={formData.providerType || ''}
                    onChange={(e) => setFormData({ ...formData, providerType: e.target.value as ProviderType || undefined })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'var(--ink)'
                    }}
                  >
                    <option value="" style={{ backgroundColor: '#1a1a1a', color: '#e0e0e0' }}>Select provider type...</option>
                    {Object.entries(PROVIDER_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value} style={{ backgroundColor: '#1a1a1a', color: '#e0e0e0' }}>
                        {PROVIDER_TYPE_ICONS[value as ProviderType]} {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    SpeCAIlty / Additional Info
                  </label>
                  <input
                    type="text"
                    value={formData.speCAIlty}
                    onChange={(e) => setFormData({ ...formData, speCAIlty: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                    placeholder="e.g., Board Certified, SubspeCAIlty"
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
                    Office Hours
                  </label>
                  <input
                    type="text"
                    value={formData.officeHours}
                    onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                    placeholder="e.g., Mon-Fri 9am-5pm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Fax Number
                  </label>
                  <input
                    type="tel"
                    value={formData.faxNumber}
                    onChange={(e) => setFormData({ ...formData, faxNumber: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Patient Portal URL
                  </label>
                  <input
                    type="url"
                    value={formData.patientPortalUrl}
                    onChange={(e) => setFormData({ ...formData, patientPortalUrl: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Preferred Contact Method
                  </label>
                  <select
                    value={formData.preferredContactMethod || ''}
                    onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value as PreferredContactMethod || undefined })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'var(--ink)'
                    }}
                  >
                    <option value="" style={{ backgroundColor: '#1a1a1a', color: '#e0e0e0' }}>Select contact method...</option>
                    {Object.entries(CONTACT_METHOD_LABELS).map(([value, label]) => (
                      <option key={value} value={value} style={{ backgroundColor: '#1a1a1a', color: '#e0e0e0' }}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Accepted Insurance
                  </label>
                  <textarea
                    value={formData.acceptedInsurance}
                    onChange={(e) => setFormData({ ...formData, acceptedInsurance: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                    placeholder="e.g., Medicare, Blue Cross, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    Last Visit Date
                  </label>
                  <input
                    type="date"
                    value={formData.lastVisitDate}
                    onChange={(e) => setFormData({ ...formData, lastVisitDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                  />
                </div>

                {formData.providerType === 'pharmacy' && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                      Pharmacy License Number
                    </label>
                    <input
                      type="text"
                      value={formData.pharmacyLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, pharmacyLicenseNumber: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--ink)' }}
                      placeholder="License/DEA number"
                    />
                  </div>
                )}

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

                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={formData.isPrimary}
                      onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                      className="mr-2"
                    />
                    <label htmlFor="isPrimary" className="text-sm" style={{ color: 'var(--ink)' }}>
                      Primary provider
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isEmergencyContact"
                      checked={formData.isEmergencyContact}
                      onChange={(e) => setFormData({ ...formData, isEmergencyContact: e.target.checked })}
                      className="mr-2"
                    />
                    <label htmlFor="isEmergencyContact" className="text-sm" style={{ color: 'var(--ink)' }}>
                      Emergency contact
                    </label>
                  </div>
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

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => {
            setShowQRScanner(false);
            setShowModal(true);
          }}
        />
      )}

      {/* QR Generator Modal */}
      {showQRGenerator && qrData && (
        <QRGenerator
          data={qrData}
          title={qrTitle}
          onClose={() => setShowQRGenerator(false)}
        />
      )}
    </div>
  );
}
