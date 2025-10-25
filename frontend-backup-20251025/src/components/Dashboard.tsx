import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Favorite,
  Restaurant,
  Medication,
  CalendarMonth,
  TrendingUp,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { eventsAPI, vitalsAPI, mealsAPI, medicationsAPI } from '../services/api';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface HealthMetric {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  change?: number;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [selectedDate] = useState(new Date());

  // Fetch today's events
  const { data: events } = useQuery({
    queryKey: ['events', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () =>
      eventsAPI.getEvents({
        start: startOfDay(selectedDate).toISOString(),
        end: endOfDay(selectedDate).toISOString(),
      }),
  });

  // Fetch latest vitals
  const { data: vitals } = useQuery({
    queryKey: ['vitals', 'latest'],
    queryFn: () => vitalsAPI.getLatest(user?.id || 0),
    enabled: !!user?.id,
  });

  // Fetch today's meals
  const { data: meals } = useQuery({
    queryKey: ['meals', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () =>
      mealsAPI.getMeals({
        userId: user?.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
      }),
    enabled: !!user?.id,
  });

  // Fetch active medications
  const { data: medications } = useQuery({
    queryKey: ['medications', 'active'],
    queryFn: () =>
      medicationsAPI.getMedications({
        userId: user?.id,
        active: true,
      }),
    enabled: !!user?.id,
  });

  // Sample chart data - in real app, this would come from API
  const bloodPressureData = [
    { date: '10/18', systolic: 128, diastolic: 82 },
    { date: '10/19', systolic: 125, diastolic: 80 },
    { date: '10/20', systolic: 130, diastolic: 85 },
    { date: '10/21', systolic: 126, diastolic: 81 },
    { date: '10/22', systolic: 122, diastolic: 78 },
    { date: '10/23', systolic: 120, diastolic: 75 },
    { date: '10/24', systolic: 118, diastolic: 74 },
  ];

  const heartRateData = [
    { time: '6am', rate: 62 },
    { time: '9am', rate: 75 },
    { time: '12pm', rate: 68 },
    { time: '3pm', rate: 72 },
    { time: '6pm', rate: 78 },
    { time: '9pm', rate: 65 },
  ];

  const complianceScore = 85; // This would be calculated from actual data

  const healthMetrics: HealthMetric[] = [
    {
      title: 'Blood Pressure',
      value: vitals?.data?.bloodPressureSystolic
        ? `${vitals.data.bloodPressureSystolic}/${vitals.data.bloodPressureDiastolic}`
        : '--/--',
      unit: 'mmHg',
      icon: <Favorite />,
      color: 'error.main',
      change: -5,
    },
    {
      title: 'Heart Rate',
      value: vitals?.data?.heartRate || '--',
      unit: 'bpm',
      icon: <TrendingUp />,
      color: 'primary.main',
      change: -3,
    },
    {
      title: 'Medications Today',
      value: medications?.data?.length || 0,
      icon: <Medication />,
      color: 'secondary.main',
    },
    {
      title: 'Meals Logged',
      value: meals?.data?.length || 0,
      unit: 'of 4',
      icon: <Restaurant />,
      color: 'success.main',
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.name?.split(' ')[0]}!
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {format(new Date(), 'EEEE, MMMM d, yyyy')}
      </Typography>

      {/* Health Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {healthMetrics.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.title}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: metric.color, mr: 2 }}>{metric.icon}</Box>
                  <Typography color="text.secondary" variant="body2">
                    {metric.title}
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {metric.value}
                  {metric.unit && (
                    <Typography component="span" variant="body1" color="text.secondary">
                      {' '}
                      {metric.unit}
                    </Typography>
                  )}
                </Typography>
                {metric.change && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: metric.change < 0 ? 'success.main' : 'error.main',
                      mt: 1,
                    }}
                  >
                    {metric.change > 0 ? '+' : ''}
                    {metric.change}% from last week
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Compliance Score */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Today's Compliance Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: '100%', mr: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={complianceScore}
                  sx={{
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: 'grey.300',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor:
                        complianceScore >= 80
                          ? 'success.main'
                          : complianceScore >= 60
                          ? 'warning.main'
                          : 'error.main',
                    },
                  }}
                />
              </Box>
              <Box sx={{ minWidth: 50 }}>
                <Typography variant="h6" color="text.secondary">
                  {complianceScore}%
                </Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2">
                  Medications: 3/4 taken
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2">
                  Vitals: BP recorded
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Warning sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2">
                  Exercise: Not logged
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Blood Pressure Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Blood Pressure Trend (7 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={bloodPressureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke="#d32f2f"
                  strokeWidth={2}
                  name="Systolic"
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="#2196f3"
                  strokeWidth={2}
                  name="Diastolic"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Heart Rate Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Heart Rate Today
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={heartRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#ff6659"
                  fill="#ff6659"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Today's Schedule */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Today's Schedule</Typography>
              <Button startIcon={<CalendarMonth />} size="small">
                View Calendar
              </Button>
            </Box>
            {events?.data?.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {events.data.slice(0, 5).map((event: any) => (
                  <Box
                    key={event.id}
                    sx={{
                      p: 2,
                      backgroundColor: 'grey.100',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography>{event.title}</Typography>
                    <Typography color="text.secondary">
                      {format(new Date(event.startTime), 'h:mm a')}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">
                No events scheduled for today
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}