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
  Dumbbell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useView } from '../../contexts/ViewContext';
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
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/vitals', label: 'Vitals', icon: Activity },
    { path: '/medications', label: 'Medications', icon: Pill },
    { path: '/meals', label: 'Meals', icon: UtensilsCrossed },
    { path: '/food-diary', label: 'Food Diary', icon: FileText },
    { path: '/analytics', label: 'Analytics', icon: BarChart },
  ];

  // Add therapist portal if user is a therapist or admin
  if (user?.role === 'therapist' || user?.role === 'admin') {
    navItems.push({ path: '/patients', label: 'Patients', icon: Stethoscope });
    navItems.push({ path: '/exercises', label: 'Exercises', icon: Dumbbell });
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
          <div className="hidden md:flex items-center space-x-1">
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
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-all duration-300 hover:scale-110"
              style={{
                color: 'var(--accent)',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
              }}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* View Toggle - Show for therapists and admins */}
            {(user?.role === 'therapist' || user?.role === 'admin') && (
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
            )}

            <Link
              to="/profile"
              className="flex items-center space-x-1 px-2 py-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <User className="h-4 w-4" />
              <span className="text-sm">{user?.name || 'Profile'}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-2 py-2 rounded-lg hover:bg-red-500/20 text-red-600 transition-colors"
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

            {/* Theme Toggle for Mobile */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200"
              style={{
                color: 'var(--accent)',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
              }}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {/* View Toggle for Mobile - Show for therapists and admins */}
            {(user?.role === 'therapist' || user?.role === 'admin') && (
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
            )}

            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/20 transition-colors"
            >
              <User className="h-5 w-5" />
              <span>Profile ({user?.name})</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-500/20 text-red-600 transition-colors"
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
