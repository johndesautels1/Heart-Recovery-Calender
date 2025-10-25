import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import MealTracker from './components/MealTracker';
import VitalsForm from './components/VitalsForm';
import MedicationList from './components/MedicationList';
import Login from './components/Login';
import { useAuthStore } from './store/authStore';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth().finally(() => setLoading(false));
  }, [checkAuth]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        Loading...
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navigation />
          <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/meals" element={<MealTracker />} />
              <Route path="/vitals" element={<VitalsForm />} />
              <Route path="/medications" element={<MedicationList />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </LocalizationProvider>
  );
}

export default App;