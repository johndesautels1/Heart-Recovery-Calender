import app from './app';
import { startContinuousSync } from './services/continuousStravaSync';

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);

  // Start continuous Strava heart rate sync (every 5 minutes)
  // Critical for heart condition monitoring
  startContinuousSync();
});
