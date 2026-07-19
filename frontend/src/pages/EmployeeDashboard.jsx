import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  GraduationCap, 
  CheckCircle2, 
  Hourglass, 
  Award, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EmployeeDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        const res = await api.get('/api/employee/courses');
        setCourses(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch assigned courses.');
      } finally {
        setLoading(false);
      }
    };
    fetchAssigned();
  }, []);

  if (loading) {
    return (
      <div class="p-8 flex justify-center items-center h-full">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Stats computation
  const totalAssigned = courses.length;
  const completedCourses = courses.filter(c => c.progressStatus === 'completed');
  const inProgressCourses = courses.filter(c => c.progressStatus === 'in-progress' || c.progressStatus === 'not-started');

  return (
    <div class="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-800">Employee Dashboard</h1>
        <p class="text-slate-500 text-xs mt-0.5 font-medium">Track your active training curriculum and check achievements.</p>
      </div>

      {error && (
        <div class="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-4 rounded-xl">
          Error: {error}
        </div>
      )}

      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div class="bg-white border border-slate-100 p-5 rounded-2xl flex items-center justify-between shadow-sm shadow-slate-100/50">
          <div class="space-y-1">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Courses</div>
            <div class="text-xl font-extrabold text-slate-800">{totalAssigned}</div>
          </div>
          <div class="bg-indigo-50 text-indigo-500 p-3 rounded-xl border border-indigo-100/50">
            <GraduationCap class="h-5 w-5" />
          </div>
        </div>

        <div class="bg-white border border-slate-100 p-5 rounded-2xl flex items-center justify-between shadow-sm shadow-slate-100/50">
          <div class="space-y-1">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In Progress</div>
            <div class="text-xl font-extrabold text-slate-800">{inProgressCourses.length}</div>
          </div>
          <div class="bg-amber-50 text-amber-600 p-3 rounded-xl border border-amber-100/50">
            <Hourglass class="h-5 w-5" />
          </div>
        </div>

        <div class="bg-white border border-slate-100 p-5 rounded-2xl flex items-center justify-between shadow-sm shadow-slate-100/50">
          <div class="space-y-1">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Certifications Earned</div>
            <div class="text-xl font-extrabold text-slate-800">{completedCourses.length}</div>
          </div>
          <div class="bg-emerald-50 text-emerald-650 p-3 rounded-xl border border-emerald-100/50">
            <CheckCircle2 class="h-5 w-5" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active courses panel list */}
        <div class="bg-white border border-slate-100 p-5 rounded-2xl lg:col-span-2 space-y-4 shadow-sm shadow-slate-100/40">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-extrabold text-slate-850">Current Studies</h2>
            <Link to="/employee/my-courses" class="text-xs font-bold text-indigo-500 hover:text-indigo-650 flex items-center space-x-1">
              <span>View all courses</span>
              <ArrowRight class="h-3.5 w-3.5" />
            </Link>
          </div>

          {inProgressCourses.length === 0 ? (
            <p class="text-xs text-slate-450 text-center py-10 font-medium">You have no active courses to complete! Well done.</p>
          ) : (
            <div class="space-y-3">
              {inProgressCourses.map((c) => (
                <div key={c.courseId} class="bg-slate-50 border border-slate-100/80 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-100/50 transition">
                  <div class="space-y-1.5 flex-1 w-full">
                    <h3 class="text-sm font-bold text-slate-700 leading-tight">{c.title}</h3>
                    <p class="text-xs text-slate-450 line-clamp-1 font-medium">{c.description}</p>
                    
                    <div class="flex items-center space-x-3 w-full max-w-md pt-1">
                      <span class="text-[9px] font-bold text-slate-450 shrink-0">{c.percentage}% Complete</span>
                      <div class="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden shrink">
                        <div 
                          class="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${c.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    to={`/employee/courses/${c.courseId}`}
                    class="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl shrink-0 transition"
                  >
                    Resume Study &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Certifications sidebar list */}
        <div class="bg-white border border-slate-100 p-5 rounded-2xl space-y-4 shadow-sm shadow-slate-100/40">
          <div class="flex items-center space-x-2">
            <Award class="h-4.5 w-4.5 text-indigo-500" />
            <h2 class="text-sm font-extrabold text-slate-850">Certificates</h2>
          </div>
          
          {completedCourses.length === 0 ? (
            <p class="text-xs text-slate-450 text-center py-8 font-medium">Complete all modules and pass course quizzes to unlock certificates.</p>
          ) : (
            <div class="space-y-2">
              {completedCourses.map((c) => (
                <div key={c.courseId} class="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center space-x-3">
                  <div class="bg-emerald-50 text-emerald-600 p-2 rounded-lg border border-emerald-100/60">
                    <Award class="h-4.5 w-4.5" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-slate-700 truncate">{c.title}</div>
                    <div class="text-[9px] text-emerald-600 font-extrabold uppercase tracking-widest mt-0.5">Verified Completion</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
