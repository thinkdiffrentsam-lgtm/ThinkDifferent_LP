import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BookOpen, 
  Hourglass, 
  CheckCircle2, 
  Calendar,
  AlertCircle,
  CalendarPlus
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

  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const handleAddToCalendar = (course) => {
    if (!course.dueDate) return;
    
    const dueDate = new Date(course.dueDate);
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ThinkDifferent LP//EN',
      'BEGIN:VEVENT',
      `UID:${course.courseId}-${Date.now()}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(dueDate)}`,
      `DTEND:${formatICSDate(new Date(dueDate.getTime() + 60 * 60 * 1000))}`, // 1 hour duration on due date
      `SUMMARY:Course Due: ${course.title}`,
      `DESCRIPTION:Please complete the course: ${course.title}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `course_deadline_${course.courseId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto transition-colors duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 ">My Learning Curriculum</h1>
        <p className="text-slate-500  text-xs mt-0.5 font-medium">Access lessons, complete learning files, and attempt final tests.</p>
      </div>

      {error && (
        <div className="bg-rose-50  border border-rose-100  text-rose-600  p-4 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="border-b border-slate-200  flex space-x-6">
        <button
          onClick={() => setFilterTab('active')}
          class={`pb-2.5 text-xs font-bold tracking-wide transition border-b-2 ${
            filterTab === 'active' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          In Progress ({activeCourses.length})
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          class={`pb-2.5 text-xs font-bold tracking-wide transition border-b-2 ${
            filterTab === 'completed' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Completed ({completedCourses.length})
        </button>
      </div>

      {/* Courses Cards Grid */}
      {visibleCourses.length === 0 ? (
        <div className="bg-white  border border-slate-100  p-16 rounded-2xl text-center flex flex-col items-center justify-center shadow-sm">
          <BookOpen className="h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-sm font-extrabold text-slate-800 ">No courses in this category</h3>
          <p className="text-slate-500  text-xs mt-1 font-medium">
            {filterTab === 'active' 
              ? 'You have completed all courses assigned to you!' 
              : 'You have not completed any courses yet.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleCourses.map((c) => (
            <div key={c.courseId} className="bg-white  border border-slate-100  rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md hover:border-indigo-100/50  transition duration-150">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span class={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md flex items-center ${
                    c.progressStatus === 'completed' 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/60'
                      : 'bg-indigo-50 text-indigo-600 border border-indigo-100/60'
                  }`}>
                    {c.progressStatus === 'completed' ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Hourglass className="h-3 w-3 mr-1 shrink-0" />
                        <span>{c.progressStatus === 'not-started' ? 'Not Started' : 'In Progress'}</span>
                      </>
                    )}
                  </span>

                  {c.dueDate && (
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] text-slate-500  font-bold flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Due: {new Date(c.dueDate).toLocaleDateString()}
                      </span>
                      {c.progressStatus !== 'completed' && (
                        <button 
                          onClick={() => handleAddToCalendar(c)}
                          title="Add to Calendar"
                          className="text-slate-400 hover:text-indigo-600  transition-colors"
                        >
                          <CalendarPlus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-800  leading-tight tracking-tight line-clamp-1">{c.title}</h3>
                  <p className="text-slate-500  text-xs mt-2 line-clamp-3 leading-relaxed font-medium">{c.description}</p>
                </div>

                {/* Progress bar info */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 ">
                    <span>Course Progress</span>
                    <span className="text-slate-700 ">{c.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100  h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500  h-full rounded-full transition-all duration-300"
                      style={{ width: `${c.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-[9px] text-slate-500  font-bold">
                    {c.completedModulesCount} of {c.totalModulesCount} modules marked complete
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50  px-5 py-4 border-t border-slate-100 ">
                {c.progressStatus === 'completed' ? (
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/employee/courses/${c.courseId}`}
                      className="flex-1 block text-center bg-white  border border-indigo-200  hover:bg-indigo-50  text-indigo-600  text-[11px] font-bold py-2.5 rounded-xl transition shadow-sm"
                    >
                      Review
                    </Link>
                    <Link
                      to={`/employee/courses/${c.courseId}/certificate`}
                      className="flex-1 block text-center bg-indigo-500 hover:bg-indigo-600   text-white text-[11px] font-bold py-2.5 rounded-xl transition shadow-sm"
                    >
                      Certificate
                    </Link>
                  </div>
                ) : (
                  <Link
                    to={`/employee/courses/${c.courseId}`}
                    className="w-full block text-center bg-indigo-500 hover:bg-indigo-600   text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm"
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
