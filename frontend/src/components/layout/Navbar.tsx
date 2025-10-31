import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Home,
  Activity,
  Heart,
  Pill,
  UtensilsCrossed,
  BarChart,
  User,
  LogOut,
  Menu,
  X,
  Stethoscope,
  FileText,
  Moon,
  Sun,
  UserCircle2,
  Dumbbell,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useView } from '../../contexts/ViewContext';
import { LanguageSelector } from '../LanguageSelector';
import clsx from 'clsx';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { viewMode, setViewMode, isTherapistView } = useView();

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.body.classList.add('light-mode');
    } else {
      setIsDarkMode(true);
      document.body.classList.remove('light-mode');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);

    if (newIsDarkMode) {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const toggleView = () => {
    const newViewMode = viewMode === 'patient' ? 'therapist' : 'patient';
    setViewMode(newViewMode);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/exercises', label: 'Exercise & Activities', icon: Dumbbell },
    { path: '/meals', label: 'Meals', icon: UtensilsCrossed },
    { path: '/food-diary', label: 'Food Diary', icon: FileText },
    { path: '/medications', label: 'Medications', icon: Pill },
    { path: '/sleep', label: 'Sleep Journal', icon: Moon },
    { path: '/devices', label: 'My Devices', icon: Smartphone },
  ];

  // Add My Patients tab for therapists/admins or My Providers tab for patients at position 3
  if (user?.role === 'therapist' || user?.role === 'admin') {
    navItems.splice(2, 0, { path: '/patients', label: 'My Patients', icon: Stethoscope });
  } else if (user?.role === 'patient') {
    navItems.splice(2, 0, { path: '/my-providers', label: 'My Providers', icon: UserCircle2 });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass sticky top-0 z-40 border-b border-white/20">
      <div className="w-full px-2">
        <div className="flex items-center justify-between h-16 max-w-full">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-red-500" />
            <span className="text-xl font-bold text-gradient">Heart Recovery</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center space-x-1 px-2 py-2 rounded-lg transition-all duration-200 text-sm',
                    isActive(item.path)
                      ? 'bg-white/30 font-medium'
                      : 'hover:bg-white/20'
                  )}
                  style={{
                    color: isActive(item.path) ? 'var(--accent)' : 'var(--ink)'
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Theme Toggle Switch */}
            <div className="flex flex-col items-center">
              <button
                onClick={toggleTheme}
                className="relative inline-flex items-center h-6 rounded-full w-12 transition-all duration-300 hover:scale-105"
                style={{
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)'
                    : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  boxShadow: isDarkMode
                    ? '0 2px 8px rgba(124, 58, 237, 0.4)'
                    : '0 2px 8px rgba(251, 191, 36, 0.4)',
                }}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 flex items-center justify-center"
                  style={{
                    transform: isDarkMode ? 'translateX(2px)' : 'translateX(26px)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  {isDarkMode ? <Moon className="h-3 w-3 text-blue-900" /> : <Sun className="h-3 w-3 text-amber-500" />}
                </span>
              </button>
            </div>

            {/* Language Selector */}
            <LanguageSelector />

            {/* View Toggle - Hidden for now to simplify UI */}
            {/* {(user?.role === 'therapist' || user?.role === 'admin') && (
              <button
                onClick={toggleView}
                className="flex items-center space-x-1 px-2 py-2 rounded-lg transition-all duration-300 hover:scale-105 font-medium text-sm"
                style={{
                  color: isTherapistView ? '#10b981' : '#60a5fa',
                  backgroundColor: isTherapistView ? 'rgba(16, 185, 129, 0.1)' : 'rgba(96, 165, 250, 0.1)',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: isTherapistView ? '#10b981' : '#60a5fa',
                }}
                title={isTherapistView ? 'Switch to Patient View' : 'Switch to Therapist View'}
              >
                {isTherapistView ? (
                  <>
                    <Stethoscope className="h-4 w-4" />
                    <span className="text-sm">Therapist View</span>
                  </>
                ) : (
                  <>
                    <UserCircle2 className="h-4 w-4" />
                    <span className="text-sm">Patient View</span>
                  </>
                )}
              </button>
            )} */}

            <Link
              to="/profile"
              className="flex items-center space-x-2 px-2 py-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <User className="h-4 w-4" />
              <div className="flex flex-col items-start">
                <span className="text-sm">{user?.name || 'Profile'}</span>
                <span className="text-xs font-medium" style={{ color: '#ffa726' }}>
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-2 py-2 rounded-lg hover:bg-green-500/20 text-green-500 font-bold transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/20">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive(item.path)
                      ? 'bg-white/30 font-medium'
                      : 'hover:bg-white/20'
                  )}
                  style={{
                    color: isActive(item.path) ? 'var(--accent)' : 'var(--ink)'
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Theme Toggle Switch for Mobile */}
            <div className="w-full flex items-center justify-between px-4 py-3">
              <span style={{ color: 'var(--ink)' }}>Theme</span>
              <button
                onClick={toggleTheme}
                className="relative inline-flex items-center h-8 rounded-full w-16 transition-all duration-300"
                style={{
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)'
                    : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  boxShadow: isDarkMode
                    ? '0 2px 8px rgba(124, 58, 237, 0.4)'
                    : '0 2px 8px rgba(251, 191, 36, 0.4)',
                }}
              >
                <span
                  className="inline-block h-6 w-6 transform rounded-full bg-white transition-all duration-300 flex items-center justify-center"
                  style={{
                    transform: isDarkMode ? 'translateX(4px)' : 'translateX(36px)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  {isDarkMode ? <Moon className="h-4 w-4 text-blue-900" /> : <Sun className="h-4 w-4 text-amber-500" />}
                </span>
              </button>
            </div>

            {/* View Toggle for Mobile - Hidden for now to simplify UI */}
            {/* {(user?.role === 'therapist' || user?.role === 'admin') && (
              <button
                onClick={toggleView}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                style={{
                  color: isTherapistView ? '#10b981' : '#60a5fa',
                  backgroundColor: isTherapistView ? 'rgba(16, 185, 129, 0.1)' : 'rgba(96, 165, 250, 0.1)',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: isTherapistView ? '#10b981' : '#60a5fa',
                }}
              >
                {isTherapistView ? (
                  <>
                    <Stethoscope className="h-5 w-5" />
                    <span>Therapist View</span>
                  </>
                ) : (
                  <>
                    <UserCircle2 className="h-5 w-5" />
                    <span>Patient View</span>
                  </>
                )}
              </button>
            )} */}

            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/20 transition-colors"
            >
              <User className="h-5 w-5" />
              <div className="flex flex-col items-start">
                <span>{user?.name || 'Profile'}</span>
                <span className="text-sm font-medium" style={{ color: '#ffa726' }}>
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-green-500/20 text-green-500 font-bold transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
