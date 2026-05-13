import React, { useState } from 'react';
import SOSModal from './SOSModal';
import { useAppContext } from '../context/AppContext';

export default function SOSButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAppContext();

  // If no user context (e.g. on landing page before login), we might want to hide it or redirect.
  // For now, let's keep it visible everywhere, but modal handles logic.
  
  if (!user) return null; // Only show if logged in to a building

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9900]">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-red hover:bg-alert-red text-white w-20 h-20 rounded-full font-extrabold text-xl shadow-[0_0_20px_rgba(255,24,68,0.5)] flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite] transition-transform hover:scale-105"
        >
          SOS
        </button>
      </div>

      <SOSModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
