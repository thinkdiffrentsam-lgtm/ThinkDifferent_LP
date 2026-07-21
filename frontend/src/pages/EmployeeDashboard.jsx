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
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Stats computation
  const totalAssigned = courses.length;
  const completedCourses = courses.filter(c => c.progressStatus === 'completed');
  const inProgressCourses = courses.filter(c => c.progressStatus === 'in-progress' || c.progressStatus === 'not-started');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto transition-colors duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 ">Employee Dashboard</h1>
        <p className="text-slate-500  text-xs mt-0.5 font-medium">Track your active training curriculum and check achievements.</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-4 rounded-xl">
          Error: {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white  border border-slate-100  p-5 rounded-2xl flex items-center justify-between shadow-sm shadow-slate-100/50 ">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400  uppercase tracking-widest">Assigned Courses</div>
            <div className="text-xl font-extrabold text-slate-800 ">{totalAssigned}</div>
          </div>
          <div className="bg-indigo-50 text-indigo-500 p-3 rounded-xl border border-indigo-100/50">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white  border border-slate-100  p-5 rounded-2xl flex items-center justify-between shadow-sm shadow-slate-100/50 ">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400  uppercase tracking-widest">In Progress</div>
            <div className="text-xl font-extrabold text-slate-800 ">{inProgressCourses.length}</div>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl border border-amber-100/50">
            <Hourglass className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white  border border-slate-100  p-5 rounded-2xl flex items-center justify-between shadow-sm shadow-slate-100/50 ">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400  uppercase tracking-widest">Certifications Earned</div>
            <div className="text-xl font-extrabold text-slate-800 ">{completedCourses.length}</div>
          </div>
          <div className="bg-emerald-50 text-emerald-650 p-3 rounded-xl border border-emerald-100/50">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active courses panel list */}
        <div className="bg-white  border border-slate-100  p-5 rounded-2xl lg:col-span-2 space-y-4 shadow-sm shadow-slate-100/40 ">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-800 ">Current Studies</h2>
            <Link to="/employee/my-courses" className="text-xs font-bold text-indigo-500 hover:text-indigo-600  flex items-center space-x-1">
              <span>View all courses</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {inProgressCourses.length === 0 ? (
            <p className="text-xs text-slate-500  text-center py-10 font-medium">You have no active courses to complete! Well done.</p>
          ) : (
            <div className="space-y-3">
              {inProgressCourses.map((c) => (
                <div key={c.courseId} className="bg-slate-50  border border-slate-100/80  p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-100/50 transition">
                  <div className="space-y-1.5 flex-1 w-full">
                    <h3 className="text-sm font-bold text-slate-700  leading-tight">{c.title}</h3>
                    <p className="text-xs text-slate-500  line-clamp-1 font-medium">{c.description}</p>
                    
                    <div className="flex items-center space-x-3 w-full max-w-md pt-1">
                      <span className="text-[9px] font-bold text-slate-500  shrink-0">{c.percentage}% Complete</span>
                      <div className="w-full bg-slate-200/60  h-1.5 rounded-full overflow-hidden shrink">
                        <div 
                          className="bg-indigo-500  h-full rounded-full transition-all duration-300"
                          style={{ width: `${c.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    to={`/employee/courses/${c.courseId}`}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl shrink-0 transition"
                  >
                    Resume Study &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Certifications sidebar list */}
        <div className="bg-white  border border-slate-100  p-5 rounded-2xl space-y-4 shadow-sm shadow-slate-100/40 ">
          <div className="flex items-center space-x-2">
            <Award className="h-4.5 w-4.5 text-indigo-500" />
            <h2 className="text-sm font-extrabold text-slate-800 ">Certificates</h2>
          </div>
          
          {completedCourses.length === 0 ? (
            <p className="text-xs text-slate-500  text-center py-8 font-medium">Complete all modules and pass course quizzes to unlock certificates.</p>
          ) : (
            <div className="space-y-2">
              {completedCourses.map((c) => (
                <div key={c.courseId} className="p-3.5 bg-slate-50  border border-slate-100  rounded-xl flex items-center space-x-3">
                  <div className="bg-emerald-50  text-emerald-600  p-2 rounded-lg border border-emerald-100/60 ">
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-700  truncate">{c.title}</div>
                    <div className="text-[9px] text-emerald-600  font-extrabold uppercase tracking-widest mt-0.5">Verified Completion</div>
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
