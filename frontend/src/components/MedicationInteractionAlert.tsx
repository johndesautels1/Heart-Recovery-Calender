import React from 'react';
import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react';
import { type MedicationWarning } from '../types';

interface MedicationInteractionAlertProps {
  warnings: MedicationWarning[];
  onDismiss?: () => void;
}

/**
 * Food-Medication Interaction Warning Component
 *
 * Displays warnings when foods in a meal interact with the user's cardiac medications.
 * Uses severity-based color coding:
 * - Critical (red): Life-threatening interactions
 * - Severe (orange): Serious interactions requiring immediate attention
 * - Moderate (yellow): Caution advised
 * - Mild (blue): Informational
 */
export function MedicationInteractionAlert({ warnings, onDismiss }: MedicationInteractionAlertProps) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  // Group warnings by severity
  const criticalWarnings = warnings.filter(w => w.severity === 'critical');
  const severeWarnings = warnings.filter(w => w.severity === 'severe');
  const moderateWarnings = warnings.filter(w => w.severity === 'moderate');
  const mildWarnings = warnings.filter(w => w.severity === 'mild');

  return (
    <div className="space-y-4">
      {/* Critical Warnings - RED BANNER */}
      {criticalWarnings.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-600 rounded-lg p-4 shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-red-600 text-white px-3 py-1.5 rounded-full flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                <span className="font-bold text-sm">LIFE-THREATENING INTERACTION</span>
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-red-600 hover:text-red-800 font-bold text-xl leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            )}
          </div>
          <div className="space-y-3">
            {criticalWarnings.map((warning, index) => (
              <div key={index} className="bg-white/80 p-3 rounded-lg border border-red-300">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-red-900 mb-1">
                      {warning.medicationName} ({warning.medicationCategory})
                    </div>
                    <div className="text-red-800 font-semibold mb-2">
                      Foods: {warning.matchedFoods.join(', ')}
                    </div>
                    <div className="text-red-900 mb-2">{warning.interaction}</div>
                    <div className="text-sm text-red-700 italic mb-2">
                      Why: {warning.mechanism}
                    </div>
                    <div className="bg-red-100 border-l-4 border-red-600 p-2 mt-2">
                      <div className="font-bold text-red-900 text-sm">What to do:</div>
                      <div className="text-red-800 text-sm">{warning.recommendation}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Severe Warnings - ORANGE BANNER */}
      {severeWarnings.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-500 rounded-lg p-4 shadow-md">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-orange-600 text-white px-3 py-1.5 rounded-full flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-bold text-sm">SERIOUS MEDICATION INTERACTION</span>
              </div>
            </div>
            {onDismiss && criticalWarnings.length === 0 && (
              <button
                onClick={onDismiss}
                className="text-orange-600 hover:text-orange-800 font-bold text-xl leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            )}
          </div>
          <div className="space-y-3">
            {severeWarnings.map((warning, index) => (
              <div key={index} className="bg-white/80 p-3 rounded-lg border border-orange-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-orange-900 mb-1">
                      {warning.medicationName} ({warning.medicationCategory})
                    </div>
                    <div className="text-orange-800 font-semibold mb-2">
                      Foods: {warning.matchedFoods.join(', ')}
                    </div>
                    <div className="text-orange-900 mb-2">{warning.interaction}</div>
                    <div className="text-sm text-orange-700 italic mb-2">
                      Why: {warning.mechanism}
                    </div>
                    <div className="bg-orange-100 border-l-4 border-orange-600 p-2 mt-2">
                      <div className="font-bold text-orange-900 text-sm">What to do:</div>
                      <div className="text-orange-800 text-sm">{warning.recommendation}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderate Warnings - YELLOW BANNER */}
      {moderateWarnings.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span className="font-bold text-yellow-900">Moderate Interaction</span>
          </div>
          <div className="space-y-2">
            {moderateWarnings.map((warning, index) => (
              <div key={index} className="bg-white/70 p-2 rounded border border-yellow-300">
                <div className="font-semibold text-yellow-900">
                  {warning.medicationName} + {warning.matchedFoods.join(', ')}
                </div>
                <div className="text-sm text-yellow-800">{warning.interaction}</div>
                <div className="text-xs text-yellow-700 mt-1">{warning.recommendation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mild Warnings - BLUE INFO */}
      {mildWarnings.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-blue-900 text-sm">Minor Interaction</span>
          </div>
          <div className="space-y-2">
            {mildWarnings.map((warning, index) => (
              <div key={index} className="text-sm text-blue-800">
                <span className="font-semibold">{warning.medicationName}:</span> {warning.interaction}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
