import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import LandingPage from './pages/LandingPage';
import QRScanner from './pages/QRScanner';
import Onboarding from './pages/Onboarding';
import GuestDashboard from './pages/GuestDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';

import SOSButton from './components/SOSButton';
import AlertBanner from './components/AlertBanner';

import { AppProvider } from './context/AppContext';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: '#1A1A1A',
              color: '#fff',
              border: '1px solid #2D2D2D',
            },
          }}
        />
        <AlertBanner />
        
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/scan" element={<QRScanner />} />
          <Route path="/onboarding/:buildingId" element={<Onboarding />} />
          <Route path="/guest" element={<GuestDashboard />} />
          <Route path="/staff" element={<StaffDashboard />} />
          
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>

        {/* Global SOS Button */}
        <SOSButton />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
