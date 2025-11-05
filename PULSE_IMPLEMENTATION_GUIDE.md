# 🫀 WORLD-CLASS PULSE MONITORING SYSTEM - Implementation Guide

## Overview
This guide details the complete implementation of a premium pulse/heart rate monitoring system with stunning visualizations, advanced analytics, and intelligent Hawk Alerts.

## ✅ COMPLETED (Backend)

### 1. Medication Model Extensions
**File:** `backend/src/models/Medication.ts`
- ✅ Added `causesBradycardia` - Detects beta blockers, calcium channel blockers
- ✅ Added `causesTachycardia` - Detects stimulants, decongestants
- ✅ Added `affectsHeartRate` - General HR side effects
- ✅ Added `reducesHRV` - Tracks HRV impact

### 2. Heart Rate Correlation Service
**File:** `backend/src/services/medicationCorrelationService.ts`
- ✅ `checkBradycardiaMedicationCorrelation()` - Triggers at HR < 60 bpm
  - Danger: HR < 50 bpm
  - Warning: HR 50-60 bpm
- ✅ `checkTachycardiaMedicationCorrelation()` - Triggers at HR > maxHeartRate
  - Danger: HR > 120 or >20 above max
  - Warning: Elevated but manageable
- ✅ Updated `HawkAlert` interface with 'bradycardia' and 'tachycardia' types

### 3. Notification Service
**File:** `backend/src/services/notificationService.ts`
- ✅ Extended `sendHawkAlert()` to support bradycardia and tachycardia alerts
- ✅ SMS and email notifications for heart rate dangers

## 🎨 FRONTEND IMPLEMENTATION (To Complete)

### Step 1: Add Pulse Tab Navigation
**File:** `frontend/src/pages/VitalsPage.tsx`

**Line 81** - Update activeTab state:
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'weight' | 'glucose' | 'pulse' | 'medical'>('overview');
```

**Find tab navigation section** (search for "Overview", "Weight", "Glucose" buttons) and add:
```typescript
<button
  onClick={() => setActiveTab('pulse')}
  className={`px-6 py-3 rounded-xl font-bold transition-all ${
    activeTab === 'pulse'
      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/50'
      : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
  }`}
>
  <Heart className="inline-block mr-2 h-5 w-5" />
  Pulse
</button>
```

### Step 2: Create Pulse Tab Content Section

**Add after glucose tab content** (search for `{activeTab === 'glucose' &&`):

```typescript
{/* ═══════════════════════════════════════════════════════════ */}
{/* 🫀 PULSE / HEART RATE MONITORING - WORLD-CLASS ANALYTICS   */}
{/* ═══════════════════════════════════════════════════════════ */}
{activeTab === 'pulse' && (
  <div className="space-y-8 animate-fadeIn">

    {/* PULSE HAWK ALERTS - Top Priority */}
    {hawkAlerts.filter(alert => alert.type === 'bradycardia' || alert.type === 'tachycardia').map((alert, index) => {
      if (dismissedAlerts.includes(index)) return null;

      return (
        <div
          key={index}
          className={`relative overflow-hidden rounded-2xl p-6 ${
            alert.severity === 'danger'
              ? 'bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-900/40 border-2 border-red-500/50'
              : 'bg-gradient-to-br from-yellow-900/40 via-yellow-800/30 to-yellow-900/40 border-2 border-yellow-500/50'
          } shadow-2xl animate-pulse-slow`}
        >
          {/* Dismiss Button */}
          <button
            onClick={() => setDismissedAlerts([...dismissedAlerts, index])}
            className="absolute top-4 right-4 p-2 rounded-lg transition-all hover:bg-white/10"
            title="Dismiss alert"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`p-4 rounded-full ${
              alert.severity === 'danger' ? 'bg-red-500/20' : 'bg-yellow-500/20'
            }`}>
              {alert.severity === 'danger' ? '🚨' : '⚠️'}
              <Heart className="h-8 w-8 text-red-400 animate-pulse" />
            </div>

            {/* Content */}
            <div className="flex-1 pr-8">
              <h3 className="text-2xl font-bold text-white mb-2">
                {alert.type === 'bradycardia' ? '🐢 Slow Heart Rate Detected' : '⚡ Rapid Heart Rate Detected'}
              </h3>
              <p className="text-lg text-gray-200 mb-4">{alert.message}</p>

              {/* Medications Involved */}
              <div className="bg-black/30 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-bold text-yellow-400 mb-2">💊 Medications Involved:</h4>
                <div className="flex flex-wrap gap-2">
                  {alert.medicationNames.map((med, i) => (
                    <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white">
                      {med}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <p className="text-sm text-gray-300">{alert.recommendation}</p>
            </div>
          </div>
        </div>
      );
    })}

    {/* ═══════════════════════════════════════════ */}
    {/* 5 ADVANCED PULSE METRICS PANEL              */}
    {/* ═══════════════════════════════════════════ */}
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

      {/* Metric 1: Current Heart Rate */}
      <GlassCard className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="h-8 w-8 text-red-400 animate-pulse" />
            <span className="text-xs font-bold text-gray-400">CURRENT</span>
          </div>
          <p className="text-4xl font-black text-white mb-2">
            {filteredLatest?.heartRate || '--'}
            <span className="text-lg text-gray-400 ml-2">bpm</span>
          </p>
          <p className="text-sm font-bold text-gray-300">Heart Rate</p>
          {/* Status Badge */}
          {filteredLatest?.heartRate && (
            <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold inline-block ${
              filteredLatest.heartRate < 50 ? 'bg-red-500/20 text-red-400' :
              filteredLatest.heartRate < 60 ? 'bg-yellow-500/20 text-yellow-400' :
              filteredLatest.heartRate <= 100 ? 'bg-green-500/20 text-green-400' :
              filteredLatest.heartRate <= 120 ? 'bg-orange-500/20 text-orange-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {filteredLatest.heartRate < 50 ? '🔴 CRITICAL LOW' :
               filteredLatest.heartRate < 60 ? '🟡 BRADYCARDIA' :
               filteredLatest.heartRate <= 100 ? '🟢 NORMAL' :
               filteredLatest.heartRate <= 120 ? '🟠 ELEVATED' :
               '🔴 TACHYCARDIA'}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Metric 2: Resting HR */}
      <GlassCard className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <Heart className="h-8 w-8 text-blue-400" />
            <span className="text-xs font-bold text-gray-400">7-DAY MIN</span>
          </div>
          <p className="text-4xl font-black text-white mb-2">
            {(() => {
              const recentVitals = vitals.filter(v => v.heartRate &&
                new Date(v.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              );
              const validHRs = recentVitals.filter(v => v.heartRate);
              return validHRs.length > 0 ? Math.min(...validHRs.map(v => v.heartRate!)) : '--';
            })()}
            <span className="text-lg text-gray-400 ml-2">bpm</span>
          </p>
          <p className="text-sm font-bold text-gray-300">Resting HR</p>
          <p className="text-xs text-gray-500 mt-2">Lowest HR in last 7 days</p>
        </div>
      </GlassCard>

      {/* Metric 3: 7-Day Average HR */}
      <GlassCard className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-purple-400" />
            <span className="text-xs font-bold text-gray-400">AVG</span>
          </div>
          <p className="text-4xl font-black text-white mb-2">
            {(() => {
              const recentVitals = vitals.filter(v => v.heartRate &&
                new Date(v.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              );
              const validHRs = recentVitals.filter(v => v.heartRate);
              if (validHRs.length === 0) return '--';
              const avg = validHRs.reduce((sum, v) => sum + (v.heartRate || 0), 0) / validHRs.length;
              return Math.round(avg);
            })()}
            <span className="text-lg text-gray-400 ml-2">bpm</span>
          </p>
          <p className="text-sm font-bold text-gray-300">7-Day Avg</p>
          <p className="text-xs text-gray-500 mt-2">Average heart rate</p>
        </div>
      </GlassCard>

      {/* Metric 4: HRV Score */}
      <GlassCard className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <Zap className="h-8 w-8 text-green-400" />
            <span className="text-xs font-bold text-gray-400">HRV</span>
          </div>
          <p className="text-4xl font-black text-white mb-2">
            {filteredLatest?.heartRateVariability || '--'}
            <span className="text-lg text-gray-400 ml-2">ms</span>
          </p>
          <p className="text-sm font-bold text-gray-300">Heart Rate Variability</p>
          {/* HRV Status */}
          {filteredLatest?.heartRateVariability && (
            <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold inline-block ${
              filteredLatest.heartRateVariability < 20 ? 'bg-red-500/20 text-red-400' :
              filteredLatest.heartRateVariability < 50 ? 'bg-yellow-500/20 text-yellow-400' :
              filteredLatest.heartRateVariability < 100 ? 'bg-green-500/20 text-green-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {filteredLatest.heartRateVariability < 20 ? 'POOR' :
               filteredLatest.heartRateVariability < 50 ? 'FAIR' :
               filteredLatest.heartRateVariability < 100 ? 'GOOD' :
               'EXCELLENT'}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Metric 5: Target Zone Compliance */}
      <GlassCard className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
            <span className="text-xs font-bold text-gray-400">SAFETY</span>
          </div>
          <p className="text-4xl font-black text-white mb-2">
            {(() => {
              const recentVitals = vitals.filter(v => v.heartRate &&
                new Date(v.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              );
              if (recentVitals.length === 0 || !patientData) return '--';
              const targetMin = patientData.targetHeartRateMin || 60;
              const targetMax = patientData.targetHeartRateMax || 100;
              const inZone = recentVitals.filter(v =>
                v.heartRate! >= targetMin && v.heartRate! <= targetMax
              );
              return Math.round((inZone.length / recentVitals.length) * 100);
            })()}
            <span className="text-lg text-gray-400 ml-2">%</span>
          </p>
          <p className="text-sm font-bold text-gray-300">In Safe Zone</p>
          <p className="text-xs text-gray-500 mt-2">Last 7 days compliance</p>
        </div>
      </GlassCard>
    </div>

    {/* Continue with chart and other sections... */}
    {/* Due to token limits, see full implementation below */}
  </div>
)}
```

### Step 3: Multi-Zone Heart Rate Chart (Premium Styling)

Add after the metrics panel:

```typescript
{/* ═══════════════════════════════════════════ */}
{/* MULTI-ZONE HEART RATE CHART - 3D PREMIUM   */}
{/* ═══════════════════════════════════════════ */}
<GlassCard className="p-8">
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-2xl font-black bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
      🫀 Heart Rate Zones - 7 Day Analysis
    </h2>
  </div>

  <ResponsiveContainer width="100%" height={450}>
    <ComposedChart data={(() => {
      const last7Days = vitals.filter(v =>
        v.heartRate &&
        new Date(v.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).map(v => ({
        date: format(new Date(v.timestamp), 'MMM dd HH:mm'),
        heartRate: v.heartRate,
        hrv: v.heartRateVariability
      })).reverse();
      return last7Days;
    })()}>

      {/* Grid and Axes */}
      <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.3} />
      <XAxis
        dataKey="date"
        stroke="#9ca3af"
        tick={{ fill: '#f3f4f6', fontSize: 12, fontWeight: 700 }}
        angle={-15}
        textAnchor="end"
        height={60}
      />
      <YAxis
        domain={[40, 'auto']}
        stroke="#9ca3af"
        tick={{ fill: '#f3f4f6', fontSize: 13, fontWeight: 700 }}
        label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft', fill: '#f3f4f6', fontWeight: 700 }}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }}
        labelStyle={{ color: '#f3f4f6', fontWeight: 'bold' }}
      />
      <Legend />

      {/* DANGER ZONES - Reference Areas with Premium Gradients */}

      {/* Critical Bradycardia Zone (<50 bpm) - Deep Red */}
      <defs>
        <linearGradient id="criticalLowZone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dc2626" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity={0.2} />
        </linearGradient>
      </defs>
      <ReferenceLine
        y={50}
        stroke="#dc2626"
        strokeWidth={3}
        strokeDasharray="3 3"
        label={{
          value: '⚠️ DANGER: Critical Bradycardia (50)',
          position: 'insideTopLeft',
          fill: '#fef2f2',
          fontSize: 12,
          fontWeight: 'bold',
          style: { textShadow: '0 2px 4px rgba(0,0,0,0.8)' }
        }}
      />

      {/* Bradycardia Warning Zone (50-60 bpm) - Orange */}
      <ReferenceLine
        y={60}
        stroke="#f59e0b"
        strokeWidth={2.5}
        strokeDasharray="5 5"
        label={{
          value: 'Bradycardia Risk (60)',
          position: 'insideTopRight',
          fill: '#fef3c7',
          fontSize: 12,
          fontWeight: 'bold'
        }}
      />

      {/* Safe Zone Lower Bound - Use patient's targetMin if available */}
      <ReferenceLine
        y={patientData?.targetHeartRateMin || 60}
        stroke="#10b981"
        strokeWidth={2}
        strokeDasharray="5 5"
        label={{
          value: `Target Min (${patientData?.targetHeartRateMin || 60})`,
          position: 'insideBottomLeft',
          fill: '#d1fae5',
          fontSize: 11,
          fontWeight: 'bold'
        }}
      />

      {/* Safe Zone Upper Bound */}
      <ReferenceLine
        y={patientData?.targetHeartRateMax || 100}
        stroke="#10b981"
        strokeWidth={2}
        strokeDasharray="5 5"
        label={{
          value: `Target Max (${patientData?.targetHeartRateMax || 100})`,
          position: 'insideBottomRight',
          fill: '#d1fae5',
          fontSize: 11,
          fontWeight: 'bold'
        }}
      />

      {/* Tachycardia Warning - Patient's max HR */}
      {patientData?.maxHeartRate && (
        <ReferenceLine
          y={patientData.maxHeartRate}
          stroke="#ef4444"
          strokeWidth={2.5}
          strokeDasharray="5 5"
          label={{
            value: `Max Safe HR (${patientData.maxHeartRate})`,
            position: 'insideTopRight',
            fill: '#fef2f2',
            fontSize: 12,
            fontWeight: 'bold'
          }}
        />
      )}

      {/* Critical Tachycardia (>120 bpm) - Deep Red */}
      <ReferenceLine
        y={120}
        stroke="#dc2626"
        strokeWidth={3}
        strokeDasharray="3 3"
        label={{
          value: '⚠️ DANGER: Tachycardia (120)',
          position: 'insideBottomLeft',
          fill: '#fef2f2',
          fontSize: 12,
          fontWeight: 'bold',
          style: { textShadow: '0 2px 4px rgba(0,0,0,0.8)' }
        }}
      />

      {/* Heart Rate Line with Gradient Fill */}
      <defs>
        <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
          <stop offset="50%" stopColor="#10b981" stopOpacity={0.6} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.4} />
        </linearGradient>
      </defs>

      <Area
        type="monotone"
        dataKey="heartRate"
        stroke="#ef4444"
        strokeWidth={3}
        fill="url(#hrGradient)"
        dot={{
          r: 6,
          fill: '#ef4444',
          strokeWidth: 2,
          stroke: '#fff'
        }}
        activeDot={{
          r: 8,
          fill: '#dc2626',
          strokeWidth: 3,
          stroke: '#fff',
          style: { filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' }
        }}
        name="Heart Rate"
        animationDuration={1500}
        animationEasing="ease-in-out"
      />

      {/* HRV Line (secondary axis if needed) */}
      {vitals.some(v => v.heartRateVariability) && (
        <Line
          type="monotone"
          dataKey="hrv"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
          name="HRV (ms)"
          opacity={0.6}
        />
      )}
    </ComposedChart>
  </ResponsiveContainer>

  {/* Zone Legend */}
  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full bg-red-500" />
      <span className="text-sm text-gray-300">Critical (<50, >120)</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full bg-orange-500" />
      <span className="text-sm text-gray-300">Warning (50-60)</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full bg-green-500" />
      <span className="text-sm text-gray-300">Safe Zone (60-100)</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full bg-blue-500" />
      <span className="text-sm text-gray-300">HRV (Higher = Better)</span>
    </div>
  </div>
</GlassCard>
```

## 🚀 Next Steps

1. Add the code above to `VitalsPage.tsx`
2. Test with real heart rate data
3. Add HRV circadian analysis chart (morning vs evening patterns)
4. Implement activity-HR correlation visualization
5. Create test data script similar to glucose test data

## 📊 Expected Results

- **5 stunning metric cards** with hover effects and status badges
- **Multi-zone heart rate chart** with 7 danger/safety zones
- **Premium gradient styling** throughout
- **Animated transitions** on all interactions
- **Intelligent Hawk Alerts** for medication-induced HR issues

This system will be truly world-class! 🌟
