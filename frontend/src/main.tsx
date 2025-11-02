import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { onCLS, onFID, onLCP } from 'web-vitals'

// PERF-006: Log Core Web Vitals metrics to console for performance monitoring
onCLS(console.log)
onFID(console.log)
onLCP(console.log)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
