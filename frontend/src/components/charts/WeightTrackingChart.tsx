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
      const bmi = calculateBMI(data.weight, heightInInches);

      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-bold">{data.date}</p>
          <p className="text-white">Weight: {data.weight.toFixed(1)} {patient.weightUnit || 'lbs'}</p>
          <p className="text-white">BMI: {bmi.toFixed(1)}</p>
          <p style={{ color: getCategoryColor(data.bmiCategory) }} className="font-semibold">
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
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              {processedData.map((entry, index) => (
                <stop
                  key={`gradient-${index}`}
                  offset={`${(index / (processedData.length - 1 || 1)) * 100}%`}
                  stopColor={getCategoryColor(entry.bmiCategory)}
                />
              ))}
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis
            stroke="#9ca3af"
            domain={[0, 320]}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: `Weight (${patient.weightUnit || 'lbs'})`, angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />

          {/* Bar Chart */}
          <Bar dataKey="weight" name="Weight" radius={[8, 8, 0, 0]} barSize={40}>
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getCategoryColor(entry.bmiCategory)} />
            ))}
          </Bar>

          {/* Line Chart with gradient */}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="url(#lineGradient)"
            strokeWidth={3}
            dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
            activeDot={{ r: 8 }}
            name="Weight Trend"
          />

          {/* Target Weight Star */}
          {showTargetStar && patient.targetWeight && (
            <ReferenceDot
              x={targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              y={patient.targetWeight}
              r={10}
              fill="#fbbf24"
              stroke="#fff"
              strokeWidth={2}
              shape={<Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />}
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
