import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin, registerAdmin } from '../firebase/auth';
import toast from 'react-hot-toast';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { ref, set, get } from 'firebase/database';
import { db } from '../firebase/config';

export default function AdminLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [buildingName, setBuildingName] = useState('');
  const [facilityType, setFacilityType] = useState('Hospital');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        const userCred = await loginAdmin(email, password);
        const snap = await get(ref(db, `admins/${userCred.user.uid}`));
        
        if (snap.exists()) {
          const bId = snap.val().buildingId;
          const fType = snap.val().facilityType || 'Hospital';
          const bName = snap.val().buildingName || 'Facility';
          
          localStorage.setItem('adminBuildingId', bId);
          localStorage.setItem('adminFacilityType', fType);
          localStorage.setItem('adminBuildingName', bName);

          // Sync public metadata
          await set(ref(db, `buildingMetadata/${bId}`), {
            buildingName: bName,
            facilityType: fType
          });
        } else {
          toast.error("Account metadata not found. Please register again.");
          setLoading(false);
          return;
        }
        toast.success("Welcome, Commander.");
      } else {
        if (!buildingName.trim()) {
           toast.error("Please provide a Building/Facility Name");
           setLoading(false);
           return;
        }
        const userCred = await registerAdmin(email, password);
        const uniqueId = buildingName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6) + '_' + Math.floor(1000 + Math.random() * 9000);
        
        // Save Admin Profile
        await set(ref(db, `admins/${userCred.user.uid}`), {
          email,
          buildingName: buildingName.trim(),
          facilityType,
          buildingId: uniqueId
        });
        
        // Save public metadata for Guest/Staff Onboarding
        await set(ref(db, `buildingMetadata/${uniqueId}`), {
          buildingName: buildingName.trim(),
          facilityType
        });

        localStorage.setItem('adminBuildingId', uniqueId);
        localStorage.setItem('adminFacilityType', facilityType);
        localStorage.setItem('adminBuildingName', buildingName.trim());
        toast.success("Admin Account Created & Verified.");
      }
      localStorage.setItem('adminToken', 'firebase_admin_token');
      navigate('/admin');
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Invalid credentials or account exists.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative">
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-4 left-4 text-text-secondary hover:text-white flex items-center gap-2 transition"
      >
        <ArrowLeft size={16} /> Back to Home
      </button>

      <div className="max-w-md w-full bg-card-bg p-8 rounded-2xl border border-card-border shadow-2xl relative overflow-hidden">
        <div className="flex justify-center mb-6 relative z-10">
          <ShieldAlert size={48} className="text-primary-red" />
        </div>
        <h2 className="text-2xl font-bold text-center text-white mb-2 relative z-10">
          SENTINEL Command
        </h2>
        <p className="text-text-secondary text-center mb-8 relative z-10">
          {isLogin ? 'Secure Admin Login' : 'Register New Admin Authority'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Facility Type</label>
                <select 
                  value={facilityType} 
                  onChange={e => setFacilityType(e.target.value)} 
                  className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-primary-red mb-2"
                >
                  <option value="Hospital">Hospital / Medical Center</option>
                  <option value="Hotel">Hotel / Resort</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1">Building/Facility Name</label>
                <input 
                  required={!isLogin} type="text" value={buildingName} onChange={e => setBuildingName(e.target.value)} 
                  className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-primary-red" 
                  placeholder="e.g. Apollo Hospital / Hyatt Hotel" 
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Admin Email</label>
            <input 
              required type="email" value={email} onChange={e => setEmail(e.target.value)} 
              className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-primary-red" 
              placeholder="admin@example.com" 
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Password</label>
            <input 
              required type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6}
              className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-primary-red" 
              placeholder="••••••••" 
            />
          </div>
          <button disabled={loading} type="submit" className="w-full bg-primary-red hover:bg-alert-red text-white font-bold py-3 rounded-lg transition mt-2 shadow-lg shadow-primary-red/20">
            {loading ? 'Authenticating...' : (isLogin ? 'Secure Login' : 'Create Admin Account')}
          </button>
        </form>

        <div className="mt-6 text-center relative z-10">
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-sm text-info hover:text-white transition"
          >
            {isLogin ? "Need a new facility account? Sign Up" : "Already an Admin? Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}
