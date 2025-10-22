import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/homePage';
import { Buffer } from 'buffer';
import Dashboard from './pages/vault';
import WalletSetupPage from './pages/WalletSetupPage';
import WalletRecoveryPage from './pages/WalletRecoveryPage';
window.Buffer = Buffer;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/wallet-setup" element={<WalletSetupPage />} />
        <Route path="/wallet-recovery" element={<WalletRecoveryPage />} />
        <Route path="/dashboard" element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}