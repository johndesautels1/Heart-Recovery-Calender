import React, { useState, useEffect, useRef } from 'react';
import { searchMedications, getMedicationInfo, type MedicationInfo } from '../data/medicationDatabase';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface MedicationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onMedicationSelect: (medication: MedicationInfo | null) => void;
  error?: string;
}

export function MedicationAutocomplete({ value, onChange, onMedicationSelect, error }: MedicationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MedicationInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Click outside handler
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);

    if (inputValue.length >= 2) {
      const results = searchMedications(inputValue);
      setSuggestions(results);
      setShowSuggestions(true);
      setHighlightedIndex(-1);

      // Check if exact match exists
      const exactMatch = getMedicationInfo(inputValue);
      if (exactMatch) {
        onMedicationSelect(exactMatch);
      } else {
        onMedicationSelect(null);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      onMedicationSelect(null);
    }
  };

  const handleSelectSuggestion = (medication: MedicationInfo) => {
    onChange(medication.name);
    onMedicationSelect(medication);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-bold mb-2" style={{ color: '#ffffff' }}>
        Medication Name *
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 2 && setShowSuggestions(true)}
        placeholder="Start typing medication name (e.g., Aspirin, Metoprolol)..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none font-bold"
        style={{ color: '#000000' }}
        autoComplete="off"
      />

      {error && (
        <p className="mt-1 text-sm text-red-600 font-bold">{error}</p>
      )}

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
          {suggestions.map((medication, index) => {
            const hasCriticalEffects = medication.sideEffects?.some(
              se => se.severity === 'critical' && se.affectsTherapy
            );
            const hasWarningEffects = medication.sideEffects?.some(
              se => se.severity === 'warning' && se.affectsTherapy
            );

            return (
              <div
                key={`${medication.name}-${index}`}
                className={`px-4 py-3 cursor-pointer transition-colors ${
                  index === highlightedIndex
                    ? 'bg-cobalt-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleSelectSuggestion(medication)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{medication.name}</div>
                    {medication.brandNames && medication.brandNames.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        Brand names: {medication.brandNames.join(', ')}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {medication.category}
                      {medication.description && ` • ${medication.description}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {hasCriticalEffects && (
                      <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold" title="Critical PT warnings">
                        <AlertTriangle className="h-3 w-3" />
                        <span>🚨</span>
                      </div>
                    )}
                    {hasWarningEffects && !hasCriticalEffects && (
                      <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold" title="PT caution advised">
                        <AlertTriangle className="h-3 w-3" />
                        <span>⚠️</span>
                      </div>
                    )}
                    {!hasCriticalEffects && !hasWarningEffects && (
                      <span title="No major PT concerns">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
