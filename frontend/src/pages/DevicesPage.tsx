import React, { useState, useEffect } from 'react';
import { GlassCard, Button } from '../components/ui';
import { Smartphone, Watch, Heart, Activity, RefreshCw, Trash2, Settings, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { api } from '../services/api';
import { DeviceConnection, DeviceSyncLog } from '../types';
import toast from 'react-hot-toast';

export function DevicesPage() {
  const [devices, setDevices] = useState<DeviceConnection[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceConnection | null>(null);
  const [syncHistory, setSyncHistory] = useState<DeviceSyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState<number | null>(null);

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
            Connect wearable devices to automatically track your recovery data
          </p>
        </div>
      </div>

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

      {devices.length === 0 && (
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
    </div>
  );
}
