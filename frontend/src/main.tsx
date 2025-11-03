import React from 'react'
import ReactDOM from 'react-dom/client'
import './tokens.css'
import './index.css'
import './print.css'
import './i18n'
import App from './App.tsx'
import { onCLS, onINP, onLCP } from 'web-vitals' // INP replaced FID in web-vitals v3+

// PERF-006: Log Core Web Vitals metrics to console for performance monitoring
onCLS(console.log)
onINP(console.log) // Interaction to Next Paint (replaced First Input Delay)
onLCP(console.log)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
