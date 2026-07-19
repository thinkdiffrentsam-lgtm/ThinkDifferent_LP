import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Lightbulb, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null;

  return (
    <nav class="shrink-0 z-50 bg-white border-b border-slate-100 px-6 py-3.5 flex items-center justify-between shadow-sm shadow-slate-100/40">
      <div class="flex items-center space-x-3">
        <div class="bg-indigo-50 p-2 rounded-xl text-indigo-600 border border-indigo-100/50">
          <Lightbulb class="h-5 w-5" />
        </div>
        <span class="text-lg font-bold tracking-tight text-slate-800">
          ThinkDifferent <span class="text-indigo-600">LP</span>
        </span>
      </div>

      <div class="flex items-center space-x-6">
        <div class="flex items-center space-x-3">
          <div class="bg-indigo-50/60 h-9 w-9 rounded-full flex items-center justify-center text-indigo-600 font-bold border border-indigo-100/40 text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div class="hidden md:block text-left">
            <div class="text-xs font-bold text-slate-800 leading-tight">{user.name}</div>
            <div class="flex items-center space-x-1.5 mt-0.5">
              <span class={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md ${
                user.role === 'admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                {user.role}
              </span>
              <span class="text-slate-400 text-[10px] font-semibold">&bull; {user.department}</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          class="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-rose-600 font-semibold transition-colors duration-150 bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-slate-100"
        >
          <LogOut class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
