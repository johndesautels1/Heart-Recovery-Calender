import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp, Shield, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface HAWKAlert {
  id: string;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  category: 'hydration' | 'cardiac' | 'medication' | 'weather' | 'combination';
  title: string;
  message: string;
  actions: string[];
  isDismissable: boolean;
}

export function GlobalHAWKAlert() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<HAWKAlert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchHAWKAlerts = async () => {
      try {
        const response = await api.getHAWKAlerts();
        setAlerts(response.alerts || []);
      } catch (error) {
        console.error('[HAWK] Failed to fetch alerts:', error);
        setAlerts([]);
      }
    };

    fetchHAWKAlerts();

    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchHAWKAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Filter out dismissed alerts (only dismissable ones)
  const activeAlerts = alerts.filter(
    alert => !dismissedAlerts.includes(alert.id) || !alert.isDismissable
  );

  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const dangerAlerts = activeAlerts.filter(a => a.severity === 'danger');
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');

  const highestSeverity = criticalAlerts.length > 0
    ? 'critical'
    : dangerAlerts.length > 0
    ? 'danger'
    : warningAlerts.length > 0
    ? 'warning'
    : 'info';

  if (activeAlerts.length === 0) return null;

  const getSeverityStyle = () => {
    switch (highestSeverity) {
      case 'critical':
        return {
          bg: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          shadow: '0 0 30px rgba(220, 38, 38, 0.7), 0 0 60px rgba(220, 38, 38, 0.4)',
          pulse: true,
        };
      case 'danger':
        return {
          bg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
          shadow: '0 0 30px rgba(249, 115, 22, 0.6), 0 0 60px rgba(249, 115, 22, 0.3)',
          pulse: true,
        };
      case 'warning':
        return {
          bg: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
          shadow: '0 0 25px rgba(234, 179, 8, 0.5), 0 0 50px rgba(234, 179, 8, 0.2)',
          pulse: false,
        };
      default:
        return {
          bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          shadow: '0 0 20px rgba(59, 130, 246, 0.4)',
          pulse: false,
        };
    }
  };

  const style = getSeverityStyle();

  const handleDismiss = async (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert?.isDismissable) {
      try {
        await api.dismissHAWKAlert(alertId);
        setDismissedAlerts([...dismissedAlerts, alertId]);
      } catch (error) {
        console.error('[HAWK] Failed to dismiss alert:', error);
      }
    }
  };

  return (
    <>
      {/* Main Floating Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          fixed bottom-6 left-6 z-50
          w-16 h-16 rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${isExpanded ? 'scale-110' : 'scale-100'}
          ${style.pulse ? 'animate-pulse' : ''}
        `}
        style={{
          background: style.bg,
          boxShadow: style.shadow,
        }}
      >
        <div className="relative">
          <AlertTriangle className="h-7 w-7 text-white drop-shadow-lg" strokeWidth={3} />

          {/* Alert count badge */}
          {activeAlerts.length > 0 && (
            <div
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold"
              style={{
                color: highestSeverity === 'critical' ? '#dc2626' : highestSeverity === 'danger' ? '#f97316' : '#eab308',
              }}
            >
              {activeAlerts.length}
            </div>
          )}
        </div>

        {/* Ripple effect */}
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%)',
          }}
        />
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="fixed bottom-24 left-6 z-50 w-96 max-h-[70vh] overflow-y-auto animate-slide-up">
          <div
            className="rounded-2xl p-4 border-2"
            style={{
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
              backdropFilter: 'blur(10px)',
              borderColor: highestSeverity === 'critical' ? '#dc2626' : highestSeverity === 'danger' ? '#f97316' : '#eab308',
              boxShadow: style.shadow,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-white" />
                <h3 className="text-white font-bold text-lg">HAWK Alerts</h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Alert List */}
            <div className="space-y-3">
              {activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`
                    rounded-xl p-4 border-2
                    ${alert.severity === 'critical' ? 'bg-red-950/50 border-red-500' : ''}
                    ${alert.severity === 'danger' ? 'bg-orange-950/50 border-orange-500' : ''}
                    ${alert.severity === 'warning' ? 'bg-yellow-950/50 border-yellow-500' : ''}
                    ${alert.severity === 'info' ? 'bg-blue-950/50 border-blue-500' : ''}
                  `}
                >
                  {/* Alert Header */}
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-bold text-sm flex-1">
                      {alert.title}
                    </h4>
                    {alert.isDismissable && (
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="text-gray-400 hover:text-white transition-colors ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {!alert.isDismissable && (
                      <div className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                        CRITICAL
                      </div>
                    )}
                  </div>

                  {/* Alert Message */}
                  <p className="text-gray-300 text-sm mb-3">
                    {alert.message}
                  </p>

                  {/* Actions */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-gray-400 uppercase">Required Actions:</p>
                    {alert.actions.map((action, idx) => (
                      <div key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-white">•</span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>

                  {/* Category Badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className={`
                      px-2 py-1 rounded text-xs font-semibold
                      ${alert.category === 'combination' ? 'bg-red-600 text-white' : ''}
                      ${alert.category === 'cardiac' ? 'bg-pink-600 text-white' : ''}
                      ${alert.category === 'medication' ? 'bg-purple-600 text-white' : ''}
                      ${alert.category === 'weather' ? 'bg-orange-600 text-white' : ''}
                      ${alert.category === 'hydration' ? 'bg-cyan-600 text-white' : ''}
                    `}>
                      {alert.category.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Info */}
            <div className="mt-4 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-400" />
                HAWK: Heart Activity Warning & Knowledge System
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
