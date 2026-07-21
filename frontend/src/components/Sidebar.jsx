import React, { useContext, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  UserCheck, 
  BarChart3, 
  GraduationCap,
  Users,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  if (!user) return null;

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/employees', label: 'Employees', icon: Users },
    { to: '/admin/courses', label: 'Course Builder', icon: BookOpen },
    { to: '/admin/assignments', label: 'Assign Courses', icon: UserCheck },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/messages', label: 'Messages', icon: MessageSquare }
  ];

  const employeeLinks = [
    { to: '/employee', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employee/my-courses', label: 'My Learning', icon: GraduationCap },
    { to: '/messages', label: 'Messages', icon: MessageSquare }
  ];

  const links = user.role === 'admin' ? adminLinks : employeeLinks;

  // Find active label for mobile header
  const currentLink = [...adminLinks, ...employeeLinks, { to: '/profile', label: 'Profile Settings' }]
    .find(l => l.to === location.pathname);

  return (
    <>
      {/* Mobile Bar for small screens */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between z-20 shrink-0 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
          <span className="bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded-md uppercase text-[10px] tracking-wider border border-indigo-100/60">
            {user.role}
          </span>
          <span className="truncate max-w-[180px]">{currentLink?.label || 'Menu'}</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5 text-rose-500" /> : <Menu className="h-5 w-5 text-slate-600" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-100 p-4 flex-col justify-between shadow-sm md:h-full overflow-y-auto shrink-0 z-10 transition-all duration-200 ${mobileOpen ? 'flex' : 'hidden md:flex'}`}>
        <div className="space-y-6">
          <div className="hidden md:block px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Navigation
          </div>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-650 border border-indigo-100/50'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
          <NavLink
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-slate-100 text-slate-800 border border-slate-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            <UserCheck className="h-4.5 w-4.5 shrink-0" />
            <span>Profile Settings</span>
          </NavLink>

          <div className="bg-slate-50 border border-slate-100/80 p-4 rounded-xl">
            <div className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Signed in as:</div>
            <div className="text-xs font-bold text-slate-700 truncate">{user.email}</div>
            <div className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-widest mt-1.5">{user.role} Portal</div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
