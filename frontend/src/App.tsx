import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ViewProvider } from './contexts/ViewContext';
import { PatientSelectionProvider } from './contexts/PatientSelectionContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { CompleteProfileModal } from './components/CompleteProfileModal';
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  CalendarPage,
  VitalsPage,
  MedicationsPage,
  MealsPage,
  FoodDiaryPage,
  AnalyticsPage,
  ProfilePage,
  PatientsPage,
  MyProvidersPage,
  PatientCalendarView,
  ExercisesPage,
  EventTemplatesPage,
  SleepPage,
  DevicesPage,
} from './pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function ProfileChecker({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasPatientProfile, user, isLoading } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    // Show modal if user is authenticated, patient role, and doesn't have profile
    if (!isLoading && isAuthenticated && user?.role === 'patient' && !hasPatientProfile) {
      setShowProfileModal(true);
    } else {
      setShowProfileModal(false);
    }
  }, [isAuthenticated, hasPatientProfile, user, isLoading]);

  return (
    <>
      {children}
      <CompleteProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileChecker>
          <ViewProvider>
            <PatientSelectionProvider>
              <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/vitals" element={<VitalsPage />} />
                <Route path="/medications" element={<MedicationsPage />} />
                <Route path="/meals" element={<MealsPage />} />
                <Route path="/food-diary" element={<FoodDiaryPage />} />
                <Route path="/sleep" element={<SleepPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/my-providers" element={<MyProvidersPage />} />
                <Route path="/patients/:patientId/calendar" element={<PatientCalendarView />} />
                <Route path="/exercises" element={<ExercisesPage />} />
                <Route path="/event-templates" element={<EventTemplatesPage />} />
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Router>
          </PatientSelectionProvider>
        </ViewProvider>
        </ProfileChecker>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
