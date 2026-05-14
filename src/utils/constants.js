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
  { id: 'NURSE', icon: '👩‍⚕️', label: 'Need Nurse', color: 'bg-primary-red', hover: 'hover:bg-alert-red' },
  { id: 'WHEELCHAIR', icon: '🦽', label: 'Wheelchair', color: 'bg-info', hover: 'hover:bg-blue-600' },
  { id: 'WATER', icon: '💧', label: 'Drinking Water', color: 'bg-teal-600', hover: 'hover:bg-teal-500' },
  { id: 'BATHROOM', icon: '🚽', label: 'Bathroom Assist', color: 'bg-purple-600', hover: 'hover:bg-purple-500' }
];

export const DEFAULT_BUILDING_ID = "";
export const GEMINI_API_KEY = ""; // User should set this in .env or config
