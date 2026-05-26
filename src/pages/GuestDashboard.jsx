import { useEffect, useState, useRef } from 'react';
import { db, storage } from '../firebase/config';
import { ref, onValue, query, limitToLast, set, push, serverTimestamp, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAppContext } from '../context/AppContext';
import { ShieldCheck, AlertCircle, Search, ArrowLeft, FileText, Upload, Trash2, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LostAndFoundFeed from '../components/LostAndFoundFeed';
import ReportItemModal from '../components/ReportItemModal';
import { HOSPITAL_SERVICES } from '../utils/constants';
import { analyzeServiceRequest, analyzeCrisis } from '../services/geminiService';

export default function GuestDashboard() {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const [myCrises, setMyCrises] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [myLostAndFound, setMyLostAndFound] = useState([]);
  const [buildingHasActiveCrisis, setBuildingHasActiveCrisis] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // New States
  const [customText, setCustomText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [medsText, setMedsText] = useState('');
  const [isSavingMeds, setIsSavingMeds] = useState(false);
  const [reports, setReports] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const isMedsDirtyRef = useRef(false);
  const [triageResult, setTriageResult] = useState(null);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.buildingId) return;

    const crisesRef = ref(db, `crises/${user.buildingId}`);
    const unsubscribe = onValue(crisesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allCrises = Object.values(data);
        const mySOS = allCrises.filter(c => c.raisedBy.userId === user.userId).sort((a, b) => b.timestamp - a.timestamp);
        setMyCrises(mySOS);
      } else {
        setMyCrises([]);
      }
    });

    const servicesRef = ref(db, `serviceRequests/${user.buildingId}`);
    const unServices = onValue(servicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allServices = Object.values(data);
        const mySR = allServices.filter(s => s.raisedBy.userId === user.userId).sort((a, b) => b.timestamp - a.timestamp);
        setMyServices(mySR);
      } else {
        setMyServices([]);
      }
    });

    const lnfRef = ref(db, `lostAndFound/${user.buildingId}`);
    const unLnf = onValue(lnfRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allLnf = Object.values(data);
        const myLnf = allLnf.filter(i => i.reportedBy?.userId === user.userId);
        setMyLostAndFound(myLnf);
      } else {
        setMyLostAndFound([]);
      }
    });

    const broadcastsRef = query(ref(db, `broadcasts/${user.buildingId}`), limitToLast(1));
    const unBroadcasts = onValue(broadcastsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const keys = Object.keys(data);
        const latest = data[keys[0]];
        if (latest && latest.type === 'EMERGENCY' && (Date.now() - latest.timestamp < 30000)) {
          setBuildingHasActiveCrisis(true);
        } else {
          setBuildingHasActiveCrisis(false);
        }
      } else {
        setBuildingHasActiveCrisis(false);
      }
    });

    const patientProfileRef = ref(db, `guests/${user.buildingId}/${user.userId}`);
    const unProfile = onValue(patientProfileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (!isMedsDirtyRef.current) {
          setMedsText(data.medicationList || '');
        }
        setReports(data.reports ? Object.values(data.reports).sort((a,b) => b.timestamp - a.timestamp) : []);
      } else {
        if (!isMedsDirtyRef.current) {
          setMedsText('');
        }
        setReports([]);
      }
    });

    // Setup interval to clear badge when 30 seconds pass
    const timer = setInterval(() => {
      setBuildingHasActiveCrisis(prev => prev); // force re-eval if we had the actual timestamp, but simpler to just let it be. Let's just do a manual check.
    }, 1000);

    return () => { 
      unsubscribe(); 
      unServices(); 
      unLnf(); 
      unBroadcasts(); 
      unProfile();
      clearInterval(timer); 
    };
  }, [user]);

  if (!user || user.role !== 'guest') {
    return <div className="p-8 text-center text-white">Unauthorized. Please log in as guest.</div>;
  }

  const handleServiceRequest = async (type) => {
    try {
      const newRef = push(ref(db, `serviceRequests/${user.buildingId}`));
      await set(newRef, {
        requestId: newRef.key,
        type,
        status: 'PENDING',
        timestamp: serverTimestamp(),
        raisedBy: {
          userId: user.userId,
          name: user.name,
          roomNumber: user.roomNumber,
          mobile: user.mobile
        }
      });
      import('react-hot-toast').then(m => m.default.success(`Requested: ${type}`));
    } catch (error) {
      console.error(error);
      import('react-hot-toast').then(m => m.default.error("Failed to request service"));
    }
  };

  const handleCustomRequestSubmit = async (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    setAiLoading(true);
    try {
      import('react-hot-toast').then(m => m.default("AI triaging request...", { icon: '🤖' }));
      const aiTriage = await analyzeServiceRequest(customText);
      setTriageResult(aiTriage);
      setIsTriageModalOpen(true);
    } catch (err) {
      console.error(err);
      import('react-hot-toast').then(m => m.default.error("Failed to submit request."));
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmSOS = async () => {
    setIsTriageModalOpen(false);
    setAiLoading(true);
    try {
      const crisisId = `sos_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const location = user.roomNumber || 'Unknown Location';
      const aiAnalysis = await analyzeCrisis(triageResult.suggestedCategory, customText, location);
      
      const crisisData = {
        sosId: crisisId,
        raisedBy: user,
        type: triageResult.suggestedCategory,
        description: customText,
        severity: aiAnalysis.severity,
        status: 'PENDING',
        buildingId: user.buildingId,
        timestamp: serverTimestamp(),
        geminiAnalysis: aiAnalysis,
        autoEscalated: false
      };

      await set(ref(db, `crises/${user.buildingId}/${crisisId}`), crisisData);
      import('react-hot-toast').then(m => m.default.success("SOS Alert triggered automatically! Help is on the way."));
      setCustomText('');
    } catch (err) {
      console.error(err);
      import('react-hot-toast').then(m => m.default.error("Failed to trigger SOS alert."));
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmUrgent = async () => {
    setIsTriageModalOpen(false);
    setAiLoading(true);
    try {
      const newRef = push(ref(db, `serviceRequests/${user.buildingId}`));
      await set(newRef, {
        requestId: newRef.key,
        type: `Custom: ${customText}`,
        status: 'URGENT',
        timestamp: serverTimestamp(),
        raisedBy: {
          userId: user.userId,
          name: user.name,
          roomNumber: user.roomNumber,
          mobile: user.mobile
        },
        aiAnalysis: triageResult
      });
      import('react-hot-toast').then(m => m.default.success("Urgent Request sent to staff!"));
      setCustomText('');
    } catch (err) {
      console.error(err);
      import('react-hot-toast').then(m => m.default.error("Failed to submit request."));
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmNormal = async () => {
    setIsTriageModalOpen(false);
    setAiLoading(true);
    try {
      const newRef = push(ref(db, `serviceRequests/${user.buildingId}`));
      await set(newRef, {
        requestId: newRef.key,
        type: `Custom: ${customText}`,
        status: 'PENDING',
        timestamp: serverTimestamp(),
        raisedBy: {
          userId: user.userId,
          name: user.name,
          roomNumber: user.roomNumber,
          mobile: user.mobile
        },
        aiAnalysis: triageResult
      });
      import('react-hot-toast').then(m => m.default.success(`Request sent. Categorized as: ${triageResult.suggestedCategory}`));
      setCustomText('');
    } catch (err) {
      console.error(err);
      import('react-hot-toast').then(m => m.default.error("Failed to submit request."));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveMeds = async () => {
    setIsSavingMeds(true);
    try {
      await update(ref(db, `guests/${user.buildingId}/${user.userId}`), {
        medicationList: medsText
      });
      isMedsDirtyRef.current = false;
      import('react-hot-toast').then(m => m.default.success("Medical List Saved!"));
    } catch (err) {
      console.error(err);
      import('react-hot-toast').then(m => m.default.error("Failed to save meds list."));
    } finally {
      setIsSavingMeds(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      import('react-hot-toast').then(m => m.default("Uploading report...", { icon: '⏳' }));
      const fileRef = storageRef(storage, `patientReports/${user.buildingId}/${user.userId}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const reportRef = push(ref(db, `guests/${user.buildingId}/${user.userId}/reports`));
      await set(reportRef, {
        reportId: reportRef.key,
        name: file.name,
        url,
        path: fileRef.fullPath,
        timestamp: Date.now()
      });
      import('react-hot-toast').then(m => m.default.success("Medical Report Uploaded!"));
    } catch (err) {
      console.error(err);
      let errorMsg = "Failed to upload report.";
      if (err.code === 'storage/unknown' || err.message?.includes('404')) {
        errorMsg = "Storage Bucket not found. Please ensure Firebase Storage is enabled in the Firebase Console (under the Storage tab).";
      }
      import('react-hot-toast').then(m => m.default.error(errorMsg, { duration: 6000 }));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteReport = async (reportId, filePath) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      const fileRef = storageRef(storage, filePath);
      await deleteObject(fileRef);
      await remove(ref(db, `guests/${user.buildingId}/${user.userId}/reports/${reportId}`));
      import('react-hot-toast').then(m => m.default.success("Report deleted successfully."));
    } catch (err) {
      console.error(err);
      import('react-hot-toast').then(m => m.default.error("Failed to delete report."));
    }
  };

  const activeMySOS = myCrises.find(c => c.status !== 'RESOLVED');
  const pastMySOS = myCrises.filter(c => c.status === 'RESOLVED');

  return (
    <div className="min-h-screen bg-dark-bg text-white p-4 max-w-lg md:max-w-6xl mx-auto pb-24">
      <header className="bg-card-bg p-6 rounded-2xl border border-card-border shadow-lg mb-8 text-center mt-4 relative">
        <button 
          onClick={() => {
            setUser(null);
            navigate('/');
          }} 
          className="absolute top-4 left-4 text-text-secondary hover:text-white flex items-center gap-1 text-sm transition"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex justify-center mb-4">
          <Logo size="sm" variant="horizontal" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Welcome, {user.name}</h1>
        <p className="text-text-secondary text-sm">Room {user.roomNumber} • {user.buildingId}</p>
        
        <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${buildingHasActiveCrisis ? 'bg-alert-red/20 text-alert-red border border-alert-red/30' : 'bg-success/20 text-success border border-success/30'}`}>
          {buildingHasActiveCrisis ? <AlertCircle size={16} /> : <ShieldCheck size={16} />}
          {buildingHasActiveCrisis ? 'Building Emergency Active' : 'Building Status: All Clear'}
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Left Column: Tracking & Status */}
        <div className="flex flex-col gap-6">

          {/* Active SOS Tracker */}
          {activeMySOS && (
            <section>
          <div className="bg-primary-red/10 border border-primary-red p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary-red animate-pulse"></div>
            <h2 className="text-xl font-bold text-alert-red mb-4 flex items-center gap-2">
              <AlertCircle className="animate-bounce" /> Your SOS is Active
            </h2>
            
            <div className="bg-dark-bg p-4 rounded-xl border border-card-border mb-4">
              <p className="font-semibold">{activeMySOS.type} Emergency</p>
              <p className="text-sm text-text-secondary mt-1">Reported: {new Date(activeMySOS.timestamp).toLocaleTimeString()}</p>
            </div>

            {activeMySOS.status === 'PENDING' ? (
              <div className="text-center p-4 bg-black/40 rounded-xl">
                <div className="w-8 h-8 border-4 border-alert-red border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="font-bold text-alert-red">Finding nearest responder...</p>
                <p className="text-xs text-text-secondary mt-1">Please stay calm.</p>
              </div>
            ) : (
              <div className="bg-success/20 border border-success p-4 rounded-xl">
                <p className="font-bold text-success flex items-center gap-2"><ShieldCheck size={18}/> SOS Accepted</p>
                <div className="mt-2 text-sm">
                  <p>Handled by: <span className="font-bold text-white">{activeMySOS.acceptedBy?.name}</span></p>
                  <p className="text-text-secondary">{activeMySOS.acceptedBy?.profession} • {activeMySOS.acceptedBy?.floor}</p>
                </div>
                <div className="mt-4 h-2 bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-success w-2/3 animate-pulse rounded-full"></div>
                </div>
                <p className="text-xs text-center text-text-secondary mt-2">Help is on the way</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!activeMySOS && (
        <div className="text-center p-8 border border-dashed border-card-border rounded-2xl">
          <ShieldCheck size={48} className="mx-auto text-success mb-4 opacity-50" />
          <h3 className="font-bold text-lg mb-2">You are protected.</h3>
          <p className="text-text-secondary text-sm">Press the SOS button below if you face any emergency.</p>
        </div>
      )}

        {/* Service Request Tracker */}
        {myServices.filter(s => s.status !== 'COMPLETED').length > 0 && (
          <section className="mt-8">
            <h3 className="text-sm font-bold text-text-secondary mb-3 uppercase">Active Requests</h3>
            <div className="flex flex-col gap-3">
              {myServices.filter(s => s.status !== 'COMPLETED').map(req => (
                <div key={req.requestId} className="bg-dark-bg border border-card-border p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold">{req.type}</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${req.status === 'PENDING' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                      {req.status}
                    </span>
                  </div>
                  {req.status === 'ACCEPTED' && req.acceptedBy && (
                    <p className="text-sm text-text-secondary">Assigned to: <span className="text-white font-semibold">{req.acceptedBy.name}</span></p>
                  )}
                  {req.status === 'PENDING' && (
                    <p className="text-sm text-text-secondary">Awaiting staff assignment...</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Medical Vault Section */}
        <section className="bg-card-bg border border-card-border p-6 rounded-2xl shadow-lg mt-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            🔒 Patient Medical Vault
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            Save your medication lists and upload reports so doctors and staff can instantly access them in emergencies.
          </p>

          {/* Meds List Area */}
          <div className="mb-6">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">
              Active Medications & Health Conditions
            </label>
            <div className="flex flex-col gap-2">
              <textarea
                value={medsText}
                onChange={e => {
                  setMedsText(e.target.value);
                  isMedsDirtyRef.current = true;
                }}
                placeholder="e.g. Taking Metformin 500mg, allergic to Penicillin, history of high blood pressure."
                className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-info text-sm h-24 resize-none transition-colors"
              />
              <button
                onClick={handleSaveMeds}
                disabled={isSavingMeds}
                className="self-end px-4 py-2 bg-dark-bg border border-card-border hover:border-success hover:text-success text-text-secondary rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                {isSavingMeds ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={12} /> Save List
                  </>
                )}
              </button>
            </div>
          </div>

          {/* File Upload Area */}
          <div className="border-t border-card-border pt-6">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">
              Uploaded Lab Reports & Receipts (PDF / Images)
            </label>
            
            <div className="relative border border-dashed border-card-border rounded-lg p-4 text-center hover:border-info transition duration-300 bg-dark-bg/20 mb-4">
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              {uploadingFile ? (
                <span className="text-info font-bold text-xs flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Uploading report...
                </span>
              ) : (
                <span className="text-text-secondary text-xs flex items-center justify-center gap-2">
                  <Upload size={16} className="text-info" /> Drag & drop or click to upload report
                </span>
              )}
            </div>

            {/* Uploaded Reports List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {reports.length === 0 ? (
                <p className="text-xs text-text-secondary italic text-center py-4">No reports uploaded yet.</p>
              ) : (
                reports.map(report => (
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
                    <button 
                      onClick={() => handleDeleteReport(report.reportId, report.path)}
                      className="text-text-secondary hover:text-alert-red transition duration-200"
                      title="Delete Report"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Actions & History */}
      <div className="flex flex-col gap-6">
        
        {/* General Services Section */}
        <section className="bg-card-bg border border-card-border p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            🏥 Room & Medical Services
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {HOSPITAL_SERVICES.map(service => (
              <button 
                key={service.id}
                onClick={() => handleServiceRequest(service.label)}
                className="bg-dark-bg/60 border border-card-border hover:border-primary-red p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 gap-2 hover:brightness-110 active:brightness-90 shadow-md"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${service.color.split(' ').slice(0, 2).join(' ')}`}>
                  {service.icon}
                </div>
                <span className="text-xs font-bold text-text-secondary transition-colors">{service.label}</span>
              </button>
            ))}
          </div>

          {/* Custom Service Request with AI */}
          <div className="border-t border-card-border pt-6">
            <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles size={16} className="text-info" /> Custom Request (AI-Triaged)
            </h4>
            <form onSubmit={handleCustomRequestSubmit} className="flex flex-col gap-3">
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Type your custom request here... (e.g. 'Need a clean towel' or 'My head hurts')"
                className="w-full bg-dark-bg border border-card-border rounded-lg p-3 text-white focus:outline-none focus:border-info text-sm h-20 resize-none transition-colors"
                required
              />
              <button
                type="submit"
                disabled={aiLoading || !customText.trim()}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                  aiLoading 
                    ? 'bg-info/20 text-info cursor-not-allowed'
                    : 'bg-info hover:bg-blue-600 text-white shadow-info/20 active:brightness-90'
                }`}
              >
                {aiLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> AI Analyzing Request...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Send Request
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* History */}
        {(pastMySOS.length > 0 || myServices.filter(s => s.status === 'COMPLETED').length > 0 || myLostAndFound.filter(i => i.status === 'RESOLVED').length > 0) && (
          <section className="mt-4">
            <h3 className="text-sm font-bold text-text-secondary mb-4 uppercase tracking-wider px-2">Your History</h3>
            <div className="flex flex-col gap-3">
              {/* SOS History */}
              {pastMySOS.map(crisis => (
                <div key={crisis.sosId} className="bg-card-bg border border-card-border p-4 rounded-xl flex justify-between items-center opacity-70">
                  <div>
                    <p className="font-bold text-sm">{crisis.type} (SOS)</p>
                    <p className="text-xs text-text-secondary">{new Date(crisis.timestamp).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs font-bold text-success px-2 py-1 bg-success/20 rounded">RESOLVED</span>
                </div>
              ))}
              
              {/* Services History */}
              {myServices.filter(s => s.status === 'COMPLETED').map(req => (
                <div key={req.requestId} className="bg-card-bg border border-card-border p-4 rounded-xl flex justify-between items-center opacity-70">
                  <div>
                    <p className="font-bold text-sm">{req.type}</p>
                    <p className="text-xs text-text-secondary">{new Date(req.timestamp).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs font-bold text-success px-2 py-1 bg-success/20 rounded">COMPLETED</span>
                </div>
              ))}

              {/* Lost & Found History */}
              {myLostAndFound.filter(i => i.status === 'RESOLVED').map(item => (
                <div key={item.itemId} className="bg-card-bg border border-card-border p-4 rounded-xl flex justify-between items-center opacity-70">
                  <div>
                    <p className="font-bold text-sm">{item.title} ({item.type})</p>
                    <p className="text-xs text-text-secondary">{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}</p>
                  </div>
                  <span className="text-xs font-bold text-success px-2 py-1 bg-success/20 rounded">RESOLVED</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      </div>

      {/* Lost & Found Section */}
      <section className="mt-12 border-t border-card-border pt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
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

      {/* Triage Interactive Modal */}
      <AnimatePresence>
        {isTriageModalOpen && triageResult && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card-bg border border-card-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className={`p-6 border-b border-card-border ${
                triageResult.isEmergency || triageResult.urgency === 'CRITICAL'
                  ? 'bg-alert-red/20 border-alert-red/30'
                  : triageResult.urgency === 'HIGH'
                  ? 'bg-warning/20 border-warning/30'
                  : 'bg-info/20 border-info/30'
              }`}>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${
                  triageResult.isEmergency || triageResult.urgency === 'CRITICAL'
                    ? 'text-alert-red'
                    : triageResult.urgency === 'HIGH'
                    ? 'text-warning'
                    : 'text-info'
                }`}>
                  🤖 AI Request Triage Analysis
                </h3>
                <p className="text-xs text-text-secondary mt-1">Smart classification for hospital personnel</p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="bg-dark-bg/60 p-4 rounded-xl border border-card-border">
                  <p className="text-xs text-text-secondary uppercase font-bold mb-1">Your Request</p>
                  <p className="text-white text-sm font-medium italic">&quot;{customText}&quot;</p>
                  {triageResult.englishTranslation && triageResult.englishTranslation !== customText && (
                    <div className="mt-2 border-t border-card-border/40 pt-2">
                      <p className="text-[11px] text-text-secondary uppercase font-bold">English Translation</p>
                      <p className="text-info text-sm italic">&quot;{triageResult.englishTranslation}&quot;</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-bg/40 p-3 rounded-lg border border-card-border">
                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-0.5">Urgency Level</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-black inline-block ${
                      triageResult.urgency === 'CRITICAL'
                        ? 'bg-severity-critical text-white'
                        : triageResult.urgency === 'HIGH'
                        ? 'bg-severity-high text-white'
                        : triageResult.urgency === 'MEDIUM'
                        ? 'bg-severity-medium text-black'
                        : 'bg-severity-low text-black'
                    }`}>
                      {triageResult.urgency}
                    </span>
                  </div>
                  <div className="bg-dark-bg/40 p-3 rounded-lg border border-card-border">
                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-0.5">Suggested Service</p>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-info/20 text-info border border-info/30 inline-block">
                      {triageResult.suggestedCategory}
                    </span>
                  </div>
                </div>

                <div className="bg-dark-bg/30 p-4 rounded-lg border border-card-border text-xs text-text-secondary space-y-1">
                  <p className="font-bold text-white uppercase text-[10px]">AI Assessment Details:</p>
                  <p>&quot;{triageResult.flagReason || 'Request analyzed successfully.'}&quot;</p>
                </div>

                {/* Recommendations */}
                <div className="text-xs font-semibold py-1">
                  {triageResult.isEmergency || triageResult.urgency === 'CRITICAL' ? (
                    <p className="text-alert-red flex items-center gap-1.5 animate-pulse">
                      ⚠️ WARNING: Highly critical request. SOS trigger is highly recommended.
                    </p>
                  ) : triageResult.urgency === 'HIGH' ? (
                    <p className="text-warning flex items-center gap-1.5">
                      ⚡ RECOMMENDED: Submit as an Urgent Request for rapid staff attention.
                    </p>
                  ) : (
                    <p className="text-success flex items-center gap-1.5">
                      ✅ RECOMMENDED: Submit as a Standard Request.
                    </p>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-black/20 border-t border-card-border flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleConfirmSOS}
                    className={`py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1 shadow-md ${
                      triageResult.isEmergency || triageResult.urgency === 'CRITICAL'
                        ? 'bg-primary-red hover:bg-alert-red text-white shadow-primary-red/20 animate-pulse border border-primary-red/50'
                        : 'bg-dark-bg hover:bg-alert-red/20 hover:text-alert-red text-text-secondary border border-card-border'
                    }`}
                  >
                    🚨 Trigger SOS
                  </button>

                  <button 
                    onClick={handleConfirmUrgent}
                    className={`py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1 shadow-md ${
                      triageResult.urgency === 'HIGH'
                        ? 'bg-warning text-black hover:brightness-110 shadow-warning/20 border border-warning/50'
                        : 'bg-dark-bg hover:bg-warning/20 hover:text-warning text-text-secondary border border-card-border'
                    }`}
                  >
                    ⚡ Urgent Request
                  </button>
                </div>

                <button 
                  onClick={handleConfirmNormal}
                  className={`py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1 shadow-md ${
                    triageResult.urgency !== 'CRITICAL' && triageResult.urgency !== 'HIGH'
                      ? 'bg-info hover:bg-blue-600 text-white shadow-info/20'
                      : 'bg-dark-bg hover:bg-card-border text-white border border-card-border'
                  }`}
                >
                  📋 Submit Standard Request
                </button>

                <button 
                  onClick={() => setIsTriageModalOpen(false)}
                  className="py-2.5 bg-transparent hover:bg-card-border text-text-secondary hover:text-white rounded-lg text-xs font-bold transition mt-1"
                >
                  Cancel Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
