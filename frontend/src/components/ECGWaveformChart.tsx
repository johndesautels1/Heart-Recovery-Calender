import React, { useEffect, useRef, useState } from 'react';
import { Activity, Zap, ZoomIn, ZoomOut } from 'lucide-react';

interface ECGWaveformChartProps {
  ecgData: number[]; // ECG samples in millivolts
  samplingRate: number; // Hz (130 for Polar H10)
  showRWaveMarkers?: boolean;
  showGridlines?: boolean;
  width?: number;
  height?: number;
  paperSpeed?: number; // mm/s (25 or 50 for medical standard)
  enableZoom?: boolean; // Show zoom controls
}

export const ECGWaveformChart: React.FC<ECGWaveformChartProps> = ({
  ecgData,
  samplingRate = 130,
  showRWaveMarkers = true,
  showGridlines = true,
  width = 1200,
  height = 400,
  paperSpeed: initialPaperSpeed = 25,
  enableZoom = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [rPeaks, setRPeaks] = useState<number[]>([]);
  const [paperSpeed, setPaperSpeed] = useState<number>(initialPaperSpeed); // mm/s

  // Calculate actual canvas width based on paper speed
  // Medical ECG standard: 25 mm/s or 50 mm/s
  // 1 pixel ≈ 0.5 mm for screen display
  const secondsOfData = ecgData.length / samplingRate;
  const calculatedWidth = paperSpeed === 50
    ? Math.max(width, secondsOfData * 100) // 50mm/s = 100 pixels/second
    : paperSpeed === 25
    ? Math.max(width, secondsOfData * 50)  // 25mm/s = 50 pixels/second
    : width; // Default compressed view

  const displayWidth = calculatedWidth;

  // Simple R-peak detection (threshold-based)
  const detectRPeaks = (samples: number[]): number[] => {
    if (samples.length < 10) return [];

    const peaks: number[] = [];
    const threshold = Math.max(...samples) * 0.6; // 60% of max value

    for (let i = 5; i < samples.length - 5; i++) {
      if (samples[i] > threshold &&
          samples[i] > samples[i - 1] &&
          samples[i] > samples[i + 1] &&
          samples[i] > samples[i - 2] &&
          samples[i] > samples[i + 2]) {
        // Ensure peaks are at least 0.3s apart (minimum heart rate 200 BPM)
        if (peaks.length === 0 || i - peaks[peaks.length - 1] > samplingRate * 0.3) {
          peaks.push(i);
        }
      }
    }

    return peaks;
  };

  // Calculate heart rate from R-R intervals
  const calculateHeartRate = (peaks: number[]): number | null => {
    if (peaks.length < 2) return null;

    const rrIntervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      const rrSamples = peaks[i] - peaks[i - 1];
      const rrSeconds = rrSamples / samplingRate;
      rrIntervals.push(rrSeconds);
    }

    const avgRR = rrIntervals.reduce((sum, val) => sum + val, 0) / rrIntervals.length;
    return Math.round(60 / avgRR);
  };

  useEffect(() => {
    if (ecgData.length > 0) {
      const peaks = detectRPeaks(ecgData);
      setRPeaks(peaks);
      const hr = calculateHeartRate(peaks);
      if (hr) setCurrentHeartRate(hr);
    }
  }, [ecgData, samplingRate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, displayWidth, height);

      // Draw gridlines (medical ECG paper style)
      if (showGridlines) {
        // Small grid (1mm = 0.04s horizontal, 0.1mV vertical)
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.15)';
        ctx.lineWidth = 0.5;

        // Calculate grid spacing based on paper speed
        const pixelsPerSecond = paperSpeed === 50 ? 100 : paperSpeed === 25 ? 50 : displayWidth / secondsOfData;
        const smallGridX = pixelsPerSecond * 0.04; // 1mm = 0.04s
        const smallGridY = height / 40; // 40 small squares

        const numVerticalLines = Math.ceil(displayWidth / smallGridX);
        for (let i = 0; i <= numVerticalLines; i++) {
          ctx.beginPath();
          ctx.moveTo(i * smallGridX, 0);
          ctx.lineTo(i * smallGridX, height);
          ctx.stroke();
        }

        for (let i = 0; i <= 40; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * smallGridY);
          ctx.lineTo(displayWidth, i * smallGridY);
          ctx.stroke();
        }

        // Large grid (5mm = 0.2s horizontal, 0.5mV vertical)
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.3)';
        ctx.lineWidth = 1;

        const numLargeVerticalLines = Math.ceil(displayWidth / (smallGridX * 5));
        for (let i = 0; i <= numLargeVerticalLines; i++) {
          ctx.beginPath();
          ctx.moveTo(i * smallGridX * 5, 0);
          ctx.lineTo(i * smallGridX * 5, height);
          ctx.stroke();
        }

        for (let i = 0; i <= 8; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * smallGridY * 5);
          ctx.lineTo(displayWidth, i * smallGridY * 5);
          ctx.stroke();
        }
      }

      // Calculate display parameters
      const samplesPerPixel = ecgData.length / displayWidth;
      const centerY = height / 2;
      const voltageScale = height / 6; // Scale for ±3mV range

      // Draw ECG waveform with PEAK-PRESERVING rendering for sharp QRS complexes
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 4;

      ctx.beginPath();
      for (let x = 0; x < displayWidth; x++) {
        // CRITICAL: For each pixel, find min and max samples to preserve sharp peaks (QRS complexes)
        const startSampleIndex = Math.floor(x * samplesPerPixel);
        const endSampleIndex = Math.floor((x + 1) * samplesPerPixel);

        let minVoltage = ecgData[startSampleIndex];
        let maxVoltage = ecgData[startSampleIndex];

        // Find min/max in this pixel's sample range to preserve peaks
        for (let i = startSampleIndex; i < endSampleIndex && i < ecgData.length; i++) {
          minVoltage = Math.min(minVoltage, ecgData[i]);
          maxVoltage = Math.max(maxVoltage, ecgData[i]);
        }

        const yMin = centerY - (maxVoltage * voltageScale);
        const yMax = centerY - (minVoltage * voltageScale);

        if (x === 0) {
          ctx.moveTo(x, yMin);
        } else {
          // Draw vertical line for this pixel to show full range (preserves QRS peaks)
          ctx.lineTo(x, yMin);
          ctx.lineTo(x, yMax);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw R-wave markers
      if (showRWaveMarkers && rPeaks.length > 0) {
        rPeaks.forEach(peakIndex => {
          const x = peakIndex / samplesPerPixel;
          if (x >= 0 && x < displayWidth) {
            const voltage = ecgData[peakIndex];
            const y = centerY - (voltage * voltageScale);

            // Draw marker line
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            // Draw R-peak dot
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();

            ctx.shadowBlur = 0;
          }
        });
      }

      // Draw voltage scale
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';

      for (let i = -3; i <= 3; i++) {
        const y = centerY - (i * voltageScale);
        ctx.fillText(`${i}mV`, displayWidth - 5, y + 4);
      }

      // Draw time scale
      ctx.textAlign = 'center';
      const numTimeMarkers = Math.min(10, Math.ceil(secondsOfData));
      for (let i = 0; i <= numTimeMarkers; i++) {
        const x = (i / numTimeMarkers) * displayWidth;
        const time = (i / numTimeMarkers) * secondsOfData;
        ctx.fillText(`${time.toFixed(1)}s`, x, height - 5);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ecgData, rPeaks, showGridlines, showRWaveMarkers, displayWidth, height, samplingRate, paperSpeed, secondsOfData]);

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
            <Activity className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-400">ECG Waveform</h3>
            <p className="text-xs text-gray-400">
              Real-time @ {samplingRate} Hz • {ecgData.length} samples • {secondsOfData.toFixed(1)}s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Paper Speed Controls */}
          {enableZoom && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Paper Speed:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPaperSpeed(0)}
                  className={`px-3 py-1 text-xs rounded border transition-all ${
                    paperSpeed === 0
                      ? 'bg-blue-500/30 border-blue-500 text-blue-300'
                      : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <ZoomOut className="h-3 w-3 inline mr-1" />
                  Fit
                </button>
                <button
                  onClick={() => setPaperSpeed(25)}
                  className={`px-3 py-1 text-xs rounded border transition-all ${
                    paperSpeed === 25
                      ? 'bg-green-500/30 border-green-500 text-green-300'
                      : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  25 mm/s
                </button>
                <button
                  onClick={() => setPaperSpeed(50)}
                  className={`px-3 py-1 text-xs rounded border transition-all ${
                    paperSpeed === 50
                      ? 'bg-purple-500/30 border-purple-500 text-purple-300'
                      : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <ZoomIn className="h-3 w-3 inline mr-1" />
                  50 mm/s
                </button>
              </div>
            </div>
          )}

          {currentHeartRate && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                <Zap className="h-5 w-5 text-yellow-400 animate-pulse" />
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-400">{currentHeartRate}</div>
                <div className="text-xs text-gray-400">BPM</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Canvas - Scrollable when stretched */}
      <div className={`relative rounded-lg border-2 border-red-500/30 bg-slate-900 ${paperSpeed > 0 ? 'overflow-x-auto' : 'overflow-hidden'}`}>
        <canvas
          ref={canvasRef}
          width={displayWidth}
          height={height}
          className={paperSpeed > 0 ? 'h-auto' : 'w-full h-auto'}
        />

        {ecgData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Activity className="h-12 w-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500">Waiting for ECG data...</p>
              <p className="text-xs text-gray-600 mt-1">Connect Polar H10 to stream waveform</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-500"></div>
          <span className="text-gray-400">ECG Signal</span>
        </div>
        {showRWaveMarkers && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-yellow-400"></div>
            <span className="text-gray-400">R-Wave Peaks</span>
          </div>
        )}
        {showGridlines && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-900"></div>
            <span className="text-gray-400">Medical Grid (0.2s × 0.5mV)</span>
          </div>
        )}
      </div>
    </div>
  );
};
