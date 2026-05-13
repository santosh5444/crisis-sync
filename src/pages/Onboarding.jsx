import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { STAFF_PROFESSIONS } from '../utils/constants';
import { useAppContext } from '../context/AppContext';
import { ref, set } from 'firebase/database';
import { db } from '../firebase/config';

export default function Onboarding() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  
  // Check if role is pre-selected via QR code query param
  const roleParam = new URLSearchParams(window.location.search).get('role');
  const [role, setRole] = useState(roleParam || null); // 'guest' | 'staff'
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [room, setRoom] = useState('');
  const [floor, setFloor] = useState('');
  const [profession, setProfession] = useState(STAFF_PROFESSIONS[0]);
  const [staffId, setStaffId] = useState('');

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let userId;
    if (role === 'guest') {
      userId = mobile.replace(/[^0-9]/g, ''); // Use mobile number as unique ID
    } else {
      userId = staffId ? staffId.trim() : name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '_' + Math.floor(Math.random() * 1000);
    }
    
    const timestamp = Date.now();

    try {
      if (role === 'guest') {
        const guestData = {
          userId,
          name,
          mobile,
          roomNumber: room,
          buildingId,
          role: 'guest',
          joinedAt: timestamp,
          fcmToken: 'mock_token' // Would get real FCM token here
        };
        await set(ref(db, `guests/${buildingId}/${userId}`), guestData);
        setUser(guestData);
        navigate('/guest');
      } else {
        const staffData = {
          userId,
          name,
          floor,
          profession,
          staffId,
          buildingId,
          role: 'staff',
          status: 'available',
          joinedAt: timestamp,
          fcmToken: 'mock_token'
        };
        await set(ref(db, `staff/${buildingId}/${userId}`), staffData);
        setUser(staffData);
        navigate('/staff');
      }
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to join network");
    }
    setLoading(false);
  };

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-dark-bg relative">
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-4 left-4 text-text-secondary hover:text-white flex items-center gap-2 transition"
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        <h2 className="text-3xl font-bold mb-8 text-white">Who are you?</h2>
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRole('guest')}
            className="bg-card-bg border border-card-border p-10 rounded-xl cursor-pointer hover:border-primary-red transition flex flex-col items-center text-center shadow-lg hover:shadow-primary-red/20"
          >
            <div className="text-6xl mb-4 drop-shadow-md">🛌</div>
            <h3 className="text-2xl font-bold text-white mb-2">Patient / Visitor</h3>
            <p className="text-text-secondary">I am receiving care or visiting this facility.</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRole('staff')}
            className="bg-card-bg border border-card-border p-10 rounded-xl cursor-pointer hover:border-info transition flex flex-col items-center text-center shadow-lg hover:shadow-info/20"
          >
            <div className="text-6xl mb-4 drop-shadow-md">🧑‍⚕️</div>
            <h3 className="text-2xl font-bold text-white mb-2">Medical Staff</h3>
            <p className="text-text-secondary">I work here and respond to medical requests & emergencies.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-dark-bg">
      <div className="max-w-md w-full bg-card-bg p-8 rounded-xl border border-card-border shadow-xl">
        <button onClick={() => setRole(null)} className="text-text-secondary mb-6 hover:text-white text-sm">
          ← Back to roles
        </button>
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          {role === 'guest' ? '🛌 Patient/Visitor Entry' : '🧑‍⚕️ Staff Registration'}
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Full Name</label>
            <input required minLength={3} type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-primary-red" placeholder="John Doe" />
          </div>

          {role === 'guest' && (
            <>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Mobile Number</label>
                <input required pattern="[6-9][0-9]{9}" type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-primary-red" placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Room Number / Location (Optional)</label>
                <input type="text" value={room} onChange={e => setRoom(e.target.value)} className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-primary-red" placeholder="e.g. 714 or Poolside" />
              </div>
            </>
          )}

          {role === 'staff' && (
            <>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Floor Assignment</label>
                <select required value={floor} onChange={e => setFloor(e.target.value)} className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-info">
                  <option value="">Select Floor</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={`Floor ${i+1}`}>Floor {i+1}</option>
                  ))}
                  <option value="Ground/Lobby">Ground/Lobby</option>
                  <option value="Basement/Parking">Basement/Parking</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Profession</label>
                <select required value={profession} onChange={e => setProfession(e.target.value)} className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-info">
                  {STAFF_PROFESSIONS.map(prof => (
                    <option key={prof} value={prof}>{prof}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Staff ID (Optional)</label>
                <input type="text" value={staffId} onChange={e => setStaffId(e.target.value)} className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-info" placeholder="STF_123" />
              </div>
            </>
          )}

          <button disabled={loading} type="submit" className={`mt-4 w-full text-white font-bold py-3 rounded-lg ${role === 'guest' ? 'bg-primary-red hover:bg-alert-red' : 'bg-info hover:bg-blue-400'}`}>
            {loading ? 'Joining...' : 'Enter Network'}
          </button>
        </form>
      </div>
    </div>
  );
}
