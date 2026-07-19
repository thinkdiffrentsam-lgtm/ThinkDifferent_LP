import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Lightbulb, User, Mail, Lock, Briefcase, Award } from 'lucide-react';

const Login = () => {
  const { login, registerUser } = useContext(AuthContext);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState('');
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('Engineering');
  const [designation, setDesignation] = useState('Developer');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLoginMode) {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message);
      }
    } else {
      if (!name || !email || !password) {
        setError('Please fill in all required fields.');
        return;
      }
      const res = await registerUser(name, email, password, role, department, designation);
      if (!res.success) {
        setError(res.message);
      }
    }
  };

  return (
    <div class="min-h-screen bg-[#fafafc] flex flex-col items-center justify-center p-4">
      {/* Background blobs for premium glassmorphism aesthetic */}
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/20 rounded-full filter blur-3xl -z-10 animate-pulse"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full filter blur-3xl -z-10 animate-pulse"></div>

      <div class="w-full max-w-md bg-white border border-slate-100/80 p-8 rounded-2xl shadow-xl shadow-slate-100/50 flex flex-col">
        {/* Brand Header */}
        <div class="flex flex-col items-center mb-6">
          <div class="bg-indigo-50 border border-indigo-100/60 p-3 rounded-2xl text-indigo-600 mb-3 shadow-sm">
            <Lightbulb class="h-6 w-6" />
          </div>
          <h1 class="text-xl font-bold text-slate-800 tracking-tight">
            ThinkDifferent LP
          </h1>
          <p class="text-slate-400 text-xs mt-1 text-center">
            {isLoginMode ? 'Sign in to access your dashboard' : 'Create an account to start training'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div class="mb-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-2.5 rounded-xl flex items-center">
            <span class="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-4">
          {!isLoginMode && (
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
              <div class="relative">
                <User class="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
                />
              </div>
            </div>
          )}

          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
            <div class="relative">
              <Mail class="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-455 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
              />
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Password</label>
            <div class="relative">
              <Lock class="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
              />
            </div>
          </div>

          {!isLoginMode && (
            <div class="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role</label>
                <div class="relative">
                  <Briefcase class="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150 appearance-none"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</label>
                <div class="relative">
                  <Award class="absolute left-3 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150 appearance-none"
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

          {!isLoginMode && (
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Designation</label>
              <input
                type="text"
                placeholder="e.g. Senior Software Architect"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-3 px-4 text-xs text-slate-700 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-150"
              />
            </div>
          )}

          <button
            type="submit"
            class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl shadow-md shadow-indigo-500/10 focus:outline-none transform hover:-translate-y-0.5 transition-all duration-150 mt-6 text-xs uppercase tracking-wider"
          >
            {isLoginMode ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div class="border-t border-slate-100 my-5"></div>

        <button
          onClick={() => {
            setIsLoginMode(!isLoginMode);
            setError('');
          }}
          class="text-xs text-indigo-600 hover:text-indigo-500 font-semibold self-center transition-colors duration-150"
        >
          {isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>


      </div>
    </div>
  );
};

export default Login;
