import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from '../Footer';
import { GlobalWaterButton } from '../GlobalWaterButton';
import { GlobalWeatherWidget } from '../GlobalWeatherWidget';
import { GlobalHAWKAlert } from '../GlobalHAWKAlert';
import { Toaster } from 'react-hot-toast';

export function Layout() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)' }}
    >
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Footer />

      {/* Global Floating Water Intake Button - appears on all pages (right side, bottom) */}
      <GlobalWaterButton />

      {/* Global Weather Widget - appears on all pages (right side, above water button) */}
      <GlobalWeatherWidget />

      {/* Global HAWK Alert System - appears on all pages (left side) */}
      <GlobalHAWKAlert />

      <Toaster
        position="top-right"
        toastOptions={{
          className: 'glass',
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          },
        }}
      />
    </div>
  );
}
