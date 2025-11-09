import React, { useEffect, useState } from 'react';
import { AlertTriangle, Heart, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { detectQRS, QRSDetectionResult } from '../utils/qrsDetection';
import { classifyArrhythmia, ArrhythmiaClassification, ArrhythmiaClassifier } from '../utils/arrhythmiaClassifier';
import { analyzeSTSegment, STSegmentResult, STSegmentAnalyzer } from '../utils/stSegmentAnalysis';

interface ECGAnalysisPanelProps {
  ecgData: number[]; // ECG waveform data in mV
  samplingRate: number; // Hz (130 for Polar H10)
  autoAnalyze?: boolean; // Automatically run analysis when data changes
}

export const ECGAnalysisPanel: React.FC<ECGAnalysisPanelProps> = ({
  ecgData,
  samplingRate = 130,
  autoAnalyze = true,
}) => {
  const [qrsResults, setQrsResults] = useState<QRSDetectionResult | null>(null);
  const [arrhythmiaResults, setArrhythmiaResults] = useState<ArrhythmiaClassification | null>(null);
  const [stResults, setStResults] = useState<STSegmentResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Run analysis when ECG data changes
  useEffect(() => {
    if (autoAnalyze && ecgData.length > samplingRate * 2) {
      runAnalysis();
    }
  }, [ecgData, autoAnalyze, samplingRate]);

  const runAnalysis = () => {
    setIsAnalyzing(true);

    try {
      // Step 1: QRS Detection
      const qrs = detectQRS(ecgData, samplingRate, Date.now());
      setQrsResults(qrs);

      // Step 2: Arrhythmia Classification (requires R-R intervals from QRS detection)
      if (qrs.rrIntervals.length >= 5) {
        const arrhythmia = classifyArrhythmia(qrs.rrIntervals, ecgData);
        setArrhythmiaResults(arrhythmia);
      }

      // Step 3: ST Segment Analysis (analyze first detected heartbeat)
      if (qrs.rPeakIndices.length >= 2) {
        const firstRPeak = qrs.rPeakIndices[0];
        const secondRPeak = qrs.rPeakIndices[1];
        const beatSegment = ecgData.slice(firstRPeak, secondRPeak);
        const stSegment = analyzeSTSegment(beatSegment, 0, samplingRate);
        setStResults(stSegment);
      }
    } catch (error) {
      console.error('[ECG Analysis] Error during analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get highest risk level across all analyses
  const getOverallRisk = (): 'normal' | 'low' | 'moderate' | 'high' | 'critical' => {
    const risks = [];
    if (arrhythmiaResults) risks.push(arrhythmiaResults.riskLevel);
    if (stResults) {
      const stRiskMap: any = {
        none: 'normal',
        mild: 'low',
        moderate: 'moderate',
        severe: 'high',
        critical: 'critical',
      };
      risks.push(stRiskMap[stResults.severity]);
    }

    if (risks.includes('critical')) return 'critical';
    if (risks.includes('high')) return 'high';
    if (risks.includes('moderate')) return 'moderate';
    if (risks.includes('low')) return 'low';
    return 'normal';
  };

  const overallRisk = getOverallRisk();

  const riskColors: any = {
    normal: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400' },
    low: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400' },
    moderate: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400' },
    high: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400' },
    critical: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400 animate-pulse' },
  };

  const riskColor = riskColors[overallRisk];

  // Collect all alerts
  const allAlerts = [
    ...(arrhythmiaResults?.alerts || []),
    ...(stResults?.alerts || []),
  ];

  // Collect all recommendations
  const allRecommendations = [
    ...(arrhythmiaResults?.recommendations || []),
    ...(stResults?.recommendations || []),
  ];

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${riskColor.bg} border ${riskColor.border}`}>
            <Activity className={`h-5 w-5 ${riskColor.text}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-purple-400">Advanced Cardiac Analysis</h3>
            <p className="text-xs text-gray-400">
              Real-time arrhythmia detection and ischemia monitoring
            </p>
          </div>
        </div>

        {!autoAnalyze && (
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing || ecgData.length < samplingRate * 2}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        )}
      </div>

      {/* Analysis Results Grid */}
      <div className="grid grid-cols-3 gap-4 px-4 mb-4">
        {/* QRS Detection Card */}
        <div className="p-4 rounded-lg border-2 bg-blue-500/10 border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-bold text-blue-400 uppercase tracking-wide">
              QRS Detection
            </span>
          </div>

          {qrsResults ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">R-Peaks Found:</span>
                  <span className="text-xl font-bold text-blue-300">{qrsResults.rPeakIndices.length}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">Heart Rate:</span>
                  <span className="text-2xl font-bold text-blue-300">{qrsResults.heartRate} <span className="text-sm">BPM</span></span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">Avg Confidence:</span>
                  <span className="text-lg font-bold text-blue-300">
                    {qrsResults.confidence.length > 0
                      ? Math.round((qrsResults.confidence.reduce((a, b) => a + b, 0) / qrsResults.confidence.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No QRS data available</p>
            </div>
          )}
        </div>

        {/* Arrhythmia Classification Card */}
        <div className={`p-4 rounded-lg border-2 ${riskColor.bg} ${riskColor.border}`}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className={`h-4 w-4 ${riskColor.text}`} />
            <span className={`text-sm font-bold ${riskColor.text} uppercase tracking-wide`}>
              Rhythm Analysis
            </span>
          </div>

          {arrhythmiaResults ? (
            <>
              <div className="space-y-2">
                <div className="text-center mb-2">
                  <span className={`text-sm font-bold ${riskColor.text}`}>
                    {arrhythmiaResults.type}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">Risk Level:</span>
                  <span className={`text-lg font-bold ${riskColor.text} uppercase`}>
                    {arrhythmiaResults.riskLevel}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">RR Variability:</span>
                  <span className="text-sm font-bold text-gray-300">
                    {arrhythmiaResults.rrStdDev.toFixed(1)} ms
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">PVCs Detected:</span>
                  <span className="text-sm font-bold text-gray-300">
                    {arrhythmiaResults.pvcCount}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <TrendingUp className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Collecting rhythm data...</p>
            </div>
          )}
        </div>

        {/* ST Segment Analysis Card */}
        <div className={`p-4 rounded-lg border-2 ${stResults ? riskColor.bg : 'bg-gray-500/10'} ${stResults ? riskColor.border : 'border-gray-500/30'}`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className={`h-4 w-4 ${stResults ? riskColor.text : 'text-gray-400'}`} />
            <span className={`text-sm font-bold ${stResults ? riskColor.text : 'text-gray-400'} uppercase tracking-wide`}>
              ST Segment
            </span>
          </div>

          {stResults ? (
            <>
              <div className="space-y-2">
                <div className="text-center mb-2">
                  <span className={`text-sm font-bold ${riskColor.text}`}>
                    {stResults.status}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">ST Deviation:</span>
                  <span className={`text-lg font-bold ${riskColor.text}`}>
                    {stResults.stDeviation >= 0 ? '+' : ''}{stResults.stDeviation.toFixed(2)} mV
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">J-Point:</span>
                  <span className="text-sm font-bold text-gray-300">
                    {stResults.jPoint !== null ? `${stResults.jPoint.toFixed(2)} mV` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">Confidence:</span>
                  <span className="text-sm font-bold text-gray-300">
                    {Math.round(stResults.confidence * 100)}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <AlertTriangle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Analyzing ST segment...</p>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      {allAlerts.length > 0 && (
        <div className={`mx-4 mb-4 p-4 rounded-lg border-2 ${riskColor.bg} ${riskColor.border}`}>
          <div className="flex items-start gap-2">
            <AlertCircle className={`h-5 w-5 ${riskColor.text} mt-0.5 flex-shrink-0`} />
            <div className="flex-1">
              <h4 className={`text-sm font-bold ${riskColor.text} mb-2`}>Alerts & Findings</h4>
              <ul className="space-y-1">
                {allAlerts.map((alert, idx) => (
                  <li key={idx} className="text-xs text-gray-300">
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {allRecommendations.length > 0 && (
        <div className="mx-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-2">
            <Activity className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-blue-400 mb-2">Recommendations</h4>
              <ul className="space-y-1 list-disc list-inside">
                {allRecommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-blue-300">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mx-4 mt-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
        <p className="text-xs text-gray-400 italic text-center">
          ⚠️ This analysis is for monitoring purposes only and should not replace professional medical diagnosis.
          Always seek immediate medical attention for chest pain or suspected heart problems.
        </p>
      </div>
    </div>
  );
};
