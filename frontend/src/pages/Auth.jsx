import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';
import api from '../utils/api';

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="font-bold text-slate-900 text-lg mb-2">Check Your Email</h3>
        <p className="text-sm text-slate-600 mb-6">
          If an account exists for <strong>{email}</strong>, we've sent a password reset link. Please check your inbox.
        </p>
        <button
          onClick={onBack}
          data-testid="back-to-login-btn"
          className="text-indigo-600 text-sm font-semibold hover:text-indigo-700 transition-colors"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Sign In
      </button>
      <h3 className="font-bold text-slate-900 text-lg mb-1">Forgot your password?</h3>
      <p className="text-sm text-slate-500 mb-5">Enter your email and we'll send you a link to reset it.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email Address</label>
          <input
            data-testid="forgot-email-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
        <button
          data-testid="send-reset-link-btn"
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}

export default function Auth({ defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab);
  const [showForgot, setShowForgot] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (tab === 'register' && !form.name.trim()) {
      setError('Full name is required');
      return;
    }
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.name);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-indigo-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full border border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-white" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white rounded-2xl p-1.5 shadow-lg flex-shrink-0">
            <img
              src="/snapvault-logo.png"
              alt="SnapVault Events"
              className="w-14 h-14 object-contain"
            />
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-tight">SnapVault Events</p>
            <p className="text-indigo-200 text-xs mt-0.5">Private media collection platform</p>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-white/90 text-3xl font-light leading-relaxed mb-8">
            "Every great event deserves to be remembered perfectly."
          </p>
          <div className="flex gap-3">
            {[
              { label: 'Weddings', color: 'bg-rose-400/30' },
              { label: 'Birthdays', color: 'bg-yellow-400/30' },
              { label: 'Corporate', color: 'bg-cyan-400/30' }
            ].map(item => (
              <div key={item.label} className={`${item.color} rounded-xl px-4 py-2`}>
                <p className="text-white text-sm font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-indigo-300 text-sm">Self-hosted · Private · Yours forever</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3 lg:hidden">
              <img
                src="/snapvault-logo.png"
                alt="SnapVault Events"
                className="w-10 h-10 object-contain rounded-xl"
              />
              <span className="font-bold text-slate-900 text-lg">SnapVault Events</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {tab === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {tab === 'login' ? 'Sign in to manage your events' : 'Start collecting event memories'}
            </p>
          </div>

          {/* Tab Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              data-testid="login-tab"
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === 'login' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              data-testid="register-tab"
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === 'register' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div
              data-testid="auth-error"
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  data-testid="name-input"
                  type="text"
                  value={form.name}
                  onChange={update('name')}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <input
                data-testid="email-input"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  data-testid="password-input"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-11 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              data-testid="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 transition-all mt-2"
            >
              {loading
                ? 'Please wait...'
                : tab === 'login' ? 'Sign In' : 'Create Account'
              }
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Your data stays on your server. Always.
          </p>
          <p className="text-center text-xs text-slate-400 mt-3" data-testid="footer-credit">
            SnapVault designed and hosted by Weddings By Mark
          </p>
        </div>
      </div>
    </div>
  );
}
