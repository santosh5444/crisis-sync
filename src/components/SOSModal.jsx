import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EMERGENCY_TYPES } from '../utils/constants';
import { analyzeCrisis } from '../services/geminiService';
import { db } from '../firebase/config';
import { ref, set, serverTimestamp } from 'firebase/database';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

export default function SOSModal({ isOpen, onClose }) {
  const { user } = useAppContext();
  const [selectedType, setSelectedType] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendSOS = async () => {
    if (!selectedType || !user) {
      toast.error("Please select emergency type and ensure you are logged in.");
      return;
    }
    
    setLoading(true);
    const crisisId = `sos_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const location = user.role === 'guest' ? user.roomNumber : user.floor;

    try {
      const typeConfig = EMERGENCY_TYPES.find(t => t.id === selectedType);
      
      // Perform silent UI close if silent SOS
      if (typeConfig.isSilent) {
        onClose();
        toast("Silent SOS activated. Help is on the way.", { icon: '🤫', style: { background: '#333' } });
      }

      // 1. Analyze with AI
      const aiAnalysis = await analyzeCrisis(selectedType, description, location);
      
      // 2. Save to Firebase
      const crisisData = {
        sosId: crisisId,
        raisedBy: user,
        type: selectedType,
        description,
        severity: aiAnalysis.severity,
        status: 'PENDING',
        buildingId: user.buildingId,
        timestamp: serverTimestamp(),
        geminiAnalysis: aiAnalysis,
        autoEscalated: false
      };

      await set(ref(db, `crises/${user.buildingId}/${crisisId}`), crisisData);

      if (!typeConfig.isSilent) {
        toast.success("SOS Sent! Help is arriving shortly.");
        onClose();
      }
      
    } catch (error) {
      console.error("SOS Error:", error);
      toast.error("Failed to send SOS. Try again!");
    } finally {
      setLoading(false);
      setSelectedType(null);
      setDescription('');
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="bg-card-bg border border-card-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-white">
            <X size={24} />
          </button>
          
          <div className="bg-primary-red/20 p-6 border-b border-primary-red/30">
            <h2 className="text-2xl font-bold text-alert-red flex items-center gap-2">
              🚨 EMERGENCY SOS
            </h2>
            <p className="text-sm text-text-secondary mt-1">Select the exact emergency below.</p>
          </div>

          <div className="p-6">
            {!selectedType ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EMERGENCY_TYPES.map(type => (
                  <button 
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className="p-4 border border-card-border rounded-lg bg-dark-bg hover:border-alert-red hover:bg-primary-red/10 transition flex flex-col items-center justify-center text-center gap-2"
                  >
                    <span className="font-bold">{type.label}</span>
                    {type.isSilent && <span className="text-[10px] bg-card-border px-2 py-1 rounded text-text-secondary">SILENT MODE</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <button onClick={() => setSelectedType(null)} className="text-sm text-info text-left hover:underline">← Change Emergency Type</button>
                <div className="bg-dark-bg border border-card-border p-4 rounded-lg">
                  <p className="font-bold text-alert-red mb-1">Selected: {EMERGENCY_TYPES.find(t=>t.id===selectedType).label}</p>
                  <p className="text-sm text-text-secondary">Location: {user?.role === 'guest' ? `Room ${user.roomNumber}` : user?.floor}</p>
                </div>
                
                <textarea 
                  placeholder="Additional details (optional, e.g., 'Smoke on 3rd floor')"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-alert-red h-24 resize-none"
                />

                <button 
                  onClick={handleSendSOS}
                  disabled={loading}
                  className="w-full bg-primary-red hover:bg-alert-red text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-primary-red/20"
                >
                  {loading ? 'SENDING...' : 'SEND SOS NOW'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
