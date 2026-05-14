import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_BUILDING_ID } from '../utils/constants';
import { ArrowLeft } from 'lucide-react';

export default function QRScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [manualId, setManualId] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const navigate = useNavigate();
  const html5QrCodeRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // 1. Stop camera if running
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      // 2. Create instance if needed
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader");
      }

      // 3. Scan the file
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      setScanResult(decodedText);
      
      // 4. Robust ID Extraction
      let target = decodedText;
      if (decodedText.includes('/onboarding/')) {
        const urlObj = new URL(decodedText.startsWith('http') ? decodedText : `${window.location.origin}${decodedText}`);
        const pathParts = urlObj.pathname.split('/');
        target = pathParts[pathParts.indexOf('onboarding') + 1];
        
        // Preserve query params if any
        const search = urlObj.search;
        setTimeout(() => navigate(`/onboarding/${target}${search}`), 1000);
      } else {
        setTimeout(() => navigate(`/onboarding/${target}`), 1000);
      }
    } catch (err) {
      console.error("Error scanning file", err);
      alert("Could not find a valid QR code in that image. Please try another photo.");
    }
  };

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
        // Default to back camera if found
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        setSelectedCamera(backCamera ? backCamera.id : devices[0].id);
      }
    }).catch(err => console.error("Error getting cameras", err));
  }, []);

  useEffect(() => {
    if (!selectedCamera) return;
    
    html5QrCodeRef.current = new Html5Qrcode("reader");
    let started = false;
    
    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 } 
    };

    html5QrCodeRef.current.start(
      selectedCamera, // Use selected camera ID
      config,
      (decodedText) => {
        // Success
        started = false; // Prevents unmount stop if we stop here
        html5QrCodeRef.current.stop().then(() => {
          setScanResult(decodedText);
          // Check if decodedText is a URL and extract path or just use it
          let target = decodedText;
          if (decodedText.includes('/onboarding/')) {
            const parts = decodedText.split('/onboarding/');
            target = parts[parts.length - 1];
          }
          setTimeout(() => navigate(`/onboarding/${target}`), 1000);
        }).catch(err => console.error("Error stopping scanner", err));
      },
      (errorMessage) => {
        // Ignore background scan errors
      }
    ).then(() => {
      started = true;
    }).catch(err => {
      console.error("Unable to start scanner", err);
    });

    return () => {
      if (started) {
        html5QrCodeRef.current.stop().catch(err => console.error("Error stopping scanner on unmount", err));
      }
    };
  }, [selectedCamera, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-dark-bg relative">
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-4 left-4 text-text-secondary hover:text-white flex items-center gap-2 transition"
      >
        <ArrowLeft size={16} /> Back to Home
      </button>

      <div className="max-w-md w-full bg-card-bg p-8 rounded-xl border border-card-border shadow-2xl text-center">
        <style>{`
          #reader video {
            width: 100% !important;
            height: auto !important;
            border-radius: 0.5rem;
          }
        `}</style>
        <h2 className="text-3xl font-bold mb-2 text-white">Enter Building</h2>
        <p className="text-text-secondary mb-8">Scan the building's QR code to connect to the emergency network.</p>
        
        {cameras.length > 1 && (
          <div className="mb-4 text-left">
            <label className="block text-xs text-text-secondary mb-1">Switch Camera:</label>
            <select 
              value={selectedCamera} 
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full bg-dark-bg border border-card-border rounded-lg p-2 text-white text-sm focus:outline-none focus:border-info"
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
              ))}
            </select>
          </div>
        )}

        {scanResult ? (
          <div className="bg-success/20 border border-success text-success p-4 rounded-lg mb-4">
            <h3 className="font-bold text-lg">✅ Connected!</h3>
            <p className="text-sm mt-1">Redirecting to onboarding...</p>
          </div>
        ) : (
          <div id="reader" className="w-full bg-black rounded-lg overflow-hidden border border-card-border"></div>
        )}

        <div className="mt-6 pt-4 border-t border-card-border">
          <p className="text-sm text-text-secondary mb-3">Or upload a photo of the QR code:</p>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="w-full bg-dark-bg border border-card-border rounded-lg p-2 text-white text-sm focus:outline-none focus:border-info"
          />
        </div>

        <div className="mt-6 pt-4 border-t border-card-border">
          <p className="text-sm text-text-secondary mb-3">Scanner not working? Enter Building ID:</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={manualId} 
              onChange={(e) => setManualId(e.target.value.toUpperCase())}
              placeholder="e.g. APOLLO_1234"
              className="flex-1 bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-info"
            />
            <button 
              onClick={() => {
                if (manualId.trim()) navigate(`/onboarding/${manualId.trim()}`);
              }}
              className="bg-info hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold transition"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
