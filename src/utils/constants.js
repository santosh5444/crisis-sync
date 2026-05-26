export const EMERGENCY_TYPES = [
  { id: 'FIRE', label: '🔥 FIRE', isSilent: false },
  { id: 'NATURAL_DISASTER', label: '🌊 NATURAL DISASTER', isSilent: false },
  { id: 'TERRORIST_ATTACK', label: '🔫 TERRORIST ATTACK', isSilent: true },
  { id: 'ROBBERY', label: '🦹 ROBBERY / THEFT', isSilent: true },
  { id: 'MEDICAL', label: '🏥 MEDICAL EMERGENCY', isSilent: false },
  { id: 'OTHER', label: '⚡ OTHER EMERGENCY', isSilent: false },
];

export const FACILITY_TYPES = ['Hospital'];

export const HOSPITAL_PROFESSIONS = [
  '🩺 Doctor',
  '👩‍⚕️ Nurse',
  '🥼 Surgeon',
  '🔒 Security Officer',
  '💊 Pharmacist',
  '🔬 Lab Technician',
  '🛎️ Receptionist',
  '🧹 Housekeeping',
  '⚙️ Maintenance / IT'
];

export const HOSPITAL_SERVICES = [
  { id: 'NURSE', icon: '🩺', label: 'Need Nurse', color: 'text-red-400 bg-red-500/10 border-red-500/30 shadow-red-500/5' },
  { id: 'WHEELCHAIR', icon: '🦽', label: 'Wheelchair', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30 shadow-blue-500/5' },
  { id: 'WATER', icon: '💧', label: 'Drinking Water', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30 shadow-teal-500/5' },
  { id: 'BATHROOM', icon: '🚽', label: 'Bathroom Assist', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30 shadow-purple-500/5' },
  { id: 'MEDS', icon: '💊', label: 'Medicine Refill', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/5' },
  { id: 'MEAL', icon: '🍲', label: 'Meal Request', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-amber-500/5' },
  { id: 'COMFORT', icon: '🛏️', label: 'Blanket / Pillow', color: 'text-pink-400 bg-pink-500/10 border-pink-500/30 shadow-pink-500/5' },
  { id: 'CLEAN', icon: '🧹', label: 'Clean Room / Spill', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 shadow-cyan-500/5' }
];

export const DEFAULT_BUILDING_ID = "";
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
