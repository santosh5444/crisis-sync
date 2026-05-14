import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Zap, Clock, Users, Brain, Bell } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-white font-inter">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 bg-card-bg border-b border-card-border">
        <div className="text-2xl font-bold text-primary-red tracking-tight flex items-center gap-2">
          <ShieldAlert size={32} /> SENTINEL
        </div>
        <button onClick={() => navigate('/admin/login')} className="text-text-secondary hover:text-white font-semibold">
          Admin Login
        </button>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-red/20 via-dark-bg to-dark-bg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Crisis Happens in <span className="text-alert-red">Seconds</span>.<br/>So Does SENTINEL.
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary mb-10 max-w-3xl mx-auto">
            A QR-based emergency coordination system that instantly bridges Hotel Guests, Staff, and First Responders.
          </p>
          <div className="flex gap-6 justify-center">
            <button 
              onClick={() => navigate('/scan')}
              className="bg-primary-red hover:bg-alert-red text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg shadow-primary-red/30 transition-all flex items-center gap-2"
            >
              Scan QR to Enter <Zap size={20} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="bg-card-bg border-y border-card-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-between items-center text-center gap-6">
          <div><h3 className="text-4xl font-bold text-white mb-2">&lt; 60s</h3><p className="text-text-secondary">Average Response Time</p></div>
          <div><h3 className="text-4xl font-bold text-white mb-2">3</h3><p className="text-text-secondary">Parties Connected Instantly</p></div>
          <div><h3 className="text-4xl font-bold text-white mb-2">6</h3><p className="text-text-secondary">Crisis Types Handled</p></div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-4 max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-12">The Hospitality Emergency Gap</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card-bg p-8 rounded-xl border border-card-border">
            <h3 className="text-xl font-bold text-alert-red mb-4">Guests are Stranded</h3>
            <p className="text-text-secondary">During a fire or threat, a guest has no direct line to the exact security guard on their floor.</p>
          </div>
          <div className="bg-card-bg p-8 rounded-xl border border-card-border">
            <h3 className="text-xl font-bold text-warning mb-4">Staff Gets Info Late</h3>
            <p className="text-text-secondary">Front desk acts as a slow middleman, calling radios while seconds tick away.</p>
          </div>
          <div className="bg-card-bg p-8 rounded-xl border border-card-border">
            <h3 className="text-xl font-bold text-info mb-4">Responders Lack Context</h3>
            <p className="text-text-secondary">Police and medics arrive without knowing exactly which room to go to or how severe it is.</p>
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
              <p className="text-text-secondary">Guests and Staff scan a building-specific QR code upon entry. No app download needed.</p>
            </div>
            <div className="flex-1 text-center relative z-10">
              <div className="w-20 h-20 bg-dark-bg border-2 border-warning rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">2</div>
              <h3 className="text-xl font-bold mb-2">Raise SOS</h3>
              <p className="text-text-secondary">One tap on the floating SOS button sends exact location and emergency type to everyone.</p>
            </div>
            <div className="flex-1 text-center relative z-10">
              <div className="w-20 h-20 bg-dark-bg border-2 border-success rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">3</div>
              <h3 className="text-xl font-bold mb-2">Help Arrives</h3>
              <p className="text-text-secondary">First staff member to accept locks the task. Admin tracks progress in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Enterprise Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center p-6"><Zap size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">First-Accept Locking</h3><p className="text-sm text-text-secondary">Like Swiggy dispatch, only one staff member can claim an SOS to avoid confusion.</p></div>
          <div className="flex flex-col items-center text-center p-6"><Brain size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">Gemini AI Classification</h3><p className="text-sm text-text-secondary">AI instantly categorizes emergency severity and suggests emergency contacts.</p></div>
          <div className="flex flex-col items-center text-center p-6"><ShieldAlert size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">Silent SOS Mode</h3><p className="text-sm text-text-secondary">For robberies or active threats, SOS triggers silently without alerting the attacker.</p></div>
          <div className="flex flex-col items-center text-center p-6"><Clock size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">Auto Escalation</h3><p className="text-sm text-text-secondary">If no staff accepts within 60s, admin gets an urgent high-priority alert.</p></div>
          <div className="flex flex-col items-center text-center p-6"><Users size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">Building-Wide Broadcasts</h3><p className="text-sm text-text-secondary">Admin can send calm, synchronized instructions to every scanned phone.</p></div>
          <div className="flex flex-col items-center text-center p-6"><Bell size={40} className="text-primary-red mb-4"/><h3 className="font-bold mb-2">FCM Push Alerts</h3><p className="text-sm text-text-secondary">Background notifications ensure staff never miss a critical crisis ping.</p></div>
        </div>
      </section>

      <footer className="bg-card-bg border-t border-card-border py-12 text-center">
        <h2 className="text-2xl font-bold mb-6">Protect Your Venue Today</h2>
        <button onClick={() => navigate('/admin/login')} className="bg-white text-dark-bg px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition">
          Partner with SENTINEL
        </button>
      </footer>
    </div>
  );
}
