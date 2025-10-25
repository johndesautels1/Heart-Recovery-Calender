import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
    { path: '/analytics', label: 'Analytics', icon: BarChart },
  ];

  // Add therapist portal if user is a therapist
  if (user?.role === 'therapist') {
    navItems.push({ path: '/therapist', label: 'Patients', icon: Stethoscope });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass sticky top-0 z-40 border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
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
                    'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200',
                    isActive(item.path)
                      ? 'bg-white/30 text-blue-600 font-medium'
                      : 'hover:bg-white/20 text-gray-700'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/profile"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <User className="h-5 w-5" />
              <span className="text-sm">{user?.name || 'Profile'}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-red-500/20 text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
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
                      ? 'bg-white/30 text-blue-600 font-medium'
                      : 'hover:bg-white/20 text-gray-700'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
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
