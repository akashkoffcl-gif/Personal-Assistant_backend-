'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#EAE9FF] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] text-white shadow-lg shadow-[#8B45F5]/30 mb-3">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
          Verify Your Email
        </h1>
        <p className="text-xs sm:text-sm text-[#717182] font-medium mt-1">
          Complete account verification to activate your workspace
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-[440px] bg-white rounded-[26px] p-7 sm:p-9 border border-[#E8EAF5] shadow-[0_12px_40px_rgb(24,27,46,0.04)] text-center">
        <div className="w-14 h-14 rounded-full bg-[#F4F4FD] text-[#8B45F5] flex items-center justify-center mx-auto mb-4 border border-[#E5E2F5]">
          <Mail className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-[#18181B] tracking-tight mb-2">Check Your Inbox</h2>
        <p className="text-xs sm:text-sm text-[#717182] leading-relaxed mb-6">
          A verification link has been sent to your email address. Please click the link to confirm your
          account and initialize your isolated productivity workspace.
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="w-full py-3 px-4 bg-[#8B45F5] hover:bg-[#7C3AED] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#8B45F5]/25 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Proceed to Sign In</span>
          </Link>
        </div>

        <div className="mt-7 pt-6 border-t border-[#F0F2FA] text-center">
          <p className="text-[11px] text-[#717182]">
            Didn&apos;t receive the email? Check your spam folder or return to sign in to request another link.
          </p>
        </div>
      </div>
    </div>
  );
}

