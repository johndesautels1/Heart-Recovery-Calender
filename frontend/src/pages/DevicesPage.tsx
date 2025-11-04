import React, { useState, useEffect } from 'react';
import { GlassCard, Button, Input } from '../components/ui';
import { Smartphone, Watch, Heart, Activity, RefreshCw, Trash2, Settings, CheckCircle, XCircle, AlertCircle, Clock, Plus, Edit, QrCode, AlertTriangle, FileText, X, Save } from 'lucide-react';
import { api } from '../services/api';
import { DeviceConnection, DeviceSyncLog } from '../types';
import { toast } from 'sonner';
import { QRGenerator } from '../components/QRGenerator';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export function DevicesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'implants' | 'trackers'>('implants');
  const [devices, setDevices] = useState<DeviceConnection[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceConnection | null>(null);
  const [syncHistory, setSyncHistory] = useState<DeviceSyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState<number | null>(null);

  // Device Integration state
  const [patientId, setPatientId] = useState<number | null>(null);
  const [polarDeviceId, setPolarDeviceId] = useState('');
  const [samsungHealthAccount, setSamsungHealthAccount] = useState('');
  const [preferredDataSource, setPreferredDataSource] = useState('');
  const [isSavingIntegration, setIsSavingIntegration] = useState(false);

  // Medical Implants state
  const [implants, setImplants] = useState<any[]>([]);
  const [showImplantModal, setShowImplantModal] = useState(false);
  const [editingImplant, setEditingImplant] = useState<any | null>(null);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [qrTitle, setQrTitle] = useState('');
  const [implantForm, setImplantForm] = useState({
    deviceType: '',
    manufacturer: '',
    modelNumber: '',
    serialNumber: '',
    implantDate: '',
    implantingSurgeon: '',
    implantingHospital: '',
    warrantyExpiration: '',
    notes: '',
    isMRISafe: false,
    isEmergencyCritical: true,
  });

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadSyncHistory(selectedDevice.id);
    }
  }, [selectedDevice]);

  useEffect(() => {
    loadPatientData();
  }, [user]);

  const loadPatientData = async () => {
    try {
      if (!user?.id) return;

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

      if (patientsResponse.data && patientsResponse.data.length > 0) {
        const patientData = patientsResponse.data[0];
        setPatientId(patientData.id);
        setPolarDeviceId(patientData.polarDeviceId || '');
        setSamsungHealthAccount(patientData.samsungHealthAccount || '');
        setPreferredDataSource(patientData.preferredDataSource || '');
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  const saveDeviceIntegration = async () => {
    try {
      if (!patientId) {
        toast.error('No patient profile found. Please complete your profile first.');
        return;
      }

      setIsSavingIntegration(true);

      const response = await fetch(`http://localhost:4000/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          polarDeviceId,
          samsungHealthAccount,
          preferredDataSource
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save device integration settings');
      }

      toast.success('Device integration settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving device integration:', error);
      toast.error('Failed to save device integration settings');
    } finally {
      setIsSavingIntegration(false);
    }
  };

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDevices();
      setDevices(data);
    } catch (error: any) {
      console.error('Error loading devices:', error);
      toast.error(t('devices.trackers.messages.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncHistory = async (deviceId: number) => {
    try {
      const history = await api.getSyncHistory(deviceId, 10);
      setSyncHistory(history);
    } catch (error: any) {
      console.error('Error loading sync history:', error);
    }
  };

  const handleConnectStrava = async () => {
    try {
      const { authUrl } = await api.initiateStravaAuth();
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error initiating Strava auth:', error);
      toast.error(t('devices.trackers.messages.connectStravaFailed'));
    }
  };

  const handleConnectPolar = async () => {
    try {
      const { authUrl } = await api.initiatePolarAuth();
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error initiating Polar auth:', error);
      toast.error(t('devices.trackers.messages.connectPolarFailed'));
    }
  };

  const handleConnectSamsung = async () => {
    try {
      const { authUrl } = await api.initiateSamsungAuth();
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error initiating Samsung auth:', error);
      toast.error(t('devices.trackers.messages.connectSamsungFailed'));
    }
  };

  const handleSync = async (device: DeviceConnection) => {
    try {
      setIsSyncing(device.id);
      await api.triggerDeviceSync(device.id);
      toast.success(t('devices.trackers.messages.syncStarted'));
      // Reload devices to update last sync time
      setTimeout(loadDevices, 2000);
    } catch (error: any) {
      console.error('Error syncing device:', error);
      toast.error(error.response?.data?.error || t('devices.trackers.messages.syncFailed'));
    } finally {
      setIsSyncing(null);
    }
  };

  const handleDisconnect = async (device: DeviceConnection) => {
    if (!confirm(`${t('devices.trackers.disconnectConfirm')} ${device.deviceName}?`)) {
      return;
    }

    try {
      await api.deleteDevice(device.id);
      toast.success(t('devices.trackers.messages.disconnected'));
      loadDevices();
      if (selectedDevice?.id === device.id) {
        setSelectedDevice(null);
      }
    } catch (error: any) {
      console.error('Error disconnecting device:', error);
      toast.error(t('devices.trackers.messages.disconnectFailed'));
    }
  };

  const handleToggleSetting = async (device: DeviceConnection, setting: keyof DeviceConnection, value: boolean) => {
    try {
      const updatedDevice = await api.updateDeviceSettings(device.id, { [setting]: value });
      setDevices(devices.map(d => d.id === device.id ? updatedDevice : d));
      if (selectedDevice?.id === device.id) {
        setSelectedDevice(updatedDevice);
      }
      toast.success(t('devices.trackers.messages.settingsUpdated'));
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error(t('devices.trackers.messages.settingsUpdateFailed'));
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'strava':
        return <Activity className="h-8 w-8 text-orange-500" />;
      case 'polar':
        return <Heart className="h-8 w-8 text-red-500" />;
      case 'samsung_health':
        return <Watch className="h-8 w-8 text-blue-500" />;
      default:
        return <Smartphone className="h-8 w-8 text-purple-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>{t('devices.trackers.status.active')}</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
            <XCircle className="h-4 w-4" />
            <span>{t('devices.trackers.status.error')}</span>
          </div>
        );
      case 'disconnected':
        return (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{t('devices.trackers.status.disconnected')}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('devices.trackers.time.never');
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('devices.trackers.time.justNow');
    if (diffMins < 60) return `${diffMins} ${t('devices.trackers.time.minAgo')}`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ${t('devices.trackers.time.hoursAgo')}`;
    return date.toLocaleDateString();
  };

  // Medical Implants handlers
  const loadImplants = () => {
    // TODO: Load from localStorage or API
    const saved = localStorage.getItem('medicalImplants');
    if (saved) {
      setImplants(JSON.parse(saved));
    }
  };

  const saveImplants = (newImplants: any[]) => {
    localStorage.setItem('medicalImplants', JSON.stringify(newImplants));
    setImplants(newImplants);
  };

  const handleAddImplant = () => {
    setEditingImplant(null);
    setImplantForm({
      deviceType: '',
      manufacturer: '',
      modelNumber: '',
      serialNumber: '',
      implantDate: '',
      implantingSurgeon: '',
      implantingHospital: '',
      warrantyExpiration: '',
      notes: '',
      isMRISafe: false,
      isEmergencyCritical: true,
    });
    setShowImplantModal(true);
  };

  const handleEditImplant = (implant: any) => {
    setEditingImplant(implant);
    setImplantForm(implant);
    setShowImplantModal(true);
  };

  const handleSaveImplant = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingImplant) {
      // Update existing
      const updated = implants.map(imp =>
        imp.id === editingImplant.id ? { ...implantForm, id: imp.id } : imp
      );
      saveImplants(updated);
      toast.success(t('devices.implants.messages.updatedSuccess'));
    } else {
      // Add new
      const newImplant = { ...implantForm, id: Date.now() };
      saveImplants([...implants, newImplant]);
      toast.success(t('devices.implants.messages.addedSuccess'));
    }

    setShowImplantModal(false);
  };

  const handleDeleteImplant = (id: number, name: string) => {
    if (!confirm(`${t('devices.implants.deleteConfirm')} ${name}?`)) return;

    const filtered = implants.filter(imp => imp.id !== id);
    saveImplants(filtered);
    toast.success(t('devices.implants.messages.deletedSuccess'));
  };

  const handleGenerateImplantQR = (implant: any) => {
    const essentialData = {
      deviceType: implant.deviceType,
      manufacturer: implant.manufacturer,
      modelNumber: implant.modelNumber,
      serialNumber: implant.serialNumber,
      implantDate: implant.implantDate,
      implantingSurgeon: implant.implantingSurgeon,
      implantingHospital: implant.implantingHospital,
      isMRISafe: implant.isMRISafe,
      isEmergencyCritical: implant.isEmergencyCritical,
      notes: implant.notes,
    };
    setQrData(essentialData);
    setQrTitle(`${implant.deviceType} - ${implant.manufacturer} ${implant.modelNumber}`);
    setShowQRGenerator(true);
  };

  const handleGenerateAllImplantsQR = () => {
    const essentialData = implants.map(implant => ({
      deviceType: implant.deviceType,
      manufacturer: implant.manufacturer,
      modelNumber: implant.modelNumber,
      serialNumber: implant.serialNumber,
      implantDate: implant.implantDate,
      implantingSurgeon: implant.implantingSurgeon,
      implantingHospital: implant.implantingHospital,
      isMRISafe: implant.isMRISafe,
      isEmergencyCritical: implant.isEmergencyCritical,
      notes: implant.notes,
    }));
    setQrData(essentialData);
    setQrTitle('All Medical Implants - Emergency Info');
    setShowQRGenerator(true);
  };

  useEffect(() => {
    loadImplants();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>{t('devices.title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {activeTab === 'implants'
              ? t('devices.subtitleImplants')
              : t('devices.subtitleTrackers')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <button
          onClick={() => setActiveTab('implants')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'implants'
              ? 'border-red-500 text-red-400'
              : 'border-transparent hover:border-gray-500'
          }`}
          style={{ color: activeTab === 'implants' ? '#f87171' : 'var(--muted)' }}
        >
          <AlertTriangle className="h-4 w-4" />
          {t('devices.tabs.medicalImplants')}
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
            {t('devices.tabs.emergency')}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('trackers')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'trackers'
              ? 'border-blue-500'
              : 'border-transparent hover:border-gray-500'
          }`}
          style={{ color: activeTab === 'trackers' ? 'var(--accent)' : 'var(--muted)' }}
        >
          <Activity className="h-4 w-4" />
          {t('devices.tabs.fitnessTrackers')}
        </button>
      </div>

      {/* Medical Implants Tab Content */}
      {activeTab === 'implants' && (
        <div>
          {/* Header with Add button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <h2 className="text-2xl font-bold text-red-400">
                {t('devices.implants.title')}
              </h2>
            </div>
            <div className="flex gap-2">
              {implants.length > 0 && (
                <Button
                  onClick={handleGenerateAllImplantsQR}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  {t('devices.implants.exportAllQR')}
                </Button>
              )}
              <Button
                onClick={handleAddImplant}
                variant="primary"
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <Plus className="h-4 w-4" />
                {t('devices.implants.addImplant')}
              </Button>
            </div>
          </div>

          {/* Medical Implants Grid */}
          {implants.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {implants.map((implant) => (
                <GlassCard key={implant.id} className="border-2 border-red-500/30">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-red-500/20">
                          <Heart className="h-8 w-8 text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-red-400">
                            {implant.deviceType}
                          </h3>
                          <p className="text-sm" style={{ color: 'var(--muted)' }}>
                            {implant.manufacturer} {implant.modelNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleGenerateImplantQR(implant)}
                          variant="secondary"
                          className="px-3"
                          title={t('devices.implants.exportQR')}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleEditImplant(implant)}
                          variant="secondary"
                          className="px-3"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteImplant(implant.id, implant.deviceType)}
                          variant="danger"
                          className="px-3"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Implant Details Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{t('devices.implants.labels.serialNumber')}</p>
                        <p className="font-mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          {implant.serialNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{t('devices.implants.labels.implantDate')}</p>
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>
                          {implant.implantDate ? new Date(implant.implantDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{t('devices.implants.labels.surgeon')}</p>
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>
                          {implant.implantingSurgeon || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{t('devices.implants.labels.hospital')}</p>
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>
                          {implant.implantingHospital || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Safety Badges */}
                    <div className="flex flex-wrap gap-2">
                      {implant.isMRISafe ? (
                        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {t('devices.implants.badges.mriSafe')}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {t('devices.implants.badges.notMriSafe')}
                        </span>
                      )}
                      {implant.isEmergencyCritical && (
                        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t('devices.implants.badges.emergencyCritical')}
                        </span>
                      )}
                    </div>

                    {implant.notes && (
                      <div className="mt-4 p-3 rounded-lg bg-gray-500/10">
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{t('devices.implants.labels.notes')}</p>
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>{implant.notes}</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard className="border-2 border-red-500/30">
              <div className="p-12 text-center">
                <Heart className="h-16 w-16 mx-auto mb-4 text-red-400" />
                <h3 className="text-xl font-bold mb-2 text-red-400">
                  {t('devices.implants.noImplants')}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  {t('devices.implants.noImplantsMessage')}
                </p>
                <Button
                  onClick={handleAddImplant}
                  variant="primary"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('devices.implants.addFirstImplant')}
                </Button>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Fitness Trackers Tab Content */}
      {activeTab === 'trackers' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Connect New Device Cards */}
            <GlassCard className="hover:shadow-lg transition-shadow border-2 border-orange-500/30">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-orange-500/20">
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--ink-bright)' }}>
                  {t('devices.trackers.devices.strava.name')}
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {t('devices.trackers.devices.strava.description')}
                </p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--ink)' }}>
              {t('devices.trackers.devices.strava.details')}
            </p>
            <Button onClick={handleConnectStrava} variant="primary" className="w-full bg-orange-500 hover:bg-orange-600">
              <Activity className="h-4 w-4 mr-2" />
              {t('devices.trackers.devices.strava.connect')}
            </Button>
          </div>
        </GlassCard>

        <GlassCard className="hover:shadow-lg transition-shadow">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-red-500/20">
                <Heart className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--ink-bright)' }}>
                  {t('devices.trackers.devices.polar.name')}
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {t('devices.trackers.devices.polar.description')}
                </p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--ink)' }}>
              {t('devices.trackers.devices.polar.details')}
            </p>
            <Button onClick={handleConnectPolar} variant="primary" className="w-full">
              <Heart className="h-4 w-4 mr-2" />
              {t('devices.trackers.devices.polar.connect')}
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Connected Devices */}
      {devices.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink)' }}>
            {t('devices.trackers.connectedDevices')}
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {devices.map((device) => (
              <GlassCard key={device.id}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold" style={{ color: 'var(--ink-bright)' }}>
                          {device.deviceName}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>
                          {t('devices.trackers.lastSynced')}: {formatDate(device.lastSyncedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(device.syncStatus)}
                    </div>
                  </div>

                  {device.syncError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-red-400">{device.syncError}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {device.syncExercises && (
                      <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                        <Activity className="h-3 w-3 inline mr-1" />
                        {t('devices.trackers.dataTypes.exercise')}
                      </span>
                    )}
                    {device.syncHeartRate && (
                      <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                        <Heart className="h-3 w-3 inline mr-1" />
                        {t('devices.trackers.dataTypes.heartRate')}
                      </span>
                    )}
                    {device.syncSteps && (
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                        {t('devices.trackers.dataTypes.steps')}
                      </span>
                    )}
                    {device.syncCalories && (
                      <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                        {t('devices.trackers.dataTypes.calories')}
                      </span>
                    )}
                  </div>

                  {showSettings === device.id ? (
                    <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <h4 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>{t('devices.trackers.settings.title')}</h4>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>{t('devices.trackers.settings.autoSync')}</span>
                          <input
                            type="checkbox"
                            checked={device.autoSync}
                            onChange={(e) => handleToggleSetting(device, 'autoSync', e.target.checked)}
                            className="toggle"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>{t('devices.trackers.settings.exerciseSessions')}</span>
                          <input
                            type="checkbox"
                            checked={device.syncExercises}
                            onChange={(e) => handleToggleSetting(device, 'syncExercises', e.target.checked)}
                            className="toggle"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>{t('devices.trackers.dataTypes.heartRate')}</span>
                          <input
                            type="checkbox"
                            checked={device.syncHeartRate}
                            onChange={(e) => handleToggleSetting(device, 'syncHeartRate', e.target.checked)}
                            className="toggle"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>{t('devices.trackers.dataTypes.steps')}</span>
                          <input
                            type="checkbox"
                            checked={device.syncSteps}
                            onChange={(e) => handleToggleSetting(device, 'syncSteps', e.target.checked)}
                            className="toggle"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>{t('devices.trackers.dataTypes.calories')}</span>
                          <input
                            type="checkbox"
                            checked={device.syncCalories}
                            onChange={(e) => handleToggleSetting(device, 'syncCalories', e.target.checked)}
                            className="toggle"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSync(device)}
                      loading={isSyncing === device.id}
                      variant="primary"
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('devices.trackers.syncNow')}
                    </Button>
                    <Button
                      onClick={() => setShowSettings(showSettings === device.id ? null : device.id)}
                      variant="secondary"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setSelectedDevice(selectedDevice?.id === device.id ? null : device)}
                      variant="secondary"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDisconnect(device)}
                      variant="danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Sync History */}
                  {selectedDevice?.id === device.id && syncHistory.length > 0 && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <h4 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>{t('devices.trackers.syncHistory.title')}</h4>
                      <div className="space-y-2">
                        {syncHistory.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                          >
                            <div className="flex items-center gap-3">
                              {log.status === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              ) : log.status === 'error' ? (
                                <XCircle className="h-4 w-4 text-red-400" />
                              ) : (
                                <Clock className="h-4 w-4 text-yellow-400" />
                              )}
                              <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                                  {log.syncType.charAt(0).toUpperCase() + log.syncType.slice(1)} {t('devices.trackers.syncHistory.sync')}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                                  {formatDate(log.startedAt)}
                                  {log.recordsCreated && ` • ${log.recordsCreated} ${t('devices.trackers.syncHistory.recordsCreated')}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              {log.dataType}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}

      {activeTab === 'trackers' && devices.length === 0 && (
            <GlassCard>
              <div className="p-12 text-center">
                <Smartphone className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--muted)' }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
                  {t('devices.trackers.noDevices')}
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {t('devices.trackers.noDevicesMessage')}
                </p>
              </div>
            </GlassCard>
          )}

          {/* Device Integration Section */}
          <div className="mt-8">
            <GlassCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
                      Device Integration Settings
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      Configure your device IDs and preferred data source for health tracking
                    </p>
                  </div>
                  <Button
                    onClick={saveDeviceIntegration}
                    disabled={isSavingIntegration}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSavingIntegration ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        Polar Device ID
                      </label>
                      <Input
                        value={polarDeviceId}
                        onChange={(e) => setPolarDeviceId(e.target.value)}
                        icon={<Smartphone className="h-5 w-5" />}
                        placeholder="Enter Polar heart monitor ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        Samsung Health Account
                      </label>
                      <Input
                        value={samsungHealthAccount}
                        onChange={(e) => setSamsungHealthAccount(e.target.value)}
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
                      value={preferredDataSource}
                      onChange={(e) => setPreferredDataSource(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 outline-none transition-all"
                      style={{ color: '#000000', fontWeight: '800' }}
                    >
                      <option value="">Select...</option>
                      <option value="polar">Polar Heart Monitor</option>
                      <option value="samsung">Samsung Galaxy Watch</option>
                      <option value="manual">Manual Entry</option>
                    </select>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* Medical Implant Modal */}
      {showImplantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <GlassCard className="border-2 border-red-500/30">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-red-400">
                    {editingImplant ? t('devices.implants.editImplant') : t('devices.implants.addImplant')}
                  </h2>
                  <button
                    onClick={() => setShowImplantModal(false)}
                    className="p-2 rounded-lg hover:bg-opacity-20 transition-all"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <X className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                  </button>
                </div>

                <form onSubmit={handleSaveImplant} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        {t('devices.implants.fields.deviceType')} *
                      </label>
                      <select
                        value={implantForm.deviceType}
                        onChange={(e) => setImplantForm({ ...implantForm, deviceType: e.target.value })}
                        required
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'rgba(30, 30, 30, 0.95)',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                        }}
                      >
                        <option value="" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>{t('devices.implants.placeholders.selectType')}</option>
                        <option value="Biological Valve" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>{t('devices.implants.deviceTypes.biologicalValve')}</option>
                        <option value="Mechanical Valve" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>{t('devices.implants.deviceTypes.mechanicalValve')}</option>
                        <option value="Pacemaker" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>{t('devices.implants.deviceTypes.pacemaker')}</option>
                        <option value="ICD (Defibrillator)" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>{t('devices.implants.deviceTypes.icd')}</option>
                        <option value="Stent" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>{t('devices.implants.deviceTypes.stent')}</option>
                        <option value="Heart Pump/LVAD" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>{t('devices.implants.deviceTypes.heartPump')}</option>
                        <option value="Other Cardiac Device" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>{t('devices.implants.deviceTypes.otherCardiac')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        {t('devices.implants.fields.manufacturer')} *
                      </label>
                      <input
                        type="text"
                        value={implantForm.manufacturer}
                        onChange={(e) => setImplantForm({ ...implantForm, manufacturer: e.target.value })}
                        required
                        placeholder={t('devices.implants.placeholders.manufacturerExample')}
                        className="w-full px-4 py-2 rounded-lg border placeholder-gray-400"
                        style={{
                          backgroundColor: 'rgba(30, 30, 30, 0.95)',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        {t('devices.implants.fields.modelNumber')} *
                      </label>
                      <input
                        type="text"
                        value={implantForm.modelNumber}
                        onChange={(e) => setImplantForm({ ...implantForm, modelNumber: e.target.value })}
                        required
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'rgba(30, 30, 30, 0.95)',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        {t('devices.implants.fields.serialNumber')} *
                      </label>
                      <input
                        type="text"
                        value={implantForm.serialNumber}
                        onChange={(e) => setImplantForm({ ...implantForm, serialNumber: e.target.value })}
                        required
                        className="w-full px-4 py-2 rounded-lg border font-mono"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          color: 'var(--ink)',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        {t('devices.implants.fields.implantDate')} *
                      </label>
                      <input
                        type="date"
                        value={implantForm.implantDate}
                        onChange={(e) => setImplantForm({ ...implantForm, implantDate: e.target.value })}
                        required
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'rgba(30, 30, 30, 0.95)',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        {t('devices.implants.fields.warrantyExpiration')}
                      </label>
                      <input
                        type="date"
                        value={implantForm.warrantyExpiration}
                        onChange={(e) => setImplantForm({ ...implantForm, warrantyExpiration: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'rgba(30, 30, 30, 0.95)',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        {t('devices.implants.fields.implantingSurgeon')}
                      </label>
                      <input
                        type="text"
                        value={implantForm.implantingSurgeon}
                        onChange={(e) => setImplantForm({ ...implantForm, implantingSurgeon: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'rgba(30, 30, 30, 0.95)',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        {t('devices.implants.fields.implantingHospital')}
                      </label>
                      <input
                        type="text"
                        value={implantForm.implantingHospital}
                        onChange={(e) => setImplantForm({ ...implantForm, implantingHospital: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'rgba(30, 30, 30, 0.95)',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                      {t('devices.implants.fields.notes')}
                    </label>
                    <textarea
                      value={implantForm.notes}
                      onChange={(e) => setImplantForm({ ...implantForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'var(--ink)',
                      }}
                    />
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={implantForm.isMRISafe}
                        onChange={(e) => setImplantForm({ ...implantForm, isMRISafe: e.target.checked })}
                        className="w-5 h-5"
                      />
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>{t('devices.implants.fields.isMRISafe')}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={implantForm.isEmergencyCritical}
                        onChange={(e) => setImplantForm({ ...implantForm, isEmergencyCritical: e.target.checked })}
                        className="w-5 h-5"
                      />
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>{t('devices.implants.fields.isEmergencyCritical')}</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" variant="primary" className="flex-1 bg-red-600 hover:bg-red-700">
                      {editingImplant ? t('devices.implants.updateImplant') : t('devices.implants.addImplant')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowImplantModal(false)}
                      variant="secondary"
                      className="flex-1"
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              </div>
            </GlassCard>
          </div>
        </div>
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
