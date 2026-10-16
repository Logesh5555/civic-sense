import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { GuestOnly, RequireRole, FullPageSpinner } from './components/Guards.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Landing from './pages/public/Landing.jsx';
import { TrackPage, Privacy, Terms, NotFound } from './pages/public/Misc.jsx';
import { Login, Register, ForgotPassword, ResetPassword } from './pages/public/AuthPages.jsx';
import ReportIssue from './pages/citizen/ReportIssue.jsx';
import { CitizenDashboard, ReportSuccess, Profile, NotificationsPage } from './pages/citizen/CitizenPages.jsx';
import ComplaintsList from './features/ComplaintsList.jsx';
import ComplaintDetail from './features/ComplaintDetail.jsx';

// Heavier admin pages (charts) are code-split.
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview.jsx'));

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<FullPageSpinner />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<Landing />} />
                <Route path="track" element={<TrackPage />} />
                <Route path="track/:ref" element={<TrackPage />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="terms" element={<Terms />} />
              </Route>

              <Route element={<GuestOnly />}>
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
              </Route>
              <Route path="reset-password" element={<ResetPassword />} />

              <Route element={<RequireRole roles={['citizen']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="dashboard" element={<CitizenDashboard />} />
                  <Route path="report" element={<ReportIssue />} />
                  <Route path="report/success/:ref" element={<ReportSuccess />} />
                  <Route path="my-complaints" element={<ComplaintsList title="My complaints" />} />
                  <Route path="my-complaints/:id" element={<ComplaintDetail />} />
                </Route>
              </Route>

              <Route element={<RequireRole roles={['admin']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="admin" element={<AdminOverview />} />
                  <Route path="admin/complaints" element={<ComplaintsList title="All complaints" />} />
                  <Route path="admin/complaints/:id" element={<ComplaintDetail />} />
                  <Route path="admin/map" element={<Navigate to="/admin" replace />} />
                </Route>
              </Route>


              {/* Shared pages for any signed-in role */}
              <Route element={<RequireRole />}>
                <Route element={<DashboardLayout />}>
                  <Route path="profile" element={<Profile />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>
              </Route>

              <Route path="home" element={<Navigate to="/" replace />} />
              <Route element={<PublicLayout />}><Route path="*" element={<NotFound />} /></Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
