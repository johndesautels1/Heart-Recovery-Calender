import React, { useState } from 'react';
import { GlassCard, Button } from '../components/ui';
import { Stethoscope, Phone, Mail, MapPin, Calendar, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function MyProvidersPage() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([
    {
      id: 1,
      name: user?.doctorName || 'Dr. Smith',
      specialty: 'Cardiologist',
      phone: user?.doctorPhone || '(555) 123-4567',
      email: 'dr.smith@heartcare.com',
      address: '123 Medical Center Dr, Suite 200',
      nextAppointment: '2025-11-15',
    },
  ]);

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
          onClick={() => {/* Add provider logic */}}
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
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {provider.specialty}
                    </p>
                  </div>
                </div>
              </div>

              {/* Provider Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>
                    {provider.phone}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>
                    {provider.email}
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 mt-0.5" style={{ color: 'var(--accent)' }} />
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>
                    {provider.address}
                  </span>
                </div>
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
                  onClick={() => {/* Edit provider logic */}}
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  onClick={() => {/* Delete provider logic */}}
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
              onClick={() => {/* Add provider logic */}}
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
      <GlassCard className="mt-6">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ink-bright)' }}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              className="p-4 rounded-lg transition-all hover:scale-105"
              style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)' }}
            >
              <Calendar className="h-6 w-6 mb-2" style={{ color: 'var(--accent)' }} />
              <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                Schedule Appointment
              </p>
            </button>
            <button
              className="p-4 rounded-lg transition-all hover:scale-105"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
            >
              <Mail className="h-6 w-6 mb-2" style={{ color: '#22c55e' }} />
              <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                Message Provider
              </p>
            </button>
            <button
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
    </div>
  );
}
