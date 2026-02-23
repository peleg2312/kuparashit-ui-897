import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TeamProvider, useTeam } from './contexts/TeamContext';
import { getScreensByGroup } from './config/screens';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import RDMPage from './pages/Dashboard/RDMPage';
import DSPage from './pages/Dashboard/DSPage';
import ESXPage from './pages/Dashboard/ESXPage';
import VMSPage from './pages/Dashboard/VMSPage';
import ExchPage from './pages/ExchPage';
import QtreePage from './pages/QtreePage';
import SnapmirrorPage from './pages/SnapmirrorPage';
import TroubleshooterPage from './pages/TroubleshooterPage';
import MdsBuilderPage from './pages/MdsBuilderPage';
import RefaelToolsPage from './pages/RefaelToolsPage';
import PricePage from './pages/PricePage';
import HerziToolsPage from './pages/HerziToolsPage';
import NetappUpgradePage from './pages/NetappUpgradePage';
import NetappMultiExecPage from './pages/NetappMultiExecPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import UserManagementPage from './pages/UserManagementPage';
import LoginPage from './pages/LoginPage/LoginPage';
import './App.css';

function AppLoading() {
  return (
    <div className="app-loading">
      <div className="app-loading__spinner" />
      <p>Loading workspace...</p>
    </div>
  );
}

function HomeRedirect() {
  const { isAdmin } = useAuth();
  const { currentTeam } = useTeam();
  const allowed = currentTeam?.screens || [];
  const groups = getScreensByGroup(allowed, { isAdmin });
  const firstGroup = Object.values(groups)[0];
  const path = firstGroup?.screens?.[0]?.path || '/dashboard/rdm';
  return <Navigate to={path} replace />;
}

// Layout for authenticated routes
function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AppLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-root">
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PermissionRoute({ screenId, requireAdmin = false, children }) {
  const { isAllowed } = useTeam();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <AppLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <UnauthorizedPage />;
  }

  if (screenId && !isAllowed(screenId)) {
    return <UnauthorizedPage />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TeamProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Protected Routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<HomeRedirect />} />

              {/* Main Dashboard */}
              <Route path="/dashboard/rdm" element={
                <PermissionRoute screenId="rdm"><RDMPage /></PermissionRoute>
              } />
              <Route path="/dashboard/ds" element={
                <PermissionRoute screenId="ds"><DSPage /></PermissionRoute>
              } />
              <Route path="/dashboard/esx" element={
                <PermissionRoute screenId="esx"><ESXPage /></PermissionRoute>
              } />
              <Route path="/dashboard/vms" element={
                <PermissionRoute screenId="vms"><VMSPage /></PermissionRoute>
              } />

              {/* Storage */}
              <Route path="/exch" element={
                <PermissionRoute screenId="exch"><ExchPage /></PermissionRoute>
              } />
              <Route path="/qtree" element={
                <PermissionRoute screenId="qtree"><QtreePage /></PermissionRoute>
              } />
              <Route path="/snapmirror" element={
                <PermissionRoute screenId="snapmirror"><SnapmirrorPage /></PermissionRoute>
              } />
              <Route path="/troubleshooter" element={
                <PermissionRoute screenId="troubleshooter"><TroubleshooterPage /></PermissionRoute>
              } />
              <Route path="/scripts/mds-builder" element={
                <PermissionRoute screenId="mds-builder"><MdsBuilderPage /></PermissionRoute>
              } />

              {/* Tools */}
              <Route path="/refael-tools" element={
                <PermissionRoute screenId="refael"><RefaelToolsPage /></PermissionRoute>
              } />
              <Route path="/price" element={
                <PermissionRoute screenId="price"><PricePage /></PermissionRoute>
              } />
              <Route path="/herzi-tools" element={
                <PermissionRoute screenId="herzitools"><HerziToolsPage /></PermissionRoute>
              } />
              <Route path="/netapp-upgrade" element={
                <PermissionRoute screenId="netapp-upgrade"><NetappUpgradePage /></PermissionRoute>
              } />
              <Route path="/netapp-multi-exec" element={
                <PermissionRoute screenId="netapp-multi-exec"><NetappMultiExecPage /></PermissionRoute>
              } />
              <Route path="/admin/user-management" element={
                <PermissionRoute screenId="user-management" requireAdmin><UserManagementPage /></PermissionRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<HomeRedirect />} />
            </Route>
          </Routes>
        </TeamProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

