import React, { useState, useEffect, useRef } from 'react';
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
import { toast } from 'sonner';
import api from '../../services/api';
import clsx from 'clsx';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
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

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingPhoto(true);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        try {
          const updatedUser = await api.updateProfile({ profilePhoto: base64String });
          updateUser(updatedUser);
          toast.success('Profile photo updated successfully!');
        } catch (error: any) {
          console.error('Error uploading photo:', error);
          toast.error(error.response?.data?.error || 'Failed to upload photo');
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing photo:', error);
      toast.error('Failed to process photo');
      setIsUploadingPhoto(false);
    }
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

  // Add My Patients/My Providers tab at position 2, then Vitals at position 3
  if (user?.role === 'therapist' || user?.role === 'admin') {
    navItems.splice(2, 0, { path: '/patients', label: 'My Patients', icon: Stethoscope });
    navItems.splice(3, 0, { path: '/vitals', label: 'Vitals', icon: Activity });
  } else if (user?.role === 'patient') {
    navItems.splice(2, 0, { path: '/my-providers', label: 'My Providers', icon: UserCircle2 });
    navItems.splice(3, 0, { path: '/vitals', label: 'Vitals', icon: Activity });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass sticky top-0 z-40 border-b border-white/20">
      <div className="w-full px-4">
        {/* Row 1: Logo and User Controls */}
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2 flex-shrink-0">
            <Heart className="h-8 w-8 text-red-500" />
            <span className="text-xl font-bold text-gradient">Heart Recovery</span>
          </Link>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
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

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />

            {/* Profile Section */}
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
              {/* Clickable Avatar */}
              <div
                onClick={handleAvatarClick}
                className="cursor-pointer relative flex-shrink-0"
                title="Click to upload profile picture"
              >
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-10">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {user?.profilePhoto ? (
                  <img
                    key={user.profilePhoto}
                    src={user.profilePhoto}
                    alt={user.name}
                    className="h-10 w-10 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white/30">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>

              {/* Name/Role - Click to go to profile */}
              <Link to="/profile" className="flex flex-col items-start">
                <span className="text-sm whitespace-nowrap">{user?.name || 'Profile'}</span>
                <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#ffa726' }}>
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </span>
              </Link>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-green-500/20 text-green-500 font-bold transition-colors whitespace-nowrap"
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

        {/* Row 2: Navigation Tabs with Glassmorphic Prismatic Design */}
        <div className="hidden md:flex items-center justify-center gap-1.5 pb-3 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="group relative"
                style={{ minWidth: '105px' }}
              >
                {/* Glassmorphic Prismatic Tab */}
                <div
                  className={clsx(
                    'relative px-3 py-2 rounded-xl transition-all duration-300',
                    'backdrop-blur-md border overflow-hidden',
                    active
                      ? 'bg-gradient-to-br from-white/40 via-white/30 to-white/20 border-white/60 shadow-lg'
                      : 'bg-gradient-to-br from-white/20 via-white/10 to-white/5 border-white/30 hover:border-white/50 hover:shadow-md'
                  )}
                  style={{
                    boxShadow: active
                      ? '0 8px 32px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 rgba(255, 255, 255, 0.2)'
                      : '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    transform: active ? 'translateY(-2px) scale(1.02)' : 'translateY(0)',
                  }}
                >
                  {/* Prismatic Light Reflection */}
                  <div
                    className={clsx(
                      'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300',
                      active ? 'opacity-30' : 'group-hover:opacity-20'
                    )}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(147,51,234,0.3) 25%, rgba(59,130,246,0.3) 50%, rgba(16,185,129,0.3) 75%, rgba(255,255,255,0.8) 100%)',
                      backgroundSize: '400% 400%',
                      animation: active ? 'prismaticShine 3s ease infinite' : 'none'
                    }}
                  />

                  {/* 3D Depth Layer */}
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: active
                        ? 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'
                        : 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)',
                    }}
                  />

                  {/* Content */}
                  <div className="relative flex items-center justify-center space-x-2">
                    <Icon
                      className={clsx(
                        'h-4 w-4 transition-all duration-300',
                        active ? 'scale-110' : 'group-hover:scale-105'
                      )}
                      style={{
                        color: active ? '#fb923c' : 'var(--ink)',
                        filter: active ? 'drop-shadow(0 0 12px rgba(251, 146, 60, 0.9))' : 'none'
                      }}
                    />
                    <span
                      className={clsx(
                        'text-sm font-medium transition-all duration-300',
                        active ? 'font-extrabold' : 'group-hover:font-semibold'
                      )}
                      style={{
                        color: active ? '#fb923c' : 'var(--ink)',
                        textShadow: active ? '0 0 18px rgba(251, 146, 60, 1), 0 2px 4px rgba(0, 0, 0, 0.9)' : 'none',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        letterSpacing: active ? '0.015em' : '0.01em',
                        fontWeight: active ? '800' : '600'
                      }}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Bottom Accent Line */}
                  {active && (
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300"
                      style={{
                        width: '80%',
                        background: 'linear-gradient(90deg, transparent, #fb923c, transparent)',
                        boxShadow: '0 0 14px rgba(251, 146, 60, 0.9)'
                      }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
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

            {/* Mobile Profile Section */}
            <div className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/20 transition-colors">
              {/* Clickable Avatar */}
              <div
                onClick={handleAvatarClick}
                className="cursor-pointer relative flex-shrink-0"
                title="Click to upload profile picture"
              >
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-10">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {user?.profilePhoto ? (
                  <img
                    key={user.profilePhoto}
                    src={user.profilePhoto}
                    alt={user.name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white/30">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>

              {/* Name/Role - Click to go to profile */}
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex flex-col items-start"
              >
                <span>{user?.name || 'Profile'}</span>
                <span className="text-sm font-medium" style={{ color: '#ffa726' }}>
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </span>
              </Link>
            </div>
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
