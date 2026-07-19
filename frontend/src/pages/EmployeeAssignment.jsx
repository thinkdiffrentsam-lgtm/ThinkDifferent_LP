import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  UserCheck, 
  Trash2, 
  Search, 
  Calendar, 
  Briefcase, 
  Loader2, 
  AlertCircle,
  Check
} from 'lucide-react';

const EmployeeAssignment = () => {
  const [courses, setCourses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assignmentType, setAssignmentType] = useState('individual'); // 'individual' or 'department'
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('Engineering');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search filter for employees list
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInitData();
  }, []);

  const fetchInitData = async () => {
    try {
      const [coursesRes, employeesRes, assignmentsRes] = await Promise.all([
        api.get('/api/courses'),
        api.get('/api/auth/employees'),
        api.get('/api/assignments')
      ]);

      setCourses(coursesRes.data.filter(c => c.isPublished));
      setEmployees(employeesRes.data);
      setAssignments(assignmentsRes.data);
      
      if (coursesRes.data.filter(c => c.isPublished).length > 0) {
        setSelectedCourse(coursesRes.data.filter(c => c.isPublished)[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch initialization data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (employeeId) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedCourse) {
      setError('Please select a course to assign.');
      return;
    }
    
    if (assignmentType === 'individual' && selectedEmployees.length === 0) {
      setError('Please select at least one employee.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    const payload = {
      courseId: selectedCourse,
      dueDate: dueDate || undefined
    };

    if (assignmentType === 'individual') {
      payload.userIds = selectedEmployees;
    } else {
      payload.department = selectedDepartment;
    }

    try {
      const res = await api.post('/api/assignments', payload);
      setSuccess(res.data.message);
      setSelectedEmployees([]);
      setDueDate('');
      
      // Refresh list
      const assignRes = await api.get('/api/assignments');
      setAssignments(assignRes.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to complete course assignments.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to unassign this course? The employee will lose access immediately.')) {
      return;
    }

    try {
      await api.delete(`/api/assignments/${assignmentId}`);
      setSuccess('Course unassigned successfully.');
      
      // Refresh list
      const assignRes = await api.get('/api/assignments');
      setAssignments(assignRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to remove assignment.');
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-800">Course Assignments</h1>
        <p class="text-slate-500 text-xs mt-0.5 font-medium">Enroll your staff members in training courses based on departments or individual lists.</p>
      </div>

      {/* Alerts */}
      {success && (
        <div class="bg-emerald-50 border border-emerald-100/80 text-emerald-600 px-4 py-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <Check class="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div class="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <AlertCircle class="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Assignment Setup grid */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignment panel form */}
        <div class="bg-white border border-slate-100 p-5 rounded-2xl space-y-4 shadow-sm lg:col-span-1 shadow-slate-100/40">
          <h2 class="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-2">New Enrollment</h2>
          
          <form onSubmit={handleAssign} class="space-y-4">
            {/* Course select */}
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Select Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              >
                {courses.length === 0 ? (
                  <option value="">No published courses available</option>
                ) : (
                  courses.map(c => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))
                )}
              </select>
            </div>

            {/* Target criteria */}
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assignment Strategy</label>
              <div class="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignmentType('individual')}
                  class={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                    assignmentType === 'individual' 
                      ? 'bg-white text-indigo-600 border border-slate-100 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Individuals
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentType('department')}
                  class={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                    assignmentType === 'department' 
                      ? 'bg-white text-indigo-600 border border-slate-100 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  By Department
                </button>
              </div>
            </div>

            {/* Strategy input */}
            {assignmentType === 'department' ? (
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Select Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  class="w-full bg-slate-55 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="HR">HR</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
            ) : (
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Select Employees ({selectedEmployees.length})</label>
                <div class="relative mb-2">
                  <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
                
                <div class="bg-slate-50/50 rounded-xl border border-slate-100 max-h-48 overflow-y-auto p-2 space-y-1.5 shadow-inner">
                  {filteredEmployees.length === 0 ? (
                    <p class="text-xs text-slate-400 text-center py-4 font-medium">No employees match filters.</p>
                  ) : (
                    filteredEmployees.map(emp => (
                      <label key={emp._id} class="flex items-center space-x-2.5 p-1.5 hover:bg-white hover:shadow-sm rounded-lg cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp._id)}
                          onChange={() => handleCheckboxChange(emp._id)}
                          class="rounded text-indigo-650 bg-white border-slate-250 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                        />
                        <div class="text-xs">
                          <div class="font-bold text-slate-700">{emp.name}</div>
                          <div class="text-[10px] text-slate-450 font-semibold">{emp.department} &bull; {emp.designation}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Due date picker */}
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date (Optional)</label>
              <div class="relative">
                <Calendar class="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  class="w-full bg-slate-50 border border-slate-250 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || courses.length === 0}
              class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 rounded-xl shadow-md shadow-indigo-500/10 flex items-center justify-center space-x-1.5 transition disabled:opacity-50 mt-4 text-xs uppercase tracking-wider"
            >
              {submitting ? (
                <Loader2 class="h-4.5 w-4.5 animate-spin" />
              ) : (
                <UserCheck class="h-4.5 w-4.5" />
              )}
              <span>Deploy Assignment</span>
            </button>
          </form>
        </div>

        {/* Assignments active list */}
        <div class="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm lg:col-span-2 space-y-4 shadow-slate-100/40">
          <h2 class="text-sm font-extrabold text-slate-800">Active Enrollments ({assignments.length})</h2>
          
          {assignments.length === 0 ? (
            <div class="text-center py-16 text-slate-400 text-xs font-medium">
              No active courses have been assigned to employees yet.
            </div>
          ) : (
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-650">
                <thead>
                  <tr class="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th class="pb-3 font-extrabold">Course Title</th>
                    <th class="pb-3 font-extrabold">Employee</th>
                    <th class="pb-3 font-extrabold">Due Date</th>
                    <th class="pb-3 font-extrabold">Status</th>
                    <th class="pb-3 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100/60 font-medium">
                  {assignments.map((assign) => (
                    <tr key={assign._id} class="hover:bg-slate-50/50 transition duration-75">
                      <td class="py-3.5 font-bold text-slate-700 max-w-[200px] truncate">
                        {assign.courseId?.title || 'Deleted Course'}
                      </td>
                      <td class="py-3.5">
                        <div class="font-bold text-slate-700">{assign.userId?.name || 'Deleted User'}</div>
                        <div class="text-[10px] text-slate-450 font-semibold">{assign.userId?.department || 'N/A'}</div>
                      </td>
                      <td class="py-3.5 text-slate-450">
                        {assign.dueDate ? new Date(assign.dueDate).toLocaleDateString() : 'No Limit'}
                      </td>
                      <td class="py-3.5">
                        <span class={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md ${
                          assign.status === 'completed' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/60'
                            : assign.status === 'in-progress' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-indigo-50 text-indigo-650 border border-indigo-100/60'
                        }`}>
                          {assign.status}
                        </span>
                      </td>
                      <td class="py-3.5 text-right">
                        <button
                          onClick={() => handleUnassign(assign._id)}
                          class="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition"
                          title="Remove assignment"
                        >
                          <Trash2 class="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAssignment;
