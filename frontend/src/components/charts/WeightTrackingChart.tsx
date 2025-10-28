import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
  Cell
} from 'recharts';
import { Star } from 'lucide-react';
import { Patient } from '../../types';

interface WeightEntry {
  date: string;
  weight: number;
  bmiCategory: 'green' | 'blue' | 'orange' | 'red';
}

interface WeightTrackingChartProps {
  patient: Patient;
  weightEntries?: Array<{ date: string; weight: number }>;
  showTargetStar?: boolean;
}

// BMI Categories based on CDC standards
// BMI < 18.5: Underweight (blue)
// BMI 18.5-24.9: Normal weight (green)
// BMI 25-29.9: Overweight (orange)
// BMI >= 30: Obese (red)

const calculateBMI = (weightLbs: number, heightInches: number): number => {
  // BMI = (weight in pounds / (height in inches)^2) * 703
  return (weightLbs / (heightInches * heightInches)) * 703;
};

const getBMICategory = (bmi: number): 'green' | 'blue' | 'orange' | 'red' => {
  if (bmi < 18.5) return 'blue';
  if (bmi < 25) return 'green';
  if (bmi < 30) return 'orange';
  return 'red';
};

const getCategoryColor = (category: 'green' | 'blue' | 'orange' | 'red'): string => {
  const colors = {
    green: '#10b981', // Ideal weight
    blue: '#3b82f6',  // Slightly underweight/overweight
    orange: '#f59e0b', // Somewhat obese
    red: '#ef4444'    // Grossly obese
  };
  return colors[category];
};

const getCategoryLabel = (category: 'green' | 'blue' | 'orange' | 'red'): string => {
  const labels = {
    green: 'Ideal Weight',
    blue: 'Underweight',
    orange: 'Overweight',
    red: 'Obese'
  };
  return labels[category];
};

export const WeightTrackingChart: React.FC<WeightTrackingChartProps> = ({
  patient,
  weightEntries = [],
  showTargetStar = true
}) => {
  // Convert height to inches if needed
  const heightInInches = patient.heightUnit === 'cm'
    ? (patient.height || 0) / 2.54
    : (patient.height || 70); // Default to 70 inches if no height

  // Process weight entries and calculate BMI categories
  const processedData: WeightEntry[] = weightEntries.map(entry => {
    const weight = entry.weight;
    const bmi = calculateBMI(weight, heightInInches);
    const bmiCategory = getBMICategory(bmi);

    return {
      date: entry.date,
      weight: weight,
      bmiCategory
    };
  });

  // Add starting weight if available
  if (patient.startingWeight && patient.surgeryDate) {
    const startingBMI = calculateBMI(patient.startingWeight, heightInInches);
    processedData.unshift({
      date: new Date(patient.surgeryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: patient.startingWeight,
      bmiCategory: getBMICategory(startingBMI)
    });
  }

  // Calculate 12-week target date
  const targetDate = patient.surgeryDate
    ? new Date(new Date(patient.surgeryDate).getTime() + 12 * 7 * 24 * 60 * 60 * 1000)
    : new Date();

  // Calculate gradient colors for line based on weight change
  const getLineColor = (index: number): string => {
    if (!processedData[index]) return '#10b981';
    return getCategoryColor(processedData[index].bmiCategory);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as WeightEntry;
      const weight = Number(data.weight);
      const bmi = calculateBMI(weight, heightInInches);

      return (
        <div
          className="rounded-xl p-4 border-2"
          style={{
            background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
            borderColor: getCategoryColor(data.bmiCategory),
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${getCategoryColor(data.bmiCategory)}40, inset 0 2px 0 rgba(255, 255, 255, 0.1)`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <p className="text-white font-bold text-lg mb-2 font-display">{data.date}</p>
          <p className="text-white font-semibold">Weight: {weight.toFixed(1)} {patient.weightUnit || 'lbs'}</p>
          <p className="text-white font-semibold">BMI: {bmi.toFixed(1)}</p>
          <p
            style={{
              color: getCategoryColor(data.bmiCategory),
              textShadow: `0 0 10px ${getCategoryColor(data.bmiCategory)}80`
            }}
            className="font-bold mt-2 text-lg"
          >
            {getCategoryLabel(data.bmiCategory)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
          <span className="text-white font-semibold">Obese (BMI ≥ 30)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
          <span className="text-white font-semibold">Overweight (BMI 25-29.9)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
          <span className="text-white font-semibold">Underweight (BMI &lt; 18.5)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
          <span className="text-white font-semibold">Ideal Weight (BMI 18.5-24.9)</span>
        </div>
        {showTargetStar && patient.targetWeight && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-white font-semibold">Target Weight</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            {/* Enhanced gradient for line with depth */}
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              {processedData.map((entry, index) => (
                <stop
                  key={`gradient-${index}`}
                  offset={`${(index / (processedData.length - 1 || 1)) * 100}%`}
                  stopColor={getCategoryColor(entry.bmiCategory)}
                />
              ))}
            </linearGradient>

            {/* 3D Bar gradients with depth for each color category */}
            <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
              <stop offset="50%" stopColor="#10b981" stopOpacity={1}/>
              <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
            </linearGradient>
            <linearGradient id="barGradientBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={1}/>
              <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
            </linearGradient>
            <linearGradient id="barGradientOrange" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
              <stop offset="50%" stopColor="#f59e0b" stopOpacity={1}/>
              <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
            </linearGradient>
            <linearGradient id="barGradientRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
              <stop offset="50%" stopColor="#ef4444" stopOpacity={1}/>
              <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
            </linearGradient>

            {/* Shadow and glow filters */}
            <filter id="barShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
              <feOffset dx="0" dy="4" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            tick={{ fill: '#d1d5db', fontSize: 13, fontWeight: 600 }}
            tickLine={{ stroke: '#6b7280' }}
          />
          <YAxis
            stroke="#9ca3af"
            domain={[0, 320]}
            tick={{ fill: '#d1d5db', fontSize: 13, fontWeight: 600 }}
            tickLine={{ stroke: '#6b7280' }}
            label={{ value: `Weight (${patient.weightUnit || 'lbs'})`, angle: -90, position: 'insideLeft', style: { fill: '#d1d5db', fontWeight: 600 } }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(96, 165, 250, 0.1)' }} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />

          {/* 3D Bar Chart with gradients */}
          <Bar dataKey="weight" name="Weight" radius={[8, 8, 0, 0]} barSize={40} filter="url(#barShadow)">
            {processedData.map((entry, index) => {
              const gradientId = entry.bmiCategory === 'green' ? 'barGradientGreen' :
                                 entry.bmiCategory === 'blue' ? 'barGradientBlue' :
                                 entry.bmiCategory === 'orange' ? 'barGradientOrange' :
                                 'barGradientRed';
              return (
                <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} stroke={getCategoryColor(entry.bmiCategory)} strokeWidth={2} />
              );
            })}
          </Bar>

          {/* Enhanced Line Chart with glow */}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="url(#lineGradient)"
            strokeWidth={5}
            dot={{
              r: 7,
              strokeWidth: 3,
              fill: '#fff',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
            activeDot={{
              r: 10,
              strokeWidth: 4,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
            }}
            name="Weight Trend"
            filter="url(#lineGlow)"
          />

          {/* Target Weight Star */}
          {showTargetStar && patient.targetWeight && (
            <ReferenceDot
              x={targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              y={patient.targetWeight}
              r={12}
              fill="#fbbf24"
              stroke="#fff"
              strokeWidth={3}
              shape={<Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />}
              filter="drop-shadow(0 4px 8px rgba(251, 191, 36, 0.6))"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Patient Info Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {patient.startingWeight && (
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-white/60 text-xs">Starting Weight</div>
            <div className="text-white font-bold text-lg">{patient.startingWeight} {patient.weightUnit || 'lbs'}</div>
          </div>
        )}
        {patient.currentWeight && (
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-white/60 text-xs">Current Weight</div>
            <div className="text-white font-bold text-lg">{patient.currentWeight} {patient.weightUnit || 'lbs'}</div>
          </div>
        )}
        {patient.targetWeight && (
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-white/60 text-xs">Target Weight</div>
            <div className="text-white font-bold text-lg">{patient.targetWeight} {patient.weightUnit || 'lbs'}</div>
          </div>
        )}
        {patient.height && (
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-white/60 text-xs">Height</div>
            <div className="text-white font-bold text-lg">{patient.height} {patient.heightUnit || 'in'}</div>
          </div>
        )}
      </div>
    </div>
  );
};
