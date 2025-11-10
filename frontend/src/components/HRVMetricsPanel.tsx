import React from 'react';
import { Heart, Activity, TrendingUp } from 'lucide-react';

interface HRVMetricsPanelProps {
  sdnn?: number; // Standard Deviation of NN intervals (ms)
  rmssd?: number; // Root Mean Square of Successive Differences (ms)
  pnn50?: number; // Percentage of NN intervals differing by >50ms (%)
}

export const HRVMetricsPanel: React.FC<HRVMetricsPanelProps> = ({ sdnn, rmssd, pnn50 }) => {
  // Interpret SDNN (normal: 50-100ms)
  const getSDNNStatus = (value?: number) => {
    if (!value) return { color: 'gray', label: 'No Data', status: 'unknown' };
    if (value < 30) return { color: 'red', label: 'Very Low', status: 'critical' };
    if (value < 50) return { color: 'orange', label: 'Low', status: 'warning' };
    if (value <= 100) return { color: 'green', label: 'Normal', status: 'good' };
    if (value <= 150) return { color: 'blue', label: 'High', status: 'excellent' };
    return { color: 'purple', label: 'Very High', status: 'excellent' };
  };

  // Interpret RMSSD (normal: 20-50ms)
  const getRMSSDStatus = (value?: number) => {
    if (!value) return { color: 'gray', label: 'No Data', status: 'unknown' };
    if (value < 15) return { color: 'red', label: 'Very Low', status: 'critical' };
    if (value < 20) return { color: 'orange', label: 'Low', status: 'warning' };
    if (value <= 50) return { color: 'green', label: 'Normal', status: 'good' };
    if (value <= 80) return { color: 'blue', label: 'High', status: 'excellent' };
    return { color: 'purple', label: 'Very High', status: 'excellent' };
  };

  // Interpret pNN50 (normal: 10-40%)
  const getPNN50Status = (value?: number) => {
    if (!value) return { color: 'gray', label: 'No Data', status: 'unknown' };
    if (value < 5) return { color: 'red', label: 'Very Low', status: 'critical' };
    if (value < 10) return { color: 'orange', label: 'Low', status: 'warning' };
    if (value <= 40) return { color: 'green', label: 'Normal', status: 'good' };
    if (value <= 60) return { color: 'blue', label: 'High', status: 'excellent' };
    return { color: 'purple', label: 'Very High', status: 'excellent' };
  };

  const sdnnStatus = getSDNNStatus(sdnn);
  const rmssdStatus = getRMSSDStatus(rmssd);
  const pnn50Status = getPNN50Status(pnn50);

  const statusColors = {
    red: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', glow: 'shadow-red-500/50' },
    orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400', glow: 'shadow-orange-500/50' },
    green: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400', glow: 'shadow-green-500/50' },
    blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400', glow: 'shadow-blue-500/50' },
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400', glow: 'shadow-purple-500/50' },
    gray: { bg: 'bg-gray-500/20', border: 'border-gray-500/40', text: 'text-gray-400', glow: 'shadow-gray-500/50' },
  };

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 px-4">
        <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
          <Heart className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-purple-400">Heart Rate Variability Metrics</h3>
          <p className="text-xs text-gray-400">
            Autonomic Nervous System Function Assessment
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4 px-4">
        {/* SDNN Card */}
        <div className={`p-4 rounded-lg border-2 ${statusColors[sdnnStatus.color].bg} ${statusColors[sdnnStatus.color].border} transition-all duration-300 hover:shadow-lg ${statusColors[sdnnStatus.color].glow}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${statusColors[sdnnStatus.color].text}`} />
              <span className={`text-xs font-bold uppercase tracking-wide ${statusColors[sdnnStatus.color].text}`}>
                SDNN
              </span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[sdnnStatus.color].bg} ${statusColors[sdnnStatus.color].border} border`}>
              {sdnnStatus.label}
            </span>
          </div>

          <div className="flex items-baseline gap-1 mb-1">
            <span className={`text-3xl font-bold ${statusColors[sdnnStatus.color].text}`}>
              {sdnn != null ? sdnn.toFixed(1) : '--'}
            </span>
            <span className="text-sm text-gray-400">ms</span>
          </div>

          <div className="text-xs text-gray-500 leading-tight">
            Standard Deviation<br />
            Overall HRV · Target: 50-100ms
          </div>

          {/* Progress Bar */}
          {sdnn != null && (
            <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${statusColors[sdnnStatus.color].bg} transition-all duration-500`}
                style={{ width: `${Math.min((sdnn / 150) * 100, 100)}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* RMSSD Card */}
        <div className={`p-4 rounded-lg border-2 ${statusColors[rmssdStatus.color].bg} ${statusColors[rmssdStatus.color].border} transition-all duration-300 hover:shadow-lg ${statusColors[rmssdStatus.color].glow}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${statusColors[rmssdStatus.color].text}`} />
              <span className={`text-xs font-bold uppercase tracking-wide ${statusColors[rmssdStatus.color].text}`}>
                RMSSD
              </span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[rmssdStatus.color].bg} ${statusColors[rmssdStatus.color].border} border`}>
              {rmssdStatus.label}
            </span>
          </div>

          <div className="flex items-baseline gap-1 mb-1">
            <span className={`text-3xl font-bold ${statusColors[rmssdStatus.color].text}`}>
              {rmssd != null ? rmssd.toFixed(1) : '--'}
            </span>
            <span className="text-sm text-gray-400">ms</span>
          </div>

          <div className="text-xs text-gray-500 leading-tight">
            Beat-to-Beat Variability<br />
            Parasympathetic · Target: 20-50ms
          </div>

          {/* Progress Bar */}
          {rmssd != null && (
            <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${statusColors[rmssdStatus.color].bg} transition-all duration-500`}
                style={{ width: `${Math.min((rmssd / 100) * 100, 100)}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* pNN50 Card */}
        <div className={`p-4 rounded-lg border-2 ${statusColors[pnn50Status.color].bg} ${statusColors[pnn50Status.color].border} transition-all duration-300 hover:shadow-lg ${statusColors[pnn50Status.color].glow}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className={`h-4 w-4 ${statusColors[pnn50Status.color].text}`} />
              <span className={`text-xs font-bold uppercase tracking-wide ${statusColors[pnn50Status.color].text}`}>
                pNN50
              </span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[pnn50Status.color].bg} ${statusColors[pnn50Status.color].border} border`}>
              {pnn50Status.label}
            </span>
          </div>

          <div className="flex items-baseline gap-1 mb-1">
            <span className={`text-3xl font-bold ${statusColors[pnn50Status.color].text}`}>
              {pnn50 != null ? pnn50.toFixed(1) : '--'}
            </span>
            <span className="text-sm text-gray-400">%</span>
          </div>

          <div className="text-xs text-gray-500 leading-tight">
            Successive Differences<br />
            Vagal Tone · Target: 10-40%
          </div>

          {/* Progress Bar */}
          {pnn50 != null && (
            <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${statusColors[pnn50Status.color].bg} transition-all duration-500`}
                style={{ width: `${Math.min((pnn50 / 60) * 100, 100)}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 mx-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-2">
          <Activity className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-300 leading-relaxed">
            <strong>HRV Interpretation:</strong> Higher HRV typically indicates better cardiovascular fitness and stress resilience.
            SDNN reflects overall variability, RMSSD indicates parasympathetic activity (recovery/relaxation),
            and pNN50 measures vagal tone (heart's ability to adapt to stress).
          </div>
        </div>
      </div>
    </div>
  );
};
