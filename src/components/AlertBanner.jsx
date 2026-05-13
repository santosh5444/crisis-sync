import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase/config';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { useAppContext } from '../context/AppContext';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

export default function AlertBanner() {
  const { user } = useAppContext();
  const [broadcast, setBroadcast] = useState(null);
  const audioCtxRef = useRef(null);

  const playSiren = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = 'square';
      
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(400, now);
      
      // Sweep up and down for a harsh siren effect for up to 35 seconds
      for (let i = 0; i < 40; i++) {
        osc.frequency.linearRampToValueAtTime(800, now + (i * 0.8) + 0.4);
        osc.frequency.linearRampToValueAtTime(400, now + (i * 0.8) + 0.8);
      }
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
      gainNode.gain.setValueAtTime(0.3, now + 29.9);
      gainNode.gain.linearRampToValueAtTime(0, now + 30.0);
      
      osc.start(now);
      osc.stop(now + 30.0);
    } catch(e) {
      console.log("Audio play blocked by browser policy.");
    }
  };

  const triggerVibration = () => {
    if (navigator.vibrate) {
      const pattern = [];
      for(let i=0; i<30; i++) { pattern.push(600, 400); }
      navigator.vibrate(pattern);
    }
  };

  const stopHardwareAlerts = () => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0); // Instantly stops vibration
    }
  };

  // Cleanup on unmount or when broadcast is null
  useEffect(() => {
    if (!broadcast) {
      stopHardwareAlerts();
    }
    return () => stopHardwareAlerts();
  }, [broadcast]);

  // Fetch Broadcasts
  useEffect(() => {
    if (!user?.buildingId) return;

    const broadcastsRef = query(ref(db, `broadcasts/${user.buildingId}`), limitToLast(1));
    const unsubscribe = onValue(broadcastsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const keys = Object.keys(data);
        const latest = data[keys[0]];
        // Only show if it's recent (within 30 seconds) and not a CLEAR signal
        if (latest && latest.type !== 'CLEAR' && (Date.now() - latest.timestamp < 30000)) {
          setBroadcast(latest);
        } else {
          setBroadcast(null);
        }
      } else {
        setBroadcast(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Handle Auto-Timeout explicitly since Firebase onValue doesn't re-trigger on time passing
  useEffect(() => {
    if (broadcast) {
      const age = Date.now() - broadcast.timestamp;
      const remaining = 30000 - age;
      if (remaining > 0) {
        const timer = setTimeout(() => setBroadcast(null), remaining);
        return () => clearTimeout(timer);
      } else {
        setBroadcast(null);
      }
    }
  }, [broadcast]);

  // Trigger Hardware Alerts
  useEffect(() => {
    if (broadcast && broadcast.type === 'EMERGENCY') {
      const playedKey = `siren_played_${broadcast.timestamp}`;
      if (!sessionStorage.getItem(playedKey)) {
        sessionStorage.setItem(playedKey, 'true');
        playSiren();
        triggerVibration();
      }
    }
  }, [broadcast]);

  if (!broadcast) return null;

  const bgColors = {
    'EMERGENCY': 'bg-alert-red',
    'INFO': 'bg-info',
    'RESOLVED': 'bg-success'
  };

  const Icons = {
    'EMERGENCY': AlertTriangle,
    'INFO': Info,
    'RESOLVED': CheckCircle
  };

  const Icon = Icons[broadcast.type] || Info;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: -50, opacity: 0 }}
        className={`${bgColors[broadcast.type] || 'bg-alert-red'} text-white px-4 py-3 sticky top-0 z-[9999] shadow-lg flex items-center justify-center gap-3 font-bold`}
      >
        <Icon className="animate-pulse" size={24} />
        <span>{broadcast.message}</span>
      </motion.div>
    </AnimatePresence>
  );
}
