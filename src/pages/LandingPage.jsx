
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Zap, Clock, Users, Brain, Bell } from 'lucide-react';
import Logo from '../components/Logo';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-white font-inter">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 bg-card-bg border-b border-card-border">
        <div onClick={() => navigate('/')} className="cursor-pointer">
          <Logo size="md" variant="horizontal" />
        </div>
        <button onClick={() => navigate('/admin/login')} className="text-text-secondary hover:text-white font-semibold">
          Hospital Admin Login
        </button>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-red/20 via-dark-bg to-dark-bg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Saving Seconds.<br/>Saving <span className="text-alert-red">Lives</span>.
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary mb-10 max-w-3xl mx-auto">
            A QR-based coordination system that instantly bridges Patients, Medical Staff, and Security during hospital emergencies.
          </p>
          <div className="flex gap-6 justify-center">
            <button 
              onClick={() => navigate('/scan')}
              className="bg-primary-red hover:bg-alert-red text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg shadow-primary-red/30 transition-all flex items-center gap-2"
            >
              Scan Hospital QR <Zap size={20} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="bg-card-bg border-y border-card-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-between items-center text-center gap-6">
          <div><h3 className="text-4xl font-bold text-white mb-2">&lt; 60s</h3><p className="text-text-secondary">Average Response Time</p></div>
          <div><h3 className="text-4xl font-bold text-white mb-2">3</h3><p className="text-text-secondary">Parties Connected Instantly</p></div>
          <div><h3 className="text-4xl font-bold text-white mb-2">Hospital</h3><p className="text-text-secondary">Specialized Protocol</p></div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-4 max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-12">The Healthcare Emergency Gap</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card-bg p-8 rounded-xl border border-card-border">
            <h3 className="text-xl font-bold text-alert-red mb-4">Patients are Stranded</h3>
            <p className="text-text-secondary">During a sudden event or fall, a patient often can&apos;t reach the call bell or exact security post.</p>
          </div>
          <div className="bg-card-bg p-8 rounded-xl border border-card-border">
            <h3 className="text-xl font-bold text-warning mb-4">Code Blue Latency</h3>
            <p className="text-text-secondary">Relying on phone lines and pagers creates delays when every heartbeat counts.</p>
          </div>
          <div className="bg-card-bg p-8 rounded-xl border border-card-border">
            <h3 className="text-xl font-bold text-info mb-4">Responders Need Data</h3>
            <p className="text-text-secondary">Internal security and EMTs need to know exactly which wing and bed number is in crisis.</p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4 bg-card-bg border-y border-card-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">How CrisisSync Works</h2>
          <div className="flex flex-col md:flex-row gap-8 justify-between relative">
            <div className="flex-1 text-center relative z-10">
              <div className="w-20 h-20 bg-dark-bg border-2 border-primary-red rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">1</div>
              <h3 className="text-xl font-bold mb-2">Scan QR</h3>
              <p className="text-text-secondary">Patients and Staff scan a wing-specific QR code upon entry. No app download needed.</p>
            </div>
            <div className="flex-1 text-center relative z-10">
              <div className="w-20 h-20 bg-dark-bg border-2 border-warning rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">2</div>
              <h3 className="text-xl font-bold mb-2">Raise SOS</h3>
              <p className="text-text-secondary">One tap on the floating SOS button sends exact location and medical alert to everyone.</p>
            </div>
            <div className="flex-1 text-center relative z-10">
              <div className="w-20 h-20 bg-dark-bg border-2 border-success rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">3</div>
              <h3 className="text-xl font-bold mb-2">Team Dispatched</h3>
              <p className="text-text-secondary">Nearest staff member accepts the task instantly. Admin monitors the resolution path.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Healthcare Protocols</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center p-6"><Zap size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">Instant Response</h3><p className="text-sm text-text-secondary">Eliminate the middleman. Patients talk directly to the floor responders.</p></div>
          <div className="flex flex-col items-center text-center p-6"><Brain size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">AI Triage</h3><p className="text-sm text-text-secondary">AI instantly categorizes emergency severity and suggests specialized medical protocols.</p></div>
          <div className="flex flex-col items-center text-center p-6"><ShieldAlert size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">Panic Mode</h3><p className="text-sm text-text-secondary">Silent triggers for aggressive intruder situations to keep patients safe.</p></div>
          <div className="flex flex-col items-center text-center p-6"><Clock size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">Auto Escalation</h3><p className="text-sm text-text-secondary">If no nurse accepts within 60s, the floor manager gets a high-priority alert.</p></div>
          <div className="flex flex-col items-center text-center p-6"><Users size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">Multi-Role Sync</h3><p className="text-sm text-text-secondary">Syncs doctors, nurses, security, and maintenance on a single thread.</p></div>
          <div className="flex flex-col items-center text-center p-6"><Bell size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">Push Notifications</h3><p className="text-sm text-text-secondary">Background alerts ensure staff never miss a critical Code Blue or fire ping.</p></div>
        </div>
      </section>

      <footer className="bg-card-bg border-t border-card-border py-12 text-center">
        <h2 className="text-2xl font-bold mb-6">Protect Your Facility Today</h2>
        <button onClick={() => navigate('/admin/login')} className="bg-white text-dark-bg px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition">
          Partner with CrisisSync
        </button>
      </footer>
    </div>
  );
}
