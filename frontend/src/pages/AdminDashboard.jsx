import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BookOpen, 
  Users, 
  UserCheck, 
  TrendingUp, 
  Plus, 
  FileSpreadsheet, 
  PieChart,
  UserPlus
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/reports/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div class="p-8 flex justify-center items-center h-full">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="p-8 text-rose-500 font-semibold text-sm">
        Error: {error}
      </div>
    );
  }

  const { summary, coursesStats, departmentStats } = stats || {};

  return (
    <div class="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-slate-800">Admin Dashboard</h1>
          <p class="text-slate-500 text-xs mt-0.5">Overview of your enterprise learning management metrics.</p>
        </div>
        <div class="flex items-center space-x-3 shrink-0">
          <Link
            to="/admin/employees"
            class="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <UserPlus class="h-4 w-4" />
            <span>Manage Employees</span>
          </Link>
          <Link
            to="/admin/courses"
            class="flex items-center space-x-1.5 bg-indigo-500 hover:bg-indigo-650 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus class="h-4 w-4" />
            <span>Create Course</span>
          </Link>
          <Link
            to="/admin/assignments"
            class="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-650 border border-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <UserCheck class="h-4 w-4" />
            <span>Assign Course</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div class="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm shadow-slate-100/40">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Courses</p>
              <h3 class="text-xl font-extrabold text-slate-800 mt-1">{summary.totalCourses}</h3>
            </div>
            <div class="bg-indigo-50 text-indigo-500 p-2.5 rounded-xl border border-indigo-100/50">
              <BookOpen class="h-5 w-5" />
            </div>
          </div>
        </div>

        <div class="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm shadow-slate-100/40">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employees Registered</p>
              <h3 class="text-xl font-extrabold text-slate-800 mt-1">{summary.totalEmployees}</h3>
            </div>
            <div class="bg-cyan-50 text-cyan-600 p-2.5 rounded-xl border border-cyan-100/50">
              <Users class="h-5 w-5" />
            </div>
          </div>
        </div>

        <div class="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm shadow-slate-100/40">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Enrollments</p>
              <h3 class="text-xl font-extrabold text-slate-800 mt-1">{summary.totalAssignments}</h3>
            </div>
            <div class="bg-purple-50 text-purple-600 p-2.5 rounded-xl border border-purple-100/50">
              <UserCheck class="h-5 w-5" />
            </div>
          </div>
        </div>

        <div class="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm shadow-slate-100/40">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completion Rate</p>
              <h3 class="text-xl font-extrabold text-slate-800 mt-1">{summary.completionRate}%</h3>
            </div>
            <div class="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100/50">
              <TrendingUp class="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Course Stats & Department Breakdown */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Statistics Panel */}
        <div class="bg-white border border-slate-100 rounded-2xl p-5 lg:col-span-2 space-y-4 shadow-sm shadow-slate-100/30">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-extrabold text-slate-800">Course Participation Summary</h2>
            <Link to="/admin/reports" class="text-xs font-bold text-indigo-500 hover:text-indigo-650 flex items-center space-x-1">
              <FileSpreadsheet class="h-4 w-4" />
              <span>Full Report</span>
            </Link>
          </div>
          
          {coursesStats.length === 0 ? (
            <p class="text-xs text-slate-450 text-center py-8">No course data available yet. Please create and assign a course.</p>
          ) : (
            <div class="space-y-3">
              {coursesStats.map((c) => {
                const completionPercentage = c.totalAssigned > 0 
                  ? Math.round((c.completions / c.totalAssigned) * 100) 
                  : 0;

                return (
                  <div key={c._id} class="bg-slate-50 p-4 rounded-xl border border-slate-100/80">
                    <div class="flex items-center justify-between text-xs mb-1.5">
                      <span class="font-bold text-slate-700">{c.title}</span>
                      <span class="text-[10px] text-slate-400 font-semibold">
                        {c.completions} of {c.totalAssigned} completed
                      </span>
                    </div>
                    {/* Progress slider bar */}
                    <div class="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                      <div 
                        class="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                    <div class="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-semibold">
                      <span>Completion Rate: {completionPercentage}%</span>
                      <span>Enrolled: {c.totalAssigned} Employees</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Department Breakdown */}
        <div class="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm shadow-slate-100/30">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-extrabold text-slate-800">Department Metrics</h2>
            <PieChart class="h-4.5 w-4.5 text-indigo-500" />
          </div>

          {departmentStats.length === 0 ? (
            <p class="text-xs text-slate-450 text-center py-8">No employees registered yet.</p>
          ) : (
            <div class="space-y-2">
              {departmentStats.map((dept) => (
                <div key={dept._id} class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="flex items-center space-x-2.5">
                    <div class="h-2 w-2 rounded-full bg-indigo-500"></div>
                    <span class="text-xs font-bold text-slate-700">{dept._id || 'Unassigned'}</span>
                  </div>
                  <span class="text-[10px] font-extrabold text-indigo-650 bg-indigo-50 border border-indigo-100/40 px-2.5 py-1 rounded-lg">
                    {dept.count} {dept.count === 1 ? 'member' : 'members'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
