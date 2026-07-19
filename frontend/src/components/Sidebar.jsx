import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  UserCheck, 
  BarChart3, 
  GraduationCap,
  Users
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/employees', label: 'Employees', icon: Users },
    { to: '/admin/courses', label: 'Course Builder', icon: BookOpen },
    { to: '/admin/assignments', label: 'Assign Courses', icon: UserCheck },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 }
  ];

  const employeeLinks = [
    { to: '/employee', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employee/my-courses', label: 'My Learning', icon: GraduationCap }
  ];

  const links = user.role === 'admin' ? adminLinks : employeeLinks;

  return (
    <aside class="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-100 p-4 flex flex-col justify-between shadow-sm md:h-full overflow-y-auto shrink-0 z-10">
      <div class="space-y-6">
        <div class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Navigation
        </div>
        <nav class="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-650 border border-indigo-100/50'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                <Icon class="h-4.5 w-4.5 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div class="bg-slate-50 border border-slate-100/80 p-4 rounded-xl">
        <div class="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">Signed in as:</div>
        <div class="text-xs font-bold text-slate-700 truncate">{user.email}</div>
        <div class="text-[9px] text-indigo-600 font-extrabold uppercase tracking-widest mt-1.5">{user.role} Portal</div>
      </div>
    </aside>
  );
};

export default Sidebar;
