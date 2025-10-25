import React from 'react';
import { AlertTriangle, AlertCircle, Info, Activity } from 'lucide-react';
import { type MedicationInfo } from '../data/medicationDatabase';

interface SideEffectWarningsProps {
  medication: MedicationInfo;
}

export function SideEffectWarnings({ medication }: SideEffectWarningsProps) {
  if (!medication.sideEffects || medication.sideEffects.length === 0) {
    return null;
  }

  const criticalEffects = medication.sideEffects.filter(
    se => se.severity === 'critical' && se.affectsTherapy
  );
  const warningEffects = medication.sideEffects.filter(
    se => se.severity === 'warning' && se.affectsTherapy
  );
  const mildEffects = medication.sideEffects.filter(
    se => se.severity === 'mild' || !se.affectsTherapy
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Critical Warnings - RED FLAGS */}
      {criticalEffects.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-bold text-sm">🚨 CRITICAL PT WARNINGS</span>
            </div>
          </div>
          <div className="space-y-2">
            {criticalEffects.map((effect, index) => (
              <div key={index} className="flex items-start gap-2 bg-white/70 p-2 rounded">
                <span className="text-red-600 font-bold">•</span>
                <span className="font-bold text-red-900">{effect.effect}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Effects - YELLOW FLAGS */}
      {warningEffects.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-yellow-600 text-white px-3 py-1 rounded-full flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-bold text-sm">⚠️ CAUTION FOR PT</span>
            </div>
          </div>
          <div className="space-y-2">
            {warningEffects.map((effect, index) => (
              <div key={index} className="flex items-start gap-2 bg-white/70 p-2 rounded">
                <span className="text-yellow-600 font-bold">•</span>
                <span className="font-bold text-yellow-900">{effect.effect}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Physical Therapy Specific Warnings */}
      {medication.therapyWarnings && medication.therapyWarnings.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-400 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-purple-600" />
            <span className="font-bold text-purple-900">Physical Therapy Considerations</span>
          </div>
          <ul className="space-y-2">
            {medication.therapyWarnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-purple-900 font-semibold">
                <span className="text-purple-600">→</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mild Effects - Info Only */}
      {mildEffects.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-blue-900 text-sm">Other Side Effects</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {mildEffects.map((effect, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold"
              >
                {effect.effect}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dosage Information Widget */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-4">
        <div className="font-bold text-green-900 mb-2">Common Dosages</div>
        <div className="flex flex-wrap gap-2">
          {medication.commonDosages.map((dosage, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-green-100 text-green-900 rounded-lg text-sm font-bold border border-green-300"
            >
              {dosage}
            </span>
          ))}
        </div>
        {medication.description && (
          <p className="text-sm text-green-800 mt-3 font-semibold">
            {medication.description}
          </p>
        )}
      </div>
    </div>
  );
}
