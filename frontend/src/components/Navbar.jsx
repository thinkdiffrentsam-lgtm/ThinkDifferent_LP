import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Lightbulb, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null;

  return (
    <nav className="shrink-0 z-50 bg-white  border-b border-slate-100  px-6 py-3.5 flex items-center justify-between shadow-sm shadow-slate-100/40  transition-colors duration-200">
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-50  p-2 rounded-xl text-indigo-600  border border-indigo-100/50 ">
          <Lightbulb className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-800 ">
          ThinkDifferent <span className="text-indigo-600 ">LP</span>
        </span>
      </div>

      <div className="flex items-center space-x-6">
        <Link to="/profile" className="flex items-center space-x-3 group cursor-pointer">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt="Profile" className="h-9 w-9 rounded-full object-cover border border-slate-200 " />
          ) : (
            <div className="bg-indigo-50/60  h-9 w-9 rounded-full flex items-center justify-center text-indigo-600  font-bold border border-indigo-100/40  text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-800  leading-tight group-hover:text-indigo-600  transition-colors">{user.name}</div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md ${
                user.role === 'admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                {user.role}
              </span>
              <span className="text-slate-400  text-[10px] font-semibold">&bull; {user.department}</span>
            </div>
          </div>
        </Link>

        <button
          onClick={logout}
          className="flex items-center space-x-1.5 text-xs text-slate-500  hover:text-rose-600  font-semibold transition-colors duration-150 bg-slate-50  hover:bg-rose-50  px-3 py-1.5 rounded-xl border border-slate-100 "
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
