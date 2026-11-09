'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
      toast.error('Recovery Failed', result.error);
    } else {
      setIsSuccess(true);
      toast.success(
        'Recovery Email Sent',
        'Password recovery email dispatched. Please check your inbox.',
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#EAE9FF] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] text-white shadow-lg shadow-[#8B45F5]/30 mb-3">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
          Recover Password
        </h1>
        <p className="text-xs sm:text-sm text-[#717182] font-medium mt-1">
          Receive a secure password reset link via Supabase Auth
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-[440px] bg-white rounded-[26px] p-7 sm:p-9 border border-[#E8EAF5] shadow-[0_12px_40px_rgb(24,27,46,0.04)]">
        {isSuccess ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#18181B] mb-2">Check Your Inbox</h3>
            <p className="text-xs sm:text-sm text-[#717182] leading-relaxed mb-6">
              We have sent instructions to <strong>{email}</strong>. Follow the link in the email to
              set a new password for your account.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 py-2.5 px-5 bg-[#8B45F5] hover:bg-[#7C3AED] text-white font-bold text-xs rounded-xl transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#18181B] tracking-tight">Forgot Password</h2>
              <p className="text-xs text-[#717182] font-medium mt-1">
                Enter your registered email and we will send a password reset link.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-fade-in flex items-start gap-2">
                <span>&bull;</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-[#8B45F5] hover:bg-[#7C3AED] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#8B45F5]/25 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Recovery Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 pt-6 border-t border-[#F0F2FA] text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#717182] hover:text-[#18181B] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
