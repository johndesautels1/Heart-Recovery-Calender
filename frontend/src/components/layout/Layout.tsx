import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from '../Footer';
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
