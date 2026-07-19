import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BookOpen, 
  Hourglass, 
  CheckCircle2, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MyCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab controller: 'active' or 'completed'
  const [filterTab, setFilterTab] = useState('active');

  useEffect(() => {
    fetchAssignedCourses();
  }, []);

  const fetchAssignedCourses = async () => {
    try {
      const res = await api.get('/api/employee/courses');
      setCourses(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch assigned courses list.');
    } finally {
      setLoading(false);
    }
  };

  const activeCourses = courses.filter(c => c.progressStatus !== 'completed');
  const completedCourses = courses.filter(c => c.progressStatus === 'completed');

  const visibleCourses = filterTab === 'active' ? activeCourses : completedCourses;

  if (loading) {
    return (
      <div class="p-8 flex justify-center items-center h-full">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div class="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-800">My Learning Curriculum</h1>
        <p class="text-slate-500 text-xs mt-0.5 font-medium">Access lessons, complete learning files, and attempt final tests.</p>
      </div>

      {error && (
        <div class="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <AlertCircle class="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div class="border-b border-slate-205 flex space-x-6">
        <button
          onClick={() => setFilterTab('active')}
          class={`pb-2.5 text-xs font-bold tracking-wide transition border-b-2 ${
            filterTab === 'active' ? 'border-indigo-500 text-indigo-655' : 'border-transparent text-slate-450 hover:text-slate-700'
          }`}
        >
          In Progress ({activeCourses.length})
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          class={`pb-2.5 text-xs font-bold tracking-wide transition border-b-2 ${
            filterTab === 'completed' ? 'border-indigo-500 text-indigo-655' : 'border-transparent text-slate-455 hover:text-slate-700'
          }`}
        >
          Completed ({completedCourses.length})
        </button>
      </div>

      {/* Courses Cards Grid */}
      {visibleCourses.length === 0 ? (
        <div class="bg-white border border-slate-100 p-16 rounded-2xl text-center flex flex-col items-center justify-center shadow-sm">
          <BookOpen class="h-10 w-10 text-slate-400 mb-3" />
          <h3 class="text-sm font-extrabold text-slate-800">No courses in this category</h3>
          <p class="text-slate-500 text-xs mt-1 font-medium">
            {filterTab === 'active' 
              ? 'You have completed all courses assigned to you!' 
              : 'You have not completed any courses yet.'
            }
          </p>
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleCourses.map((c) => (
            <div key={c.courseId} class="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md hover:border-indigo-100/50 transition duration-150">
              <div class="p-5 space-y-4">
                <div class="flex items-center justify-between">
                  <span class={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md flex items-center ${
                    c.progressStatus === 'completed' 
                      ? 'bg-emerald-55 text-emerald-600 border border-emerald-100/60'
                      : 'bg-indigo-50 text-indigo-650 border border-indigo-100/60'
                  }`}>
                    {c.progressStatus === 'completed' ? (
                      <>
                        <CheckCircle2 class="h-3 w-3 mr-1 shrink-0" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Hourglass class="h-3 w-3 mr-1 shrink-0" />
                        <span>{c.progressStatus === 'not-started' ? 'Not Started' : 'In Progress'}</span>
                      </>
                    )}
                  </span>

                  {c.dueDate && (
                    <span class="text-[9px] text-slate-450 font-bold flex items-center">
                      <Calendar class="h-3.5 w-3.5 mr-1 text-slate-400" />
                      Due: {new Date(c.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div>
                  <h3 class="text-base font-bold text-slate-800 leading-tight tracking-tight line-clamp-1">{c.title}</h3>
                  <p class="text-slate-550 text-xs mt-2 line-clamp-3 leading-relaxed font-medium">{c.description}</p>
                </div>

                {/* Progress bar info */}
                <div class="space-y-1.5 pt-2">
                  <div class="flex items-center justify-between text-[10px] font-bold text-slate-450">
                    <span>Course Progress</span>
                    <span class="text-slate-700">{c.percentage}%</span>
                  </div>
                  <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      class="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${c.percentage}%` }}
                    ></div>
                  </div>
                  <div class="text-[9px] text-slate-450 font-bold">
                    {c.completedModulesCount} of {c.totalModulesCount} modules marked complete
                  </div>
                </div>
              </div>

              <div class="bg-slate-50/50 px-5 py-4 border-t border-slate-100">
                {c.progressStatus === 'completed' ? (
                  <div class="flex items-center space-x-2">
                    <Link
                      to={`/employee/courses/${c.courseId}`}
                      class="flex-1 block text-center bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-600 text-[11px] font-bold py-2.5 rounded-xl transition shadow-sm"
                    >
                      Review
                    </Link>
                    <Link
                      to={`/employee/courses/${c.courseId}/certificate`}
                      class="flex-1 block text-center bg-indigo-500 hover:bg-indigo-650 text-white text-[11px] font-bold py-2.5 rounded-xl transition shadow-sm"
                    >
                      Certificate
                    </Link>
                  </div>
                ) : (
                  <Link
                    to={`/employee/courses/${c.courseId}`}
                    class="w-full block text-center bg-indigo-500 hover:bg-indigo-650 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm"
                  >
                    {c.progressStatus === 'not-started' ? 'Start Course' : 'Resume Course'}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
