import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, Mail, Lock, User, Stethoscope, UserCircle2, Shield } from 'lucide-react';
import { Button, Input, GlassCard } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['patient', 'therapist', 'admin']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // NEW: Watch password for strength indicator
  const password = watch('password', '');

  // NEW: Calculate password strength
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (!pwd) return { strength: 0, label: '', color: '' };

    let strength = 0;

    // Length check
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 10;

    // Complexity checks
    if (/[a-z]/.test(pwd)) strength += 15; // lowercase
    if (/[A-Z]/.test(pwd)) strength += 15; // uppercase
    if (/[0-9]/.test(pwd)) strength += 15; // numbers
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 20; // speCAIl chars

    // Determine label and color
    if (strength < 40) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength < 60) return { strength, label: 'Fair', color: 'bg-orange-500' };
    if (strength < 80) return { strength, label: 'Good', color: 'bg-yellow-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      await registerUser(data.email, data.password, data.name, data.role);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.error || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-500/10 rounded-full animate-float">
              <Heart className="h-12 w-12 text-red-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Heart Recovery Calendar</h1>
          <p className="text-gray-600">Start your cardiac recovery journey</p>
        </div>

        <GlassCard>
          <h2 className="text-2xl font-semibold text-white mb-6">Create Account</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              icon={<User className="h-5 w-5" />}
              error={errors.name?.message}
              {...register('name')}
            />

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                I am a...
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    value="patient"
                    {...register('role')}
                    className="peer sr-only"
                  />
                  <div className="glass p-4 rounded-lg border-2 border-transparent peer-checked:border-blue-500 peer-checked:bg-blue-50/50 hover:border-blue-300 transition-all">
                    <div className="flex flex-col items-center space-y-2">
                      <UserCircle2 className="h-8 w-8 text-blue-500" />
                      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Patient</span>
                    </div>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    value="therapist"
                    {...register('role')}
                    className="peer sr-only"
                  />
                  <div className="glass p-4 rounded-lg border-2 border-transparent peer-checked:border-green-500 peer-checked:bg-green-50/50 hover:border-green-300 transition-all">
                    <div className="flex flex-col items-center space-y-2">
                      <Stethoscope className="h-8 w-8 text-green-500" />
                      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Therapist</span>
                    </div>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    value="admin"
                    {...register('role')}
                    className="peer sr-only"
                  />
                  <div className="glass p-4 rounded-lg border-2 border-transparent peer-checked:border-purple-500 peer-checked:bg-purple-50/50 hover:border-purple-300 transition-all">
                    <div className="flex flex-col items-center space-y-2">
                      <Shield className="h-8 w-8 text-purple-500" />
                      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Admin</span>
                    </div>
                  </div>
                </label>
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              icon={<Mail className="h-5 w-5" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="h-5 w-5" />}
                error={errors.password?.message}
                {...register('password')}
              />
              {/* NEW: Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
                      Password Strength: {passwordStrength.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {passwordStrength.strength}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    <div className="flex flex-wrap gap-2">
                      <span className={password.length >= 8 ? 'text-green-600' : ''}>✓ 8+ chars</span>
                      <span className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>✓ uppercase</span>
                      <span className={/[0-9]/.test(password) ? 'text-green-600' : ''}>✓ number</span>
                      <span className={/[^a-zA-Z0-9]/.test(password) ? 'text-green-600' : ''}>✓ speCAIl</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-5 w-5" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <div className="text-sm">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="mr-2 mt-0.5"
                  required
                />
                <span className="text-white">
                  I agree to the{' '}
                  <Link to="/terms" className="text-blue-400 hover:text-blue-300 font-medium">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-blue-400 hover:text-blue-300 font-medium">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              className="mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
