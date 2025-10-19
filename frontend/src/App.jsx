import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/homePage';
import { Buffer } from 'buffer';
import Dashboard from './pages/vault';
import SocialRecoveryWalletPage from './pages/SocialRecoveryWalletPage';
window.Buffer = Buffer;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <Router>
      <Routes>
        <Route path="/social-recovery" element={<SocialRecoveryWalletPage />} />
      </Routes>
    </Router>
  );
}