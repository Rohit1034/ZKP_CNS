import React, { useState, useEffect } from 'react';
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
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // Check if user is already logged in from localStorage
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true'); // store login status
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn'); // clear login status
  };

  // Optional: Sync with storage (in case multiple tabs are open)
  useEffect(() => {
    const syncLogin = () => {
      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    };
    window.addEventListener('storage', syncLogin);
    return () => window.removeEventListener('storage', syncLogin);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/wallet-setup" element={<WalletSetupPage />} />
        <Route path="/wallet-recovery" element={<WalletRecoveryPage />} />
        <Route
          path="/dashboard"
          element={(localStorage.getItem('isLoggedIn') === 'true' || !!localStorage.getItem('session_token')) ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
