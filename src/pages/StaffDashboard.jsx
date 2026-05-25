import { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { ref, onValue, runTransaction, serverTimestamp } from 'firebase/database';
import { useAppContext } from '../context/AppContext';
import { Phone, Clock, AlertTriangle, CheckCircle, MapPin, Search, ArrowLeft, X, FileText, Loader2 } from 'lucide-react';
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

  // Patient Medical Profile Viewer States
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [patientMedicalProfile, setPatientMedicalProfile] = useState(null);
  const [loadingMedicalProfile, setLoadingMedicalProfile] = useState(false);

  // Load patient medical profile on demand
  useEffect(() => {
    if (!selectedPatientId || !user?.buildingId) {
      setPatientMedicalProfile(null);
      return;
    }
    setLoadingMedicalProfile(true);
    const patientRef = ref(db, `guests/${user.buildingId}/${selectedPatientId}`);
    const unsubscribe = onValue(patientRef, (snapshot) => {
      setPatientMedicalProfile(snapshot.val());
      setLoadingMedicalProfile(false);
    }, () => {
      setLoadingMedicalProfile(false);
    });
    return () => unsubscribe();
  }, [selectedPatientId, user]);

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
                  
                  <div className="mb-4 flex justify-between items-end">
                    <div>
                      <p className="font-bold text-lg flex items-center gap-2"><MapPin size={18} className="text-primary-red"/> {crisis.raisedBy.roomNumber || crisis.raisedBy.floor}</p>
                      <p className="text-sm text-text-secondary">Reported by: {crisis.raisedBy.name} ({crisis.raisedBy.role})</p>
                    </div>
                    {crisis.raisedBy.role === 'guest' && (
                      <button 
                        onClick={() => {
                          setSelectedPatientId(crisis.raisedBy.userId);
                          setSelectedPatientName(crisis.raisedBy.name);
                        }}
                        className="text-xs bg-info/20 hover:bg-info/30 text-info font-bold px-3 py-1.5 rounded-lg border border-info/30 transition flex items-center gap-1.5"
                      >
                        ⚕️ Medical Info
                      </button>
                    )}
                  </div>
                  
                  {crisis.description && <p className="text-sm bg-dark-bg p-3 rounded border border-card-border mb-4">&quot;{crisis.description}&quot;</p>}

                  <div className="flex gap-3 mt-4">
                    <button 
                      onClick={() => handleVerifyTrue(crisis.sosId)}
                      disabled={!onlineStatus}
                      className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${onlineStatus ? 'bg-primary-red hover:bg-alert-red text-white shadow-primary-red/20' : 'bg-card-border text-text-secondary cursor-not-allowed'}`}
                    >
                      <AlertTriangle size={20}/> It&apos;s REAL
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
                    {req.type.startsWith('Custom: ') ? 'Custom Request' : req.type}
                  </span>
                </div>
                
                {req.type.startsWith('Custom: ') && (
                  <p className="text-sm bg-dark-bg/60 p-3 rounded border border-card-border mb-4 text-white italic">
                    &quot;{req.type.replace('Custom: ', '')}&quot;
                  </p>
                )}

                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Loc: {req.raisedBy.roomNumber}</h3>
                    <p className="text-sm text-text-secondary">Requested by: {req.raisedBy.name}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedPatientId(req.raisedBy.userId);
                      setSelectedPatientName(req.raisedBy.name);
                    }}
                    className="text-xs bg-info/20 hover:bg-info/30 text-info font-bold px-3 py-1.5 rounded-lg border border-info/30 transition flex items-center gap-1.5"
                  >
                    ⚕️ Medical Info
                  </button>
                </div>
                
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
                    <div className="flex justify-between items-start mb-2 flex-wrap gap-1">
                      <span className="text-warning font-bold text-lg">
                        {req.type.startsWith('Custom: ') ? 'Custom Request' : req.type}
                      </span>
                      <span className="text-xs text-text-secondary">{Math.floor((Date.now() - req.timestamp) / 60000)}m ago</span>
                    </div>

                    {req.type.startsWith('Custom: ') && (
                      <p className="text-sm bg-dark-bg/60 p-3 rounded border border-card-border mb-3 text-white italic">
                        &quot;{req.type.replace('Custom: ', '')}&quot;
                      </p>
                    )}

                    {req.aiAnalysis && (
                      <div className="flex gap-2 mb-3 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-info/20 text-info border border-info/30">
                          Category: {req.aiAnalysis.suggestedCategory}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                          req.aiAnalysis.urgency === 'HIGH' || req.aiAnalysis.urgency === 'CRITICAL'
                            ? 'bg-alert-red/20 text-alert-red border-alert-red/30'
                            : req.aiAnalysis.urgency === 'MEDIUM'
                            ? 'bg-warning/20 text-warning border-warning/30'
                            : 'bg-text-secondary/20 text-text-secondary border-card-border'
                        }`}>
                          Urgency: {req.aiAnalysis.urgency}
                        </span>
                      </div>
                    )}

                    <div className="mb-4 flex justify-between items-end">
                      <div>
                        <p className="font-bold flex items-center gap-2"><MapPin size={16} className="text-primary-red"/> {req.raisedBy.roomNumber}</p>
                        <p className="text-sm text-text-secondary">Patient: {req.raisedBy.name}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedPatientId(req.raisedBy.userId);
                          setSelectedPatientName(req.raisedBy.name);
                        }}
                        className="text-xs bg-info/20 hover:bg-info/30 text-info font-bold px-2 py-1 rounded border border-info/30 transition flex items-center gap-1"
                      >
                        ⚕️ Info
                      </button>
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

      {/* Patient Medical Profile Modal */}
      {selectedPatientId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card-bg border border-card-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setSelectedPatientId(null)} 
              className="absolute top-4 right-4 text-text-secondary hover:text-white"
            >
              <X size={24} />
            </button>
            
            <div className="bg-info/20 p-6 border-b border-info/30">
              <h2 className="text-xl font-bold text-info flex items-center gap-2">
                ⚕️ Medical Profile: {selectedPatientName}
              </h2>
              <p className="text-xs text-text-secondary mt-1">Accessing hospital file vault...</p>
            </div>

            <div className="p-6 space-y-6">
              {loadingMedicalProfile ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-info mb-2" />
                  <p className="text-text-secondary text-sm">Retrieving medical files...</p>
                </div>
              ) : (
                <>
                  {/* Medications & Conditions */}
                  <div>
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Active Medications & Conditions</h3>
                    <div className="bg-dark-bg border border-card-border p-4 rounded-xl text-sm">
                      {patientMedicalProfile?.medicationList ? (
                        <p className="text-white whitespace-pre-wrap font-medium">{patientMedicalProfile.medicationList}</p>
                      ) : (
                        <p className="text-text-secondary italic">No medications or conditions reported by patient.</p>
                      )}
                    </div>
                  </div>

                  {/* Uploaded Files */}
                  <div>
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Patient Uploaded Reports</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {!patientMedicalProfile?.reports || Object.keys(patientMedicalProfile.reports).length === 0 ? (
                        <p className="text-xs text-text-secondary italic text-center py-4">No reports uploaded to vault.</p>
                      ) : (
                        Object.values(patientMedicalProfile.reports).map(report => (
                          <div key={report.reportId} className="bg-dark-bg border border-card-border p-3 rounded-lg flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText size={18} className="text-info flex-shrink-0" />
                              <a 
                                href={report.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="font-semibold truncate hover:text-info hover:underline text-white"
                              >
                                {report.name}
                              </a>
                            </div>
                            <span className="text-[10px] text-text-secondary">
                              {new Date(report.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="p-4 bg-black/20 border-t border-card-border flex justify-end">
              <button 
                onClick={() => setSelectedPatientId(null)} 
                className="px-4 py-2 bg-dark-bg border border-card-border hover:bg-card-border rounded font-bold text-sm text-white transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
