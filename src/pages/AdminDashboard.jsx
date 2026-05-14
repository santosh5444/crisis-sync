import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, onValue, set, push, serverTimestamp, runTransaction, get, query, orderByChild, equalTo } from 'firebase/database';
import { DEFAULT_BUILDING_ID } from '../utils/constants';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, Users, HardHat, BarChart3, PhoneCall, 
  LogOut, AlertTriangle, CheckCircle, Clock, MapPin, Phone, Bell, QrCode, Search 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { logoutAdmin } from '../firebase/auth';
import LostAndFoundFeed from '../components/LostAndFoundFeed';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('LIVE_SOS');
  
  // Real-time Data States
  const [crises, setCrises] = useState([]);
  const [services, setServices] = useState([]);
  const [guests, setGuests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const buildingId = localStorage.getItem('adminBuildingId') || DEFAULT_BUILDING_ID;
  const adminProfile = {
    buildingName: localStorage.getItem('adminBuildingName') || 'Crisis Facility',
    facilityType: localStorage.getItem('adminFacilityType') || 'Hospital'
  };

  // Logout
  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch (error) {
      console.error("Firebase logout failed", error);
    }
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminBuildingId');
    localStorage.removeItem('adminFacilityType');
    localStorage.removeItem('adminBuildingName');
    navigate('/admin/login');
  };

  // Listeners
  useEffect(() => {

    const crisesRef = ref(db, `crises/${buildingId}`);
    const unCrises = onValue(crisesRef, snap => {
      setCrises(snap.val() ? Object.values(snap.val()).sort((a,b)=>b.timestamp - a.timestamp) : []);
    });

    const guestsRef = ref(db, `guests/${buildingId}`);
    const unGuests = onValue(guestsRef, snap => {
      if (snap.val()) {
        const rawGuests = Object.values(snap.val());
        const deduped = Object.values(rawGuests.reduce((acc, curr) => {
          if (!acc[curr.mobile] || curr.joinedAt > acc[curr.mobile].joinedAt) {
            acc[curr.mobile] = curr;
          }
          return acc;
        }, {}));
        setGuests(deduped);
      } else {
        setGuests([]);
      }
    });

    const staffRef = ref(db, `staff/${buildingId}`);
    const unStaff = onValue(staffRef, snap => {
      setStaff(snap.val() ? Object.values(snap.val()) : []);
    });

    const servicesRef = ref(db, `serviceRequests/${buildingId}`);
    const unServices = onValue(servicesRef, snap => {
      setServices(snap.val() ? Object.values(snap.val()).sort((a,b)=>b.timestamp - a.timestamp) : []);
    });

    return () => { unCrises(); unGuests(); unStaff(); unServices(); };
  }, []);

  // Auto-Escalation Logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      crises.forEach(async (crisis) => {
        if (crisis.status === 'PENDING' && (now - crisis.timestamp > 60000)) {
          // Escalate!
          try {
            await runTransaction(ref(db, `crises/${buildingId}/${crisis.sosId}`), (current) => {
              if (current && current.status === 'PENDING') {
                current.status = 'ESCALATED';
                current.autoEscalated = true;
              }
              return current;
            });
            toast.error(`⚠️ URGENT: SOS from ${crisis.raisedBy.roomNumber || crisis.raisedBy.floor} automatically escalated due to inactivity!`, { duration: 6000 });
          } catch(e) { console.error(e); }
        }
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [crises]);

  // Derived Stats
  const activeCrises = crises.filter(c => c.status !== 'RESOLVED' && c.status !== 'FALSE_ALARM');
  const resolvedToday = crises.filter(c => (c.status === 'RESOLVED' || c.status === 'FALSE_ALARM') && (Date.now() - c.timestamp < 86400000));
  const staffOnline = staff.filter(s => s.status === 'available');

  // Actions
  const handleResolve = async (crisisId) => {
    try {
      await runTransaction(ref(db, `crises/${buildingId}/${crisisId}`), (current) => {
        if(current) { current.status = 'RESOLVED'; current.resolvedAt = serverTimestamp(); }
        return current;
      });
      toast.success("Crisis marked as resolved.");
    } catch(e) { toast.error("Error resolving crisis."); }
  };

  const handleFalseAlarm = async (crisisId) => {
    if (!window.confirm("Are you sure this is a fake SOS? It will be dismissed.")) return;
    try {
      await runTransaction(ref(db, `crises/${buildingId}/${crisisId}`), (current) => {
        if(current) { current.status = 'FALSE_ALARM'; current.resolvedAt = serverTimestamp(); }
        return current;
      });
      toast.success("SOS marked as Fake/False Alarm.");
    } catch(e) { toast.error("Error updating crisis."); }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if(!broadcastMsg.trim()) return;
    try {
      const newBroadcastRef = push(ref(db, `broadcasts/${buildingId}`));
      await set(newBroadcastRef, {
        message: broadcastMsg,
        sentBy: 'ADMIN',
        timestamp: serverTimestamp(),
        type: 'EMERGENCY'
      });
      toast.success("HIGH LEVEL ALERT pushed to all Guests & Staff!");
      setBroadcastMsg('');
    } catch(e) { toast.error("Broadcast failed."); }
  };

  const handleStopAlert = async () => {
    try {
      const newBroadcastRef = push(ref(db, `broadcasts/${buildingId}`));
      await set(newBroadcastRef, {
        message: 'CLEAR',
        sentBy: 'ADMIN',
        timestamp: serverTimestamp(),
        type: 'CLEAR'
      });
      toast.success("Alert manually stopped across all devices.");
    } catch(e) { toast.error("Failed to stop alert."); }
  };

  // UI Helpers
  const getSeverityColor = (sev) => {
    switch(sev) {
      case 'CRITICAL': return 'bg-severity-critical text-white';
      case 'HIGH': return 'bg-severity-high text-white';
      case 'MEDIUM': return 'bg-severity-medium text-black';
      case 'LOW': return 'bg-severity-low text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const TABS = [
    { id: 'LIVE_SOS', label: 'Live SOS', icon: ShieldAlert },
    { id: 'SERVICES', label: 'Services', icon: Clock },
    { id: 'GUESTS', label: 'Guests', icon: Users },
    { id: 'STAFF', label: 'Staff', icon: HardHat },
    { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
    { id: 'EMERGENCY', label: 'Dispatch', icon: PhoneCall },
    { id: 'LOST_FOUND', label: 'Lost & Found', icon: Search },
    { id: 'QR_CODE', label: 'Venue QR', icon: QrCode },
  ];

  return (
    <div className="min-h-screen flex bg-dark-bg text-white font-inter">
      {/* Sidebar */}
      <aside className="w-64 bg-card-bg border-r border-card-border flex flex-col hidden md:flex">
        <div className="p-6 border-b border-card-border flex flex-col gap-1">
          <div className="flex items-center gap-2 text-primary-red font-bold text-xl">
            <ShieldAlert /> SENTINEL
          </div>
          {adminProfile && (
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {adminProfile.buildingName} • {adminProfile.facilityType}
            </div>
          )}
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition font-semibold ${isActive ? 'bg-primary-red text-white' : 'text-text-secondary hover:bg-card-border hover:text-white'}`}
              >
                <Icon size={20} /> {tab.label}
                {tab.id === 'LIVE_SOS' && activeCrises.length > 0 && (
                  <span className="ml-auto bg-white text-primary-red text-xs font-black px-2 py-0.5 rounded-full">{activeCrises.length}</span>
                )}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-card-border">
          <button onClick={handleLogout} className="flex items-center gap-2 text-text-secondary hover:text-white w-full px-4 py-2">
            <LogOut size={18}/> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Nav Header */}
      <div className="md:hidden fixed top-0 w-full bg-card-bg border-b border-card-border z-50 flex overflow-x-auto items-center">
        {TABS.map(tab => (
           <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-4 whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'border-primary-red text-primary-red font-bold' : 'border-transparent text-text-secondary'}`}>
             {tab.label}
           </button>
        ))}
        <button onClick={handleLogout} className="px-4 py-4 whitespace-nowrap text-text-secondary hover:text-white flex items-center gap-1 ml-auto border-b-2 border-transparent">
          <LogOut size={16}/> Logout
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen">
        
        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Active Crisis", val: activeCrises.length, color: "text-alert-red" },
            { label: "Resolved Today", val: resolvedToday.length, color: "text-success" },
            { label: "Staff Online", val: staffOnline.length, color: "text-info" },
            { label: "Total Guests", val: guests.length, color: "text-white" },
            { label: "Total Scans", val: guests.length + staff.length, color: "text-text-secondary" },
          ].map((stat, i) => (
            <div key={i} className="bg-card-bg p-4 rounded-xl border border-card-border">
              <p className="text-sm text-text-secondary mb-1">{stat.label}</p>
              <h3 className={`text-2xl font-bold ${stat.color}`}>{stat.val}</h3>
            </div>
          ))}
        </div>

        {/* TAB 1: LIVE SOS */}
        {activeTab === 'LIVE_SOS' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Command Center: Live Alerts</h2>
            {activeCrises.length === 0 ? (
              <div className="bg-success/10 border border-success/30 p-12 rounded-2xl text-center">
                <CheckCircle size={48} className="text-success mx-auto mb-4" />
                <h3 className="text-xl font-bold text-success mb-2">All Clear</h3>
                <p className="text-text-secondary">No active emergencies in the building.</p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                {activeCrises.map(crisis => (
                  <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} key={crisis.sosId} className={`bg-card-bg border-2 rounded-xl overflow-hidden ${crisis.status === 'ESCALATED' ? 'border-primary-red animate-pulse shadow-[0_0_25px_rgba(255,0,0,0.6)]' : (crisis.status === 'VERIFIED_REAL' ? 'border-alert-red shadow-[0_0_15px_rgba(255,82,82,0.8)]' : (crisis.status === 'PENDING' ? 'border-warning shadow-[0_0_15px_rgba(255,193,7,0.2)]' : 'border-warning'))}`}>
                    <div className="p-4 border-b border-card-border flex justify-between items-center bg-black/20">
                      <div className="flex gap-2 items-center">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${getSeverityColor(crisis.severity)}`}>{crisis.severity}</span>
                        <span className="font-bold text-lg">{crisis.type}</span>
                      </div>
                      <span className="text-sm text-text-secondary">{new Date(crisis.timestamp).toLocaleTimeString()}</span>
                    </div>
                    
                    <div className="p-5 grid grid-cols-2 gap-4 border-b border-card-border">
                      <div>
                        <p className="text-xs text-text-secondary uppercase mb-1">Location</p>
                        <p className="font-bold flex items-center gap-1"><MapPin size={16} className="text-primary-red"/> {crisis.raisedBy.roomNumber || crisis.raisedBy.floor}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary uppercase mb-1">Reporter</p>
                        <p className="font-bold">{crisis.raisedBy.name} <span className="text-text-secondary text-sm">({crisis.raisedBy.role})</span></p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-text-secondary uppercase mb-1">Description</p>
                        <p className="bg-dark-bg p-3 rounded text-sm">"{crisis.description || 'No description provided.'}"</p>
                      </div>
                    </div>

                    <div className="p-5 bg-black/10">
                      <p className="text-xs text-text-secondary uppercase mb-2">Response Status</p>
                      {crisis.status === 'PENDING' ? (
                        <div className="flex items-center gap-2 text-warning font-bold animate-pulse">
                          <AlertTriangle size={18}/> Awaiting Staff Verification...
                        </div>
                      ) : crisis.status === 'ESCALATED' ? (
                        <div className="flex flex-col gap-1 text-primary-red font-bold animate-pulse">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={18}/> ⚠️ ESCALATED (Unattended)
                          </div>
                          <span className="text-xs text-white">Call emergency services immediately!</span>
                        </div>
                      ) : (
                        <div className={`flex flex-col gap-1 font-bold ${crisis.status === 'VERIFIED_REAL' ? 'text-alert-red' : 'text-warning'}`}>
                          <div className="flex items-center gap-2">
                            {crisis.status === 'VERIFIED_REAL' ? <AlertTriangle size={18}/> : <CheckCircle size={18}/>} 
                            {crisis.status === 'VERIFIED_REAL' ? 'VERIFIED EMERGENCY by' : 'Handled by'} {crisis.verifiedBy?.name || crisis.acceptedBy?.name}
                          </div>
                          {crisis.status === 'VERIFIED_REAL' && <span className="text-xs text-white bg-alert-red px-2 py-1 inline-block mt-1 rounded w-max">TRUE CRISIS CONFIRMED</span>}
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex flex-wrap gap-2 border-t border-card-border bg-black/30">
                      <a href={`tel:${crisis.raisedBy.mobile}`} className="px-4 py-2 bg-dark-bg border border-card-border rounded hover:bg-card-border flex items-center gap-2 text-sm font-semibold"><Phone size={14}/> Caller</a>
                      <div className="ml-auto flex gap-2">
                        <button onClick={() => handleFalseAlarm(crisis.sosId)} className="px-4 py-2 bg-dark-bg border border-alert-red text-alert-red hover:bg-alert-red hover:text-white rounded font-bold text-sm transition">Mark as Fake</button>
                        <button onClick={() => handleResolve(crisis.sosId)} className="px-4 py-2 bg-success hover:bg-green-600 text-white rounded font-bold text-sm transition">Mark Resolved</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: SERVICES */}
        {activeTab === 'SERVICES' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Active Staff Services</h2>
            <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-dark-bg text-text-secondary">
                  <tr><th className="p-4">Type</th><th className="p-4">Guest</th><th className="p-4">Room</th><th className="p-4">Assigned To</th><th className="p-4">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {services.filter(s => s.status !== 'COMPLETED').map(s => (
                    <tr key={s.requestId} className="hover:bg-dark-bg/50">
                      <td className="p-4 font-bold">{s.type}</td>
                      <td className="p-4">{s.raisedBy.name}</td>
                      <td className="p-4">{s.raisedBy.roomNumber}</td>
                      <td className="p-4 font-semibold">{s.acceptedBy ? s.acceptedBy.name : <span className="text-warning italic">Pending Assignment...</span>}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${s.status === 'PENDING' ? 'bg-warning/20 text-warning' : 'bg-info/20 text-info'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {services.filter(s => s.status !== 'COMPLETED').length === 0 && <tr><td colSpan="5" className="p-8 text-center text-text-secondary">No active service requests right now.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: GUESTS */}
        {activeTab === 'GUESTS' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Active Guests Directory</h2>
            <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-dark-bg text-text-secondary">
                  <tr><th className="p-4">Name</th><th className="p-4">Room</th><th className="p-4">Mobile</th><th className="p-4">Joined</th></tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {guests.map(g => (
                    <tr key={g.userId} className="hover:bg-dark-bg/50">
                      <td className="p-4 font-bold">{g.name}</td>
                      <td className="p-4">{g.roomNumber}</td>
                      <td className="p-4">{g.mobile}</td>
                      <td className="p-4 text-text-secondary">{new Date(g.joinedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {guests.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-text-secondary">No guests currently checked into network.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: STAFF */}
        {activeTab === 'STAFF' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Personnel Roster</h2>
            <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-dark-bg text-text-secondary">
                  <tr><th className="p-4">Name</th><th className="p-4">Role</th><th className="p-4">Floor</th><th className="p-4">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {staff.map(s => (
                    <tr key={s.userId} className="hover:bg-dark-bg/50">
                      <td className="p-4 font-bold">{s.name} <span className="text-xs text-text-secondary ml-2">{s.staffId}</span></td>
                      <td className="p-4">{s.profession}</td>
                      <td className="p-4">{s.floor}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${s.status === 'available' ? 'bg-success/20 text-success' : 'bg-card-border text-text-secondary'}`}>
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-text-secondary">No staff members active.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ANALYTICS */}
        {activeTab === 'ANALYTICS' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">System Analytics</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card-bg p-6 rounded-xl border border-card-border h-80">
                <h3 className="font-bold mb-4 text-text-secondary">Network Registrations (Mock)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{name: 'Guests', count: guests.length}, {name: 'Staff', count: staff.length}]}>
                    <XAxis dataKey="name" stroke="#9E9E9E"/>
                    <YAxis stroke="#9E9E9E"/>
                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1A1A1A', borderColor: '#2D2D2D'}}/>
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card-bg p-6 rounded-xl border border-card-border h-80">
                <h3 className="font-bold mb-4 text-text-secondary">Crisis Types (All Time)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={
                      Object.entries(crises.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {}))
                        .map(([name, value]) => ({name, value}))
                    } dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      <Cell fill="#FF5252" />
                      <Cell fill="#FFC107" />
                      <Cell fill="#2196F3" />
                      <Cell fill="#4CAF50" />
                    </Pie>
                    <RechartsTooltip contentStyle={{backgroundColor: '#1A1A1A', borderColor: '#2D2D2D'}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: EMERGENCY DISPATCH */}
        {activeTab === 'EMERGENCY' && (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-2xl font-bold mb-4">Emergency Dispatch & Broadcast</h2>
            
            <div className="bg-card-bg border border-alert-red p-6 rounded-xl shadow-[0_0_20px_rgba(255,0,0,0.15)]">
              <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-alert-red"><AlertTriangle className="animate-pulse" size={24}/> HIGH LEVEL ALERT ALL</h3>
              <p className="text-sm text-text-secondary mb-4">Instantly push a critical emergency banner to EVERY active device (All Guests & Staff) in the building.</p>
              <form onSubmit={handleBroadcast} className="flex flex-col gap-4">
                <textarea 
                  value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder="e.g. EVACUATE THE BUILDING IMMEDIATELY."
                  className="bg-dark-bg border border-alert-red p-4 rounded-lg text-white focus:border-red-500 outline-none h-28 resize-none font-bold text-lg shadow-[inset_0_0_10px_rgba(255,0,0,0.1)]"
                />
                <div className="flex gap-3 justify-end mt-2">
                  <button type="button" onClick={handleStopAlert} className="bg-dark-bg border border-card-border hover:bg-card-border text-white font-bold py-4 rounded-lg px-8 transition text-lg">
                    STOP ALERT
                  </button>
                  <button type="submit" className="bg-alert-red hover:bg-red-700 text-white font-black py-4 rounded-lg px-12 shadow-[0_0_15px_rgba(255,0,0,0.4)] transition text-lg flex items-center gap-2">
                    <AlertTriangle size={24}/> ALERT ALL
                  </button>
                </div>
              </form>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-4">External Services Speed Dial</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <a href="tel:101" className="bg-card-bg border border-card-border p-6 rounded-xl flex flex-col items-center hover:border-primary-red transition">
                <span className="text-4xl mb-2">🚒</span><h4 className="font-bold">Fire Dept</h4><p className="text-primary-red text-xl font-black mt-2">101</p>
              </a>
              <a href="tel:108" className="bg-card-bg border border-card-border p-6 rounded-xl flex flex-col items-center hover:border-info transition">
                <span className="text-4xl mb-2">🚑</span><h4 className="font-bold">Ambulance</h4><p className="text-info text-xl font-black mt-2">108</p>
              </a>
              <a href="tel:100" className="bg-card-bg border border-card-border p-6 rounded-xl flex flex-col items-center hover:border-warning transition">
                <span className="text-4xl mb-2">🚔</span><h4 className="font-bold">Police</h4><p className="text-warning text-xl font-black mt-2">100</p>
              </a>
            </div>
          </div>
        )}

        {/* TAB 6: LOST & FOUND */}
        {activeTab === 'LOST_FOUND' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-info"><Search /> Lost & Found Moderation</h2>
            <p className="text-sm text-text-secondary mb-4">View active items reported by guests and staff. Admins can mark items as resolved once they have been returned to their owners.</p>
            <LostAndFoundFeed isAdmin={true} />
          </div>
        )}

        {/* TAB 7: QR CODE */}
        {activeTab === 'QR_CODE' && (
          <div className="space-y-6 flex flex-col items-center justify-center text-center py-12">
            <h2 className="text-3xl font-bold mb-2">Venue Entry QR Codes</h2>
            <p className="text-text-secondary mb-8">Print and place these QR codes at your building entrances. Fast-track codes skip the role selection screen.</p>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
              
              {/* General QR */}
              <div className="bg-card-bg p-6 rounded-xl border border-card-border flex flex-col items-center">
                <h3 className="font-bold mb-4 text-white">General Entry</h3>
                <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
                  <QRCodeSVG value={`${window.location.origin}/onboarding/${buildingId}`} size={150} level={"H"} fgColor={"#0D0D0D"} bgColor={"#FFFFFF"} />
                </div>
                <p className="text-xs text-text-secondary">Asks "Who are you?" on scan</p>
              </div>

              {/* Guest QR */}
              <div className="bg-card-bg p-6 rounded-xl border border-card-border flex flex-col items-center">
                <h3 className="font-bold mb-4 text-white">
                  {adminProfile?.facilityType === 'Hotel' ? 'Guest Fast-Track' : 'Patient Fast-Track'}
                </h3>
                <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
                  <QRCodeSVG value={`${window.location.origin}/onboarding/${buildingId}?role=guest`} size={150} level={"H"} fgColor={"#0D0D0D"} bgColor={"#FFFFFF"} />
                </div>
                <p className="text-xs text-text-secondary">
                  Goes straight to {adminProfile?.facilityType === 'Hotel' ? 'Guest' : 'Patient'} form
                </p>
              </div>

              {/* Staff QR */}
              <div className="bg-card-bg p-6 rounded-xl border border-card-border flex flex-col items-center">
                <h3 className="font-bold mb-4 text-white">Staff Fast-Track</h3>
                <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
                  <QRCodeSVG value={`${window.location.origin}/onboarding/${buildingId}?role=staff`} size={150} level={"H"} fgColor={"#0D0D0D"} bgColor={"#FFFFFF"} />
                </div>
                <p className="text-xs text-text-secondary">Goes straight to Staff form</p>
              </div>

            </div>
            
            <p className="mt-6 text-sm text-text-secondary bg-card-bg px-6 py-3 rounded-lg border border-card-border">
              Embedded Building ID: <span className="font-bold text-white">{buildingId}</span>
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
