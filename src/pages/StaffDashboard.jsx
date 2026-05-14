import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { ref, onValue, runTransaction, serverTimestamp } from 'firebase/database';
import { useAppContext } from '../context/AppContext';
import { Phone, Clock, AlertTriangle, CheckCircle, MapPin, Search, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LostAndFoundFeed from '../components/LostAndFoundFeed';
import ReportItemModal from '../components/ReportItemModal';

export default function StaffDashboard() {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const [crises, setCrises] = useState([]);
  const [services, setServices] = useState([]);
  const [onlineStatus, setOnlineStatus] = useState(user?.status === 'available' || true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const toggleStatus = async () => {
    const newStatus = !onlineStatus;
    setOnlineStatus(newStatus);
    try {
      const { set, ref } = await import('firebase/database');
      await set(ref(db, `staff/${user.buildingId}/${user.userId}/status`), newStatus ? 'available' : 'unavailable');
      toast.success(newStatus ? "You are now Active" : "You are now Inactive");
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user?.buildingId) return;

    const crisesRef = ref(db, `crises/${user.buildingId}`);
    const unsubscribe = onValue(crisesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sortedCrises = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
        setCrises(sortedCrises);
      } else {
        setCrises([]);
      }
    });

    const servicesRef = ref(db, `serviceRequests/${user.buildingId}`);
    const unServices = onValue(servicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sortedServices = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
        setServices(sortedServices);
      } else {
        setServices([]);
      }
    });

    return () => { unsubscribe(); unServices(); };
  }, [user]);

  const handleVerifyTrue = async (crisisId) => {
    const crisisRef = ref(db, `crises/${user.buildingId}/${crisisId}`);
    try {
      await runTransaction(crisisRef, (currentData) => {
        if (currentData && currentData.status === 'PENDING') {
          currentData.isVerifiedTrue = true;
          currentData.status = 'VERIFIED_REAL'; // Changes status so Admin takes over
          currentData.verifiedBy = { name: user.name, profession: user.profession };
          return currentData;
        }
        return undefined;
      });
      toast.success("Alert verified! Admin has been notified to dispatch.");
    } catch (error) {
      console.error("Verify failed", error);
    }
  };

  const handleAcceptService = async (serviceId) => {
    const serviceRef = ref(db, `serviceRequests/${user.buildingId}/${serviceId}`);
    try {
      const result = await runTransaction(serviceRef, (currentData) => {
        if (currentData && currentData.status === 'PENDING') {
          currentData.status = 'ACCEPTED';
          currentData.acceptedBy = {
            staffId: user.staffId || user.userId,
            name: user.name,
            profession: user.profession
          };
          return currentData;
        }
        return undefined;
      });
      if (result.committed) toast.success("Service Request Accepted!");
      else toast.error("Already accepted by another staff.");
    } catch (error) { console.error(error); }
  };

  const handleCompleteService = async (serviceId) => {
    const serviceRef = ref(db, `serviceRequests/${user.buildingId}/${serviceId}`);
    try {
      await runTransaction(serviceRef, (currentData) => {
        if (currentData && currentData.status === 'ACCEPTED') {
          currentData.status = 'COMPLETED';
          return currentData;
        }
        return undefined;
      });
      toast.success("Service Marked as Completed!");
    } catch (error) { console.error(error); }
  };

  const handleFalseAlarm = async (crisisId) => {
    if (!window.confirm("Are you sure this is a fake SOS?")) return;
    const crisisRef = ref(db, `crises/${user.buildingId}/${crisisId}`);
    try {
      await runTransaction(crisisRef, (currentData) => {
        if (currentData && currentData.status === 'PENDING') {
          currentData.status = 'FALSE_ALARM';
          currentData.resolvedAt = serverTimestamp();
          currentData.verifiedBy = { name: user.name, profession: user.profession };
          return currentData;
        }
        return undefined;
      });
      toast.success("SOS marked as Fake/False Alarm.");
    } catch (error) {
      console.error("False alarm failed", error);
    }
  };

  const pendingCrises = crises.filter(c => c.status === 'PENDING');
  const verifiedCrises = crises.filter(c => c.status === 'VERIFIED_REAL');
  const pendingServices = services.filter(s => s.status === 'PENDING');
  const myServices = services.filter(s => s.status === 'ACCEPTED' && s.acceptedBy?.staffId === (user.staffId || user.userId));

  if (!user || user.role !== 'staff') {
    return <div className="p-8 text-center text-white">Unauthorized. Please log in as staff.</div>;
  }

  const getSeverityColor = (sev) => {
    switch(sev) {
      case 'CRITICAL': return 'bg-severity-critical text-white';
      case 'HIGH': return 'bg-severity-high text-white';
      case 'MEDIUM': return 'bg-severity-medium text-black';
      case 'LOW': return 'bg-severity-low text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white p-4 max-w-4xl mx-auto">
      <header className="flex justify-between items-center bg-card-bg p-4 rounded-xl border border-card-border mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setUser(null);
              navigate('/');
            }} 
            className="text-text-secondary hover:text-white flex items-center gap-1 text-sm transition"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-text-secondary">{user.facilityType || 'Facility'} • {user.profession} • {user.floor}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-lg ${onlineStatus ? 'bg-success/20 text-success border border-success/50 shadow-success/10' : 'bg-dark-bg text-text-secondary border border-card-border'}`}
          >
            <div className={`w-3 h-3 rounded-full ${onlineStatus ? 'bg-success animate-pulse' : 'bg-text-secondary'}`}></div>
            {onlineStatus ? 'Status: Active' : 'Status: Inactive'}
          </button>
        </div>
      </header>

      {/* Pending SOS Feed */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-alert-red"><AlertTriangle size={20} /> New SOS Alerts (Awaiting Verification)</h2>
        {pendingCrises.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-card-border rounded-xl text-text-secondary">
            No active emergencies right now. Keep monitoring.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {pendingCrises.map(crisis => (
                <motion.div 
                  key={crisis.sosId}
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  className="bg-card-bg border border-alert-red/50 shadow-[0_0_15px_rgba(255,82,82,0.1)] p-5 rounded-xl"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${getSeverityColor(crisis.severity)}`}>
                      {crisis.severity} — {crisis.type}
                    </span>
                    <span className="text-xs text-text-secondary flex items-center gap-1"><Clock size={12}/> Just now</span>
                  </div>
                  
                  <div className="mb-4">
                    <p className="font-bold text-lg flex items-center gap-2"><MapPin size={18} className="text-primary-red"/> {crisis.raisedBy.roomNumber || crisis.raisedBy.floor}</p>
                    <p className="text-sm text-text-secondary">Reported by: {crisis.raisedBy.name} ({crisis.raisedBy.role})</p>
                  </div>
                  
                  {crisis.description && <p className="text-sm bg-dark-bg p-3 rounded border border-card-border mb-4">"{crisis.description}"</p>}

                  <div className="flex gap-3 mt-4">
                    <button 
                      onClick={() => handleVerifyTrue(crisis.sosId)}
                      disabled={!onlineStatus}
                      className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${onlineStatus ? 'bg-primary-red hover:bg-alert-red text-white shadow-primary-red/20' : 'bg-card-border text-text-secondary cursor-not-allowed'}`}
                    >
                      <AlertTriangle size={20}/> It's REAL
                    </button>
                    <button 
                      onClick={() => handleFalseAlarm(crisis.sosId)}
                      disabled={!onlineStatus}
                      className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${onlineStatus ? 'bg-dark-bg border border-warning text-warning hover:bg-warning hover:text-white' : 'bg-card-border text-text-secondary border border-transparent cursor-not-allowed'}`}
                    >
                      Fake / Prank
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Verified Crises */}
      {verifiedCrises.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-text-secondary mb-3 uppercase tracking-wider">Verified Emergencies (Admin Handling)</h2>
          <div className="flex flex-col gap-3">
            {verifiedCrises.map(crisis => (
              <div key={crisis.sosId} className="bg-alert-red/10 border border-alert-red/30 p-4 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-alert-red text-sm font-bold">🚨 VERIFIED — {crisis.type}</span>
                  <span className="text-xs text-text-secondary">{crisis.raisedBy.roomNumber || crisis.raisedBy.floor}</span>
                </div>
                <p className="text-sm text-text-secondary">Verified by: <span className="text-white font-semibold">{crisis.verifiedBy?.name}</span> ({crisis.verifiedBy?.profession})</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- SERVICE REQUESTS SECTION --- */}
      
      {/* My Active Service Deliveries */}
      {myServices.length > 0 && (
        <section className="mb-8 border-t-2 border-dashed border-card-border pt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-info"><CheckCircle size={20} /> My Active Deliveries</h2>
          <div className="flex flex-col gap-4">
            {myServices.map(req => (
              <div key={req.requestId} className="bg-info/10 border border-info p-5 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <span className="px-2 py-1 text-xs font-bold rounded bg-info text-white">
                    {req.type}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-1">Loc: {req.raisedBy.roomNumber}</h3>
                <p className="text-text-secondary mb-4">Requested by: {req.raisedBy.name}</p>
                
                <div className="flex gap-3">
                  <a href={`tel:${req.raisedBy.mobile}`} className="flex-1 bg-card-bg border border-card-border py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-card-border transition font-semibold">
                    <Phone size={18} /> Call Guest
                  </a>
                  <button onClick={() => handleCompleteService(req.requestId)} className="flex-1 bg-success hover:bg-green-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2">
                    <CheckCircle size={18}/> Mark Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending Service Requests Feed */}
      {myServices.length > 0 ? (
        <section className="mb-8 border-t-2 border-dashed border-card-border pt-8">
          <div className="bg-warning/10 border border-warning text-warning p-6 rounded-xl text-center">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">You have an active task</h2>
            <p>Please complete your current delivery before accepting new service requests.</p>
          </div>
        </section>
      ) : (
        <section className="mb-8 border-t-2 border-dashed border-card-border pt-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-warning"><Clock size={20} /> Open Service Requests</h2>
        {pendingServices.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-card-border rounded-xl text-text-secondary">
            No pending requests.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <AnimatePresence>
              {pendingServices.map(req => (
                <motion.div 
                  key={req.requestId}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-card-bg border border-warning/50 p-5 rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-warning font-bold text-lg">{req.type}</span>
                      <span className="text-xs text-text-secondary">{Math.floor((Date.now() - req.timestamp) / 60000)}m ago</span>
                    </div>
                    <div className="mb-4">
                      <p className="font-bold flex items-center gap-2"><MapPin size={16} className="text-primary-red"/> {req.raisedBy.roomNumber}</p>
                      <p className="text-sm text-text-secondary">Guest: {req.raisedBy.name}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleAcceptService(req.requestId)}
                    disabled={!onlineStatus}
                    className={`w-full py-3 rounded-lg font-bold transition-all shadow-lg ${onlineStatus ? 'bg-warning hover:bg-yellow-600 text-black shadow-warning/20' : 'bg-card-border text-text-secondary cursor-not-allowed'}`}
                  >
                    {onlineStatus ? 'Accept Request' : 'Offline'}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
      )}

      {/* Lost & Found Section */}
      <section className="mb-8 border-t-2 border-dashed border-card-border pt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Search className="text-info" /> Lost & Found
          </h2>
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="bg-info hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition shadow-[0_0_15px_rgba(0,176,255,0.3)]"
          >
            + Report Item
          </button>
        </div>
        <LostAndFoundFeed />
      </section>

      <ReportItemModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </div>
  );
}
