import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Lightbulb, User, Mail, Lock, Briefcase, Award, ArrowLeft, Key } from 'lucide-react';
import api from '../services/api';

const Login = () => {
  const { login, registerUser } = useContext(AuthContext);
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot-email', 'forgot-otp', 'forgot-reset'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Login / Register form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('Engineering');
  const [designation, setDesignation] = useState('Developer');

  // Forgot password state
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (authMode === 'login') {
      const res = await login(email, password);
      if (!res.success) setError(res.message);
    } else if (authMode === 'register') {
      if (!name || !email || !password) {
        setError('Please fill in all required fields.');
        return;
      }
      const res = await registerUser(name, email, password, role, department, designation);
      if (!res.success) setError(res.message);
    }
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email });
      setSuccess(res.data.message);
      setAuthMode('forgot-otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', { email, otp });
      setSuccess(res.data.message);
      setAuthMode('forgot-reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password', { email, otp, password: newPassword });
      setSuccess(res.data.message);
      setTimeout(() => {
        setAuthMode('login');
        setPassword('');
        setOtp('');
        setNewPassword('');
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    let title = 'ThinkDifferent LP';
    let subtitle = 'Sign in to access your dashboard';
    
    if (authMode === 'register') subtitle = 'Create an account to start training';
    if (authMode === 'forgot-email') { title = 'Reset Password'; subtitle = 'Enter your email to receive an OTP'; }
    if (authMode === 'forgot-otp') { title = 'Enter OTP'; subtitle = 'Check your email for the 6-digit code'; }
    if (authMode === 'forgot-reset') { title = 'New Password'; subtitle = 'Create a new secure password'; }

    return (
      <div className="flex flex-col items-center mb-6">
        <div className="bg-indigo-50 border border-indigo-100/60 p-3 rounded-2xl text-indigo-600 mb-3 shadow-sm">
          <Lightbulb className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
        <p className="text-slate-400 text-xs mt-1 text-center">{subtitle}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafc] flex flex-col items-center justify-center p-4">
      {/* Background blobs for premium glassmorphism aesthetic */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/20 rounded-full filter blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full filter blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md bg-white border border-slate-100/80 p-8 rounded-2xl shadow-xl shadow-slate-100/50 flex flex-col">
        {renderHeader()}

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-2.5 rounded-xl flex items-center">
            <span className="font-medium">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs px-4 py-2.5 rounded-xl flex items-center">
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* FORGOT PASSWORD - EMAIL STEP */}
        {authMode === 'forgot-email' && (
          <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-455 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl shadow-md shadow-indigo-500/10 focus:outline-none transform hover:-translate-y-0.5 transition-all duration-150 mt-6 text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => { setAuthMode('login'); clearMessages(); }} className="text-xs text-slate-500 hover:text-indigo-600 flex items-center justify-center mx-auto">
                <ArrowLeft className="w-3 h-3 mr-1" /> Back to Login
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD - OTP STEP */}
        {authMode === 'forgot-otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">6-Digit Code</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-455 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150 tracking-widest font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl shadow-md shadow-indigo-500/10 focus:outline-none transform hover:-translate-y-0.5 transition-all duration-150 mt-6 text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => { setAuthMode('forgot-email'); clearMessages(); }} className="text-xs text-slate-500 hover:text-indigo-600 flex items-center justify-center mx-auto">
                <ArrowLeft className="w-3 h-3 mr-1" /> Use a different email
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD - RESET STEP */}
        {authMode === 'forgot-reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-455 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl shadow-md shadow-emerald-500/10 focus:outline-none transform hover:-translate-y-0.5 transition-all duration-150 mt-6 text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* STANDARD LOGIN & REGISTER */}
        {(authMode === 'login' || authMode === 'register') && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-455 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                {authMode === 'login' && (
                  <button type="button" onClick={() => { setAuthMode('forgot-email'); clearMessages(); }} className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700">
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150 appearance-none"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</label>
                  <div className="relative">
                    <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150 appearance-none"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="HR">HR</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {authMode === 'register' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Architect"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 px-4 text-xs text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl shadow-md shadow-indigo-500/10 focus:outline-none transform hover:-translate-y-0.5 transition-all duration-150 mt-6 text-xs uppercase tracking-wider"
            >
              {authMode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        )}

        {(authMode === 'login' || authMode === 'register') && (
          <>
            <div className="border-t border-slate-100 my-5"></div>
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                clearMessages();
              }}
              className="text-xs text-indigo-600 hover:text-indigo-500 font-semibold self-center transition-colors duration-150"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </>
        )}

      </div>
    </div>
  );
};

export default Login;
