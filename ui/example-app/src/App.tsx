import React, { useState } from 'react';
import {
  CalendarView,
  EventEditor,
  SyncSettings,
  MealQuickAdd,
  LegendOverlay,
  VitalsForm,
  MedicationList,
  Dashboard,
  MealTracker
} from '@heartbeat/calendar-ui';
import './App.css';

const mockFetchEvents = async (start: string, end: string) => [
  {
    id: 'evt1',
    title: 'Cardiology Appointment',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 3600000).toISOString(),
    type: 'appointment',
    description: 'Regular checkup with Dr. Smith',
    location: 'Cardiac Care Center'
  },
  {
    id: 'evt2',
    title: 'Take Aspirin',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 900000).toISOString(),
    type: 'medication',
    description: '81mg daily',
    recurring: true
  },
  {
    id: 'evt3',
    title: 'Morning Walk',
    start: new Date(Date.now() + 86400000).toISOString(),
    end: new Date(Date.now() + 88200000).toISOString(),
    type: 'exercise',
    description: '30 minutes moderate pace'
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<'calendar' | 'dashboard' | 'meals' | 'vitals' | 'medications'>('dashboard');
  const [events, setEvents] = useState<any[]>([]);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  React.useEffect(() => {
    // Load initial events
    mockFetchEvents('', '').then(setEvents);
  }, []);

  const handleAddEvent = (event: any) => {
    const newEvent = {
      ...event,
      id: `evt${events.length + 1}`
    };
    setEvents([...events, newEvent]);
    setShowEventEditor(false);
  };

  const handleAddMeal = async (meal: any) => {
    console.log('Adding meal:', meal);
    // In a real app, this would save to the backend
    alert(`Meal added: ${meal.name} (${meal.calories} calories)`);
  };

  const handleVitalsSubmit = (vitals: any) => {
    console.log('Vitals submitted:', vitals);
    alert('Vitals recorded successfully!');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>❤️ HeartBeat Calendar</h1>
        <p>Your Complete Cardiac Recovery Companion</p>
      </header>

      <nav className="app-nav">
        <button
          className={view === 'dashboard' ? 'active' : ''}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={view === 'calendar' ? 'active' : ''}
          onClick={() => setView('calendar')}
        >
          Calendar
        </button>
        <button
          className={view === 'meals' ? 'active' : ''}
          onClick={() => setView('meals')}
        >
          Meals
        </button>
        <button
          className={view === 'vitals' ? 'active' : ''}
          onClick={() => setView('vitals')}
        >
          Vitals
        </button>
        <button
          className={view === 'medications' ? 'active' : ''}
          onClick={() => setView('medications')}
        >
          Medications
        </button>
        <button
          className="settings-btn"
          onClick={() => setShowSyncSettings(true)}
        >
          ⚙️ Sync Settings
        </button>
      </nav>

      <main className="app-main">
        {view === 'dashboard' && (
          <Dashboard
            events={events}
            vitals={{
              bloodPressure: { systolic: 120, diastolic: 80 },
              heartRate: 72,
              weight: 180
            }}
            medications={[
              { name: 'Aspirin', dose: '81mg', frequency: 'Daily' },
              { name: 'Metoprolol', dose: '25mg', frequency: 'Twice daily' }
            ]}
            upcomingAppointments={events.filter(e => e.type === 'appointment')}
          />
        )}

        {view === 'calendar' && (
          <div className="calendar-container">
            <button
              className="add-event-btn"
              onClick={() => setShowEventEditor(true)}
            >
              + Add Event
            </button>
            <CalendarView
              events={events}
              onEventClick={(event) => {
                setSelectedEvent(event);
                setShowEventEditor(true);
              }}
              onDateSelect={(date) => {
                console.log('Date selected:', date);
              }}
            />
            <LegendOverlay
              categories={[
                { type: 'medication', label: 'Medications', color: '#4CAF50' },
                { type: 'appointment', label: 'Appointments', color: '#2196F3' },
                { type: 'exercise', label: 'Exercise', color: '#FF9800' },
                { type: 'vitals', label: 'Vitals Check', color: '#9C27B0' }
              ]}
            />
          </div>
        )}

        {view === 'meals' && (
          <div className="meals-container">
            <MealQuickAdd
              onAdd={handleAddMeal}
              todayTotals={{
                calories: 1200,
                sodium: 1500,
                fat: 40,
                carbs: 150,
                protein: 60
              }}
            />
            <MealTracker
              meals={[
                {
                  id: '1',
                  type: 'breakfast',
                  name: 'Oatmeal with berries',
                  calories: 280,
                  timestamp: new Date().toISOString()
                },
                {
                  id: '2',
                  type: 'lunch',
                  name: 'Grilled chicken salad',
                  calories: 350,
                  timestamp: new Date().toISOString()
                }
              ]}
              onUpdateMeal={(meal) => console.log('Update meal:', meal)}
              onDeleteMeal={(id) => console.log('Delete meal:', id)}
            />
          </div>
        )}

        {view === 'vitals' && (
          <div className="vitals-container">
            <h2>Record Your Vitals</h2>
            <VitalsForm
              onSubmit={handleVitalsSubmit}
              previousVitals={{
                bloodPressureSystolic: 120,
                bloodPressureDiastolic: 80,
                heartRate: 72,
                weight: 180
              }}
            />
          </div>
        )}

        {view === 'medications' && (
          <div className="medications-container">
            <h2>Your Medications</h2>
            <MedicationList
              medications={[
                {
                  id: '1',
                  name: 'Aspirin',
                  dosage: '81mg',
                  frequency: 'Once daily',
                  purpose: 'Blood thinner',
                  startDate: '2024-01-01',
                  prescribedBy: 'Dr. Smith'
                },
                {
                  id: '2',
                  name: 'Metoprolol',
                  dosage: '25mg',
                  frequency: 'Twice daily',
                  purpose: 'Blood pressure',
                  startDate: '2024-01-01',
                  prescribedBy: 'Dr. Smith'
                },
                {
                  id: '3',
                  name: 'Atorvastatin',
                  dosage: '40mg',
                  frequency: 'Once daily at bedtime',
                  purpose: 'Cholesterol',
                  startDate: '2024-01-15',
                  prescribedBy: 'Dr. Johnson'
                }
              ]}
              onAddMedication={(med) => console.log('Add medication:', med)}
              onUpdateMedication={(med) => console.log('Update medication:', med)}
              onDeleteMedication={(id) => console.log('Delete medication:', id)}
              onTakeMedication={(id) => console.log('Medication taken:', id)}
            />
          </div>
        )}
      </main>

      {showEventEditor && (
        <div className="modal-overlay" onClick={() => setShowEventEditor(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <EventEditor
              event={selectedEvent}
              onSave={handleAddEvent}
              onCancel={() => {
                setShowEventEditor(false);
                setSelectedEvent(null);
              }}
            />
          </div>
        </div>
      )}

      {showSyncSettings && (
        <div className="modal-overlay" onClick={() => setShowSyncSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <SyncSettings
              onSave={(settings) => {
                console.log('Sync settings:', settings);
                setShowSyncSettings(false);
              }}
              onCancel={() => setShowSyncSettings(false)}
              currentSettings={{
                googleCalendar: false,
                appleHealth: false,
                fitbit: false,
                notifications: {
                  email: true,
                  sms: false,
                  push: true
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;