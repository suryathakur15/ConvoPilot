import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingScreen from '@/components/shared/LoadingScreen.jsx';

const AgentDashboard = lazy(() => import('@/pages/AgentDashboard.jsx'));
const AgentLogin     = lazy(() => import('@/pages/AgentLogin.jsx'));
const CustomerPortal = lazy(() => import('@/pages/CustomerPortal.jsx'));

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/"            element={<Navigate to="/agent" replace />} />
        <Route path="/agent/*"     element={<AgentDashboard />} />
        <Route path="/agent-login" element={<AgentLogin />} />
        <Route path="/chat"        element={<CustomerPortal />} />
        <Route path="*"            element={<Navigate to="/agent" replace />} />
      </Routes>
    </Suspense>
  );
}
