'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsDemo, isAuthenticated, isLoading } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);

    if (result.error) {
      setIsSubmitting(false);
      setErrorMessage(result.error);
      toast.error('Authentication Failed', result.error);
    } else {
      setIsSubmitting(false);
      toast.success('Signed In', 'Welcome back to Personal Assistant');
      router.replace('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#EAE9FF] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#8B45F5] text-white shadow-lg shadow-[#8B45F5]/30 mb-3">
          <span className="font-extrabold text-2xl tracking-wider">M</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
          Personal Assistant
        </h1>
        <p className="text-xs sm:text-sm text-[#717182] font-medium mt-1">
          Lavender Enterprise &bull; Routine, Focus &amp; Wellness
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-[440px] bg-white rounded-[26px] p-7 sm:p-9 border border-[#E8EAF5] shadow-[0_12px_40px_rgb(24,27,46,0.04)]">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#18181B] tracking-tight">Sign In</h2>
          <p className="text-xs text-[#717182] font-medium mt-1">
            Access your secure personal workspace and daily schedule
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-fade-in flex items-start gap-2">
            <span>&bull;</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
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

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#18181B] uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#8B45F5] hover:text-[#7C3AED] transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717182]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
          </div>

          {/* Remember Me Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#8B45F5] focus:ring-[#8B45F5] border-gray-300"
              />
              <span className="text-xs text-[#717182] font-medium">Keep me signed in</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-[#8B45F5] hover:bg-[#7C3AED] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#8B45F5]/25 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Assistant</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Access Button */}
          <button
            type="button"
            onClick={() => {
              loginAsDemo();
              toast.success('Demo Mode Active', 'Signed in as Demo User (Selma Knight)');
              router.replace('/');
            }}
            className="w-full py-2.5 px-4 bg-[#F4F4FD] hover:bg-[#ECEBFA] text-[#6935C8] border border-[#DDD8F8] font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#8B45F5]" />
            <span>1-Click Demo Sign-In (Instant Access)</span>
          </button>
        </form>

        {/* Divider */}
        <div className="mt-7 pt-6 border-t border-[#F0F2FA] text-center">
          <p className="text-xs text-[#717182] font-medium">
            Don&apos;t have an account yet?{' '}
            <Link
              href="/register"
              className="font-bold text-[#8B45F5] hover:text-[#7C3AED] transition-colors ml-1"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-8 text-center text-xs text-[#717182]">
        <span>Encrypted with AES-256 &bull; Multi-Tenant Isolated &bull; Supabase Auth</span>
      </div>
    </div>
  );
}
