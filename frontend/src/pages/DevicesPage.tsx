import React, { useState, useEffect } from 'react';
import { GlassCard, Button } from '../components/ui';
import { Smartphone, Watch, Heart, Activity, RefreshCw, Trash2, Settings, CheckCircle, XCircle, AlertCircle, Clock, Plus, Edit, QrCode, AlertTriangle, FileText, X } from 'lucide-react';
import { api } from '../services/api';
import { DeviceConnection, DeviceSyncLog } from '../types';
import { toast } from 'sonner';
import { QRGenerator } from '../components/QRGenerator';

export function DevicesPage() {
  const [activeTab, setActiveTab] = useState<'implants' | 'trackers'>('implants');
  const [devices, setDevices] = useState<DeviceConnection[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceConnection | null>(null);
  const [syncHistory, setSyncHistory] = useState<DeviceSyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState<number | null>(null);

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

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDevices();
      setDevices(data);
    } catch (error: any) {
      console.error('Error loading devices:', error);
      toast.error('Failed to load devices');
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
      toast.error('Failed to connect to Strava');
    }
  };

  const handleConnectPolar = async () => {
    try {
      const { authUrl } = await api.initiatePolarAuth();
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error initiating Polar auth:', error);
      toast.error('Failed to connect to Polar');
    }
  };

  const handleConnectSamsung = async () => {
    try {
      const { authUrl } = await api.initiateSamsungAuth();
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error initiating Samsung auth:', error);
      toast.error('Failed to connect to Samsung Health');
    }
  };

  const handleSync = async (device: DeviceConnection) => {
    try {
      setIsSyncing(device.id);
      await api.triggerDeviceSync(device.id);
      toast.success('Sync started successfully');
      // Reload devices to update last sync time
      setTimeout(loadDevices, 2000);
    } catch (error: any) {
      console.error('Error syncing device:', error);
      toast.error(error.response?.data?.error || 'Failed to sync device');
    } finally {
      setIsSyncing(null);
    }
  };

  const handleDisconnect = async (device: DeviceConnection) => {
    if (!confirm(`Are you sure you want to disconnect ${device.deviceName}?`)) {
      return;
    }

    try {
      await api.deleteDevice(device.id);
      toast.success('Device disconnected');
      loadDevices();
      if (selectedDevice?.id === device.id) {
        setSelectedDevice(null);
      }
    } catch (error: any) {
      console.error('Error disconnecting device:', error);
      toast.error('Failed to disconnect device');
    }
  };

  const handleToggleSetting = async (device: DeviceConnection, setting: keyof DeviceConnection, value: boolean) => {
    try {
      const updatedDevice = await api.updateDeviceSettings(device.id, { [setting]: value });
      setDevices(devices.map(d => d.id === device.id ? updatedDevice : d));
      if (selectedDevice?.id === device.id) {
        setSelectedDevice(updatedDevice);
      }
      toast.success('Settings updated');
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
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
            <span>Active</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
            <XCircle className="h-4 w-4" />
            <span>Error</span>
          </div>
        );
      case 'disconnected':
        return (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Disconnected</span>
          </div>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
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
      toast.success('Medical implant updated successfully');
    } else {
      // Add new
      const newImplant = { ...implantForm, id: Date.now() };
      saveImplants([...implants, newImplant]);
      toast.success('Medical implant added successfully');
    }

    setShowImplantModal(false);
  };

  const handleDeleteImplant = (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    const filtered = implants.filter(imp => imp.id !== id);
    saveImplants(filtered);
    toast.success('Medical implant deleted');
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
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>My Devices</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {activeTab === 'implants'
              ? 'Critical medical implant information for emergency sharing'
              : 'Connect wearable devices to automatically track your recovery data'}
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
          Medical Implants
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
            EMERGENCY
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
          Fitness Trackers
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
                Critical Medical Implants
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
                  Export All as QR
                </Button>
              )}
              <Button
                onClick={handleAddImplant}
                variant="primary"
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <Plus className="h-4 w-4" />
                Add Medical Implant
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
                          title="Export as QR Code"
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
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>Serial Number</p>
                        <p className="font-mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          {implant.serialNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>Implant Date</p>
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>
                          {implant.implantDate ? new Date(implant.implantDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>Surgeon</p>
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>
                          {implant.implantingSurgeon || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>Hospital</p>
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
                          MRI Safe
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          NOT MRI Safe
                        </span>
                      )}
                      {implant.isEmergencyCritical && (
                        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Emergency Critical
                        </span>
                      )}
                    </div>

                    {implant.notes && (
                      <div className="mt-4 p-3 rounded-lg bg-gray-500/10">
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>Notes</p>
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
                  No Medical Implants Recorded
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  Add critical medical implant information (biological valves, pacemakers, etc.) for emergency situations
                </p>
                <Button
                  onClick={handleAddImplant}
                  variant="primary"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Medical Implant
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
                  Strava
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Universal fitness tracking
                </p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--ink)' }}>
              Connect Strava to automatically sync all your workouts from Samsung Watch, Polar devices, and more - all in one place!
            </p>
            <Button onClick={handleConnectStrava} variant="primary" className="w-full bg-orange-500 hover:bg-orange-600">
              <Activity className="h-4 w-4 mr-2" />
              Connect Strava (Recommended)
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
                  Polar H10
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Heart rate monitor
                </p>
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--ink)' }}>
              Connect your Polar H10 to automatically sync exercise sessions, heart rate data, and training metrics.
            </p>
            <Button onClick={handleConnectPolar} variant="primary" className="w-full">
              <Heart className="h-4 w-4 mr-2" />
              Connect Polar Device
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Connected Devices */}
      {devices.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink)' }}>
            Connected Devices
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
                          Last synced: {formatDate(device.lastSyncedAt)}
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
                        Exercise
                      </span>
                    )}
                    {device.syncHeartRate && (
                      <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                        <Heart className="h-3 w-3 inline mr-1" />
                        Heart Rate
                      </span>
                    )}
                    {device.syncSteps && (
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                        Steps
                      </span>
                    )}
                    {device.syncCalories && (
                      <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                        Calories
                      </span>
                    )}
                  </div>

                  {showSettings === device.id ? (
                    <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <h4 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Sync Settings</h4>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>Auto-sync</span>
                          <input
                            type="checkbox"
                            checked={device.autoSync}
                            onChange={(e) => handleToggleSetting(device, 'autoSync', e.target.checked)}
                            className="toggle"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>Exercise Sessions</span>
                          <input
                            type="checkbox"
                            checked={device.syncExercises}
                            onChange={(e) => handleToggleSetting(device, 'syncExercises', e.target.checked)}
                            className="toggle"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>Heart Rate</span>
                          <input
                            type="checkbox"
                            checked={device.syncHeartRate}
                            onChange={(e) => handleToggleSetting(device, 'syncHeartRate', e.target.checked)}
                            className="toggle"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>Steps</span>
                          <input
                            type="checkbox"
                            checked={device.syncSteps}
                            onChange={(e) => handleToggleSetting(device, 'syncSteps', e.target.checked)}
                            className="toggle"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>Calories</span>
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
                      Sync Now
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
                      <h4 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Recent Sync History</h4>
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
                                  {log.syncType.charAt(0).toUpperCase() + log.syncType.slice(1)} sync
                                </p>
                                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                                  {formatDate(log.startedAt)}
                                  {log.recordsCreated && ` • ${log.recordsCreated} records created`}
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
                  No Devices Connected
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Connect your first device to start automatically tracking your recovery data
                </p>
              </div>
            </GlassCard>
          )}
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
                    {editingImplant ? 'Edit Medical Implant' : 'Add Medical Implant'}
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
                        Device Type *
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
                        <option value="" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>Select type...</option>
                        <option value="Biological Valve" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>Biological Valve</option>
                        <option value="Mechanical Valve" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>Mechanical Valve</option>
                        <option value="Pacemaker" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>Pacemaker</option>
                        <option value="ICD (Defibrillator)" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>ICD (Defibrillator)</option>
                        <option value="Stent" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>Stent</option>
                        <option value="Heart Pump/LVAD" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>Heart Pump/LVAD</option>
                        <option value="Other Cardiac Device" style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>Other Cardiac Device</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                        Manufacturer *
                      </label>
                      <input
                        type="text"
                        value={implantForm.manufacturer}
                        onChange={(e) => setImplantForm({ ...implantForm, manufacturer: e.target.value })}
                        required
                        placeholder="e.g., Abbott, Medtronic, Edwards"
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
                        Model Number *
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
                        Serial Number *
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
                        Implant Date *
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
                        Warranty/Replacement Date
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
                        Implanting Surgeon
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
                        Implanting Hospital
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
                      Notes
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
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>MRI Safe</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={implantForm.isEmergencyCritical}
                        onChange={(e) => setImplantForm({ ...implantForm, isEmergencyCritical: e.target.checked })}
                        className="w-5 h-5"
                      />
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>Emergency Critical</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" variant="primary" className="flex-1 bg-red-600 hover:bg-red-700">
                      {editingImplant ? 'Update Implant' : 'Add Implant'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowImplantModal(false)}
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
