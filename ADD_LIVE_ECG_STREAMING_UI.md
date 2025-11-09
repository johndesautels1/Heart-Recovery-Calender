# Add Live ECG Streaming UI - Quick Implementation Guide

## ⚡ Quick Test (Do This NOW While Your ECG is Recording)

Open browser console (F12) and run:

```javascript
fetch('http://localhost:4000/api/polar-h10/start-stream', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Streaming started!', data);
  alert('ECG Streaming Started! Check ACD-1000 display');
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Error: ' + err.message);
});
```

This will start streaming IMMEDIATELY without waiting for UI changes!

---

## 📝 UI Code to Add (For Permanent Solution)

### 1. Add State Variables

In `VitalsPage.tsx`, after line 213, add:

```typescript
// Polar H10 Live Streaming State
const [isStreaming, setIsStreaming] = useState(false);
const [streamingStatus, setStreamingStatus] = useState<'idle' | 'connecting' | 'streaming' | 'error'>('idle');
const [streamError, setStreamError] = useState<string | null>(null);
const [uploadingFile, setUploadingFile] = useState(false);
```

### 2. Add Handler Functions

Add these functions before the return statement:

```typescript
// Start Polar H10 Bluetooth streaming
const handleStartECGStream = async () => {
  try {
    setStreamingStatus('connecting');
    setStreamError(null);

    const response = await fetch('http://localhost:4000/api/polar-h10/start-stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      setIsStreaming(true);
      setStreamingStatus('streaming');
      toast.success('🫀 Live ECG streaming started!');
    } else {
      setStreamingStatus('error');
      setStreamError(data.error || 'Failed to start streaming');
      toast.error('Failed to start ECG streaming');
    }
  } catch (error: any) {
    console.error('Error starting ECG stream:', error);
    setStreamingStatus('error');
    setStreamError(error.message);
    toast.error('Error starting ECG streaming');
  }
};

// Stop Polar H10 streaming
const handleStopECGStream = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/polar-h10/stop-stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      setIsStreaming(false);
      setStreamingStatus('idle');
      toast.success('ECG streaming stopped');
    }
  } catch (error: any) {
    console.error('Error stopping ECG stream:', error);
    toast.error('Error stopping ECG streaming');
  }
};

// Handle ECG file upload
const handleECGFileUpload = async (file: File) => {
  try {
    setUploadingFile(true);

    const formData = new FormData();
    formData.append('ecgFile', file);

    const response = await fetch('http://localhost:4000/api/ecg/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      toast.success(`✅ Imported ${data.samplesCount} ECG samples!`);
      // Refresh vitals display
      fetchVitals();
    } else {
      toast.error('Failed to import ECG file');
    }
  } catch (error: any) {
    console.error('Error uploading ECG file:', error);
    toast.error('Error importing ECG file');
  } finally {
    setUploadingFile(false);
  }
};
```

### 3. Add UI Controls in ECG Modal

Replace line 8248-8250 (the LiveVitalsDisplay section) with:

```typescript
{/* Live Connection Status & Streaming Controls */}
<div className="px-6 py-4 space-y-4">
  <LiveVitalsDisplay />

  {/* Streaming Control Panel */}
  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30 p-4">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h4 className="text-sm font-bold text-blue-400">Polar H10 Live Streaming</h4>
        <p className="text-xs text-gray-400 mt-1">
          Stream ECG directly from your Polar H10 via Bluetooth
        </p>
      </div>
      <div className="flex items-center gap-2">
        {streamingStatus === 'streaming' && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs text-green-400 font-bold">LIVE</span>
          </div>
        )}
        {!isStreaming ? (
          <button
            onClick={handleStartECGStream}
            disabled={streamingStatus === 'connecting'}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Activity className="h-4 w-4" />
            {streamingStatus === 'connecting' ? 'Connecting...' : 'Start Live Stream'}
          </button>
        ) : (
          <button
            onClick={handleStopECGStream}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Stop Stream
          </button>
        )}
      </div>
    </div>

    {streamError && (
      <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
        <p className="text-xs text-red-400">❌ {streamError}</p>
      </div>
    )}

    {/* File Upload Zone */}
    <div className="mt-4 pt-4 border-t border-gray-700">
      <p className="text-xs text-gray-400 mb-2">Or import ECG file from third-party app:</p>
      <div
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleECGFileUpload(file);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg p-6 text-center cursor-pointer transition-all"
      >
        <input
          type="file"
          id="ecgFileInput"
          accept=".hrv,.csv,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleECGFileUpload(file);
          }}
          className="hidden"
        />
        <label htmlFor="ecgFileInput" className="cursor-pointer">
          {uploadingFile ? (
            <div className="text-blue-400">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-bold">Uploading...</p>
            </div>
          ) : (
            <>
              <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-300">Drop ECG file here or click to browse</p>
              <p className="text-xs text-gray-500 mt-1">Supports .HRV, .CSV, .TXT files</p>
            </>
          )}
        </label>
      </div>
    </div>
  </div>
</div>
```

---

## 🎯 Testing Steps

1. **Test live streaming**:
   - Open VitalsPage
   - Click ECG Monitor
   - Click "Start Live Stream"
   - Should see: Connecting... → LIVE badge → ECG waveform appears

2. **Test file upload**:
   - Export ECG file from third-party app
   - Drag file to upload zone
   - Should see: "Imported X ECG samples!"

3. **Test stop streaming**:
   - Click "Stop Stream"
   - LIVE badge disappears
   - Streaming stops

---

## ✅ What You Get

- ✅ "Start Live Stream" button in ECG Modal
- ✅ Real-time streaming status indicator
- ✅ "Stop Stream" button
- ✅ Drag-and-drop file import
- ✅ Error handling and user feedback
- ✅ Automatic connection to backend Bluetooth service

---

**Use the Quick Test code above RIGHT NOW to start streaming while your ECG is still recording!** 🚀
