'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Train, Phone, KeyRound, ArrowRight, RefreshCw } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (user) {
    router.replace('/');
    return null;
  }

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/send-otp', { mobile });
      toast.success('OTP sent!');
      setStep('otp');
      startCountdown();
      if (data.otp) {
        setDevOtp(data.otp);
        toast('Dev mode OTP: ' + data.otp, { icon: '🔑', duration: 10000 });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (!value && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpStr = otp.join('');
    if (otpStr.length !== 6) { toast.error('Enter complete 6-digit OTP'); return; }
    setLoading(true);
    try {
      await login(mobile, otpStr);
      toast.success('Login successful! 🎉');
      router.push('/search');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setOtp(['', '', '', '', '', '']);
    setDevOtp(null);
    await handleSendOTP();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl mb-4">
              <Train className="w-8 h-8 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Login to Express Tadka</h1>
            <p className="text-gray-500 text-sm mt-1">Enter your mobile number to continue</p>
          </div>

          {step === 'mobile' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="inline w-4 h-4 mr-1" /> Mobile Number
                </label>
                <div className="flex gap-2">
                  <span className="input-field w-auto px-3 bg-gray-50 dark:bg-gray-700 text-gray-500 font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    className="input-field flex-1"
                    placeholder="Enter 10-digit number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                    maxLength={10}
                  />
                </div>
              </div>
              <button
                onClick={handleSendOTP}
                disabled={loading || mobile.length !== 10}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? 'Sending...' : (<>Send OTP <ArrowRight className="w-4 h-4" /></>)}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <KeyRound className="inline w-4 h-4 mr-1" /> Enter OTP
                </label>
                <p className="text-sm text-gray-500 mb-4">Sent to +91 {mobile}</p>
                <div className="flex gap-3 justify-center">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(i, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(i, e)}
                      className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                    />
                  ))}
                </div>
                {devOtp && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      🔑 Dev Mode OTP: <span className="font-bold text-lg">{devOtp}</span>
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || otp.join('').length !== 6}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying...' : (<>Verify & Login <ArrowRight className="w-4 h-4" /></>)}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => { setStep('mobile'); setOtp(['', '', '', '', '', '']); setDevOtp(null); }}
                  className="text-gray-500 hover:text-primary-500"
                >
                  ← Change number
                </button>
                <button
                  onClick={handleResend}
                  disabled={countdown > 0}
                  className="flex items-center gap-1 text-primary-500 hover:text-primary-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-3 h-3" />
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
