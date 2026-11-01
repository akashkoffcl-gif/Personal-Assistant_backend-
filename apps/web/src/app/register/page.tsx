'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Too short', color: 'bg-gray-200' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-400' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-400' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Please accept the Terms of Service to continue.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(fullName, email, password);

    if (result.error) {
      setIsSubmitting(false);
      setErrorMessage(result.error);
      toast.error('Registration Failed', result.error);
    } else if (result.requireVerification) {
      setIsSubmitting(false);
      toast.success(
        'Verification Email Sent',
        'Registration successful. Please check your email to verify your account.',
      );
      router.replace('/verify-email');
    } else {
      setIsSubmitting(false);
      toast.success('Account Created', 'Welcome aboard to your personal workspace!');
      router.replace('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#EAE9FF] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#8B45F5] text-white shadow-lg shadow-[#8B45F5]/30 mb-3">
          <span className="font-extrabold text-2xl tracking-wider">M</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
          Personal Assistant
        </h1>
        <p className="text-xs sm:text-sm text-[#717182] font-medium mt-1">
          Create your isolated personal workspace
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-[460px] bg-white rounded-[26px] p-7 sm:p-9 border border-[#E8EAF5] shadow-[0_12px_40px_rgb(24,27,46,0.04)]">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#18181B] tracking-tight">Create Account</h2>
          <p className="text-xs text-[#717182] font-medium mt-1">
            Sign up to organize routines, tasks, calendar and wellness tracking
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-fade-in flex items-start gap-2">
            <span>&bull;</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-[#18181B] mb-1.5 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717182]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F4FD] border border-[#E5E2F5] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#8B45F5]/30 focus:border-[#8B45F5] transition-all"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-[#18181B] mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717182]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F4FD] border border-[#E5E2F5] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#8B45F5]/30 focus:border-[#8B45F5] transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-[#18181B] mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717182]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-10 pr-10 py-2.5 bg-[#F4F4FD] border border-[#E5E2F5] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#8B45F5]/30 focus:border-[#8B45F5] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#717182] hover:text-[#18181B] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength Meter */}
            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 grid grid-cols-4 gap-1 h-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-full rounded-full transition-all duration-300 ${
                        step <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-[#717182] w-14 text-right">
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-[#18181B] mb-1.5 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717182]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F4FD] border border-[#E5E2F5] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#8B45F5]/30 focus:border-[#8B45F5] transition-all"
              />
            </div>
          </div>

          {/* Terms Agreement */}
          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 rounded text-[#8B45F5] focus:ring-[#8B45F5] border-gray-300 mt-0.5"
              />
              <span className="text-xs text-[#717182] font-medium leading-relaxed">
                I agree to the Terms of Service, Privacy Policy, and user-scoped data protection.
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-[#8B45F5] hover:bg-[#7C3AED] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#8B45F5]/25 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Personal Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-7 pt-6 border-t border-[#F0F2FA] text-center">
          <p className="text-xs text-[#717182] font-medium">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-[#8B45F5] hover:text-[#7C3AED] transition-colors ml-1"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
