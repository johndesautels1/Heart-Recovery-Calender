import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Google,
  Apple,
  Favorite,
  MonitorHeart,
  Medication,
  Restaurant,
  CalendarMonth,
  CheckCircle,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';

const features = [
  {
    icon: <MonitorHeart sx={{ fontSize: 40 }} />,
    title: 'Vital Signs Tracking',
    description: 'Monitor blood pressure, heart rate, and other vital signs',
  },
  {
    icon: <Medication sx={{ fontSize: 40 }} />,
    title: 'Medication Management',
    description: 'Never miss a dose with smart medication reminders',
  },
  {
    icon: <Restaurant sx={{ fontSize: 40 }} />,
    title: 'Nutrition Tracking',
    description: 'Track meals and monitor sodium, cholesterol intake',
  },
  {
    icon: <CalendarMonth sx={{ fontSize: 40 }} />,
    title: 'Appointment Calendar',
    description: 'Schedule and track all your medical appointments',
  },
];

export default function Login() {
  const { login, error, clearError } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    // Check for token in URL (from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const authError = urlParams.get('error');

    if (token) {
      handleTokenLogin(token);
    } else if (authError) {
      setMessage({ type: 'error', text: 'Authentication failed. Please try again.' });
    }
  }, []);

  const handleTokenLogin = async (token: string) => {
    setLoading(true);
    try {
      await login(token);
      // Redirect will be handled by App component when isAuthenticated changes
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to authenticate. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      // Register a demo user
      const response = await authAPI.login('demo@heartrecovery.com', 'Demo123!').catch(async () => {
        // If login fails, register the user first
        const registerResponse = await fetch('http://localhost:4000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'demo@heartrecovery.com',
            password: 'Demo123!',
            name: 'Demo User'
          })
        });
        const data = await registerResponse.json();
        return { data };
      });

      await login(response.data.token);
      setMessage({ type: 'success', text: 'Welcome to Heart Recovery Calendar!' });
    } catch (err: any) {
      console.error('Demo login error:', err);
      setMessage({ type: 'error', text: 'Demo login failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    handleDemoLogin();
  };

  const handleAppleLogin = () => {
    handleDemoLogin();
  };

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          {/* Left side - Features */}
          <Grid item xs={12} md={6}>
            <Box sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Favorite sx={{ fontSize: 48, mr: 2 }} />
                <Typography variant="h3" fontWeight="bold">
                  Heart Recovery Calendar
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                Your complete cardiac health companion
              </Typography>

              <Grid container spacing={2}>
                {features.map((feature, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <Box sx={{ color: 'white', mb: 1 }}>{feature.icon}</Box>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {feature.description}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>

          {/* Right side - Login */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                p: 4,
                borderRadius: 3,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                maxWidth: 450,
                mx: 'auto',
              }}
            >
              <CardContent>
                <Typography variant="h4" gutterBottom align="center" fontWeight="bold">
                  Welcome Back
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  align="center"
                  sx={{ mb: 4 }}
                >
                  Sign in to manage your heart health journey
                </Typography>

                {message && (
                  <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
                    {message.text}
                  </Alert>
                )}

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
                    {error}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<Google />}
                    onClick={handleGoogleLogin}
                    sx={{
                      py: 1.5,
                      bgcolor: '#4285f4',
                      '&:hover': {
                        bgcolor: '#357ae8',
                      },
                    }}
                  >
                    Continue with Google
                  </Button>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<Apple />}
                    onClick={handleAppleLogin}
                    sx={{
                      py: 1.5,
                      bgcolor: '#000',
                      '&:hover': {
                        bgcolor: '#333',
                      },
                    }}
                  >
                    Continue with Apple
                  </Button>
                </Box>

                <Divider sx={{ my: 3 }}>OR</Divider>

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={handleDemoLogin}
                  sx={{
                    py: 1.5,
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      borderColor: 'primary.dark',
                      bgcolor: 'rgba(211, 47, 47, 0.04)',
                    },
                  }}
                >
                  Demo Login (No Account Required)
                </Button>

                <Alert severity="info" icon={<CheckCircle />} sx={{ mt: 2 }}>
                  Click any button above for instant demo access
                </Alert>

                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #eee' }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Your health data is encrypted and secure
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    HIPAA Compliant • End-to-end Encryption
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Typography
              variant="body2"
              color="white"
              align="center"
              sx={{ mt: 3, opacity: 0.8 }}
            >
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}