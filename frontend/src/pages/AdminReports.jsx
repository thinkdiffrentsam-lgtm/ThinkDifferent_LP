import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Search, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  RefreshCw 
} from 'lucide-react';

const AdminReports = () => {
  const [progressData, setProgressData] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab controller: 'progress' or 'quizzes'
  const [activeReportTab, setActiveReportTab] = useState('progress');

  // Filter criteria
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const [progRes, quizRes] = await Promise.all([
        api.get('/api/reports/progress'),
        api.get('/api/reports/quiz-attempts')
      ]);

      setProgressData(progRes.data);
      setQuizAttempts(quizRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch reporting logs.');
    } finally {
      setLoading(false);
    }
  };

  // Filter calculations for Progress logs
  const filteredProgress = progressData.filter(item => {
    const matchesSearch = 
      item.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      item.employeeEmail.toLowerCase().includes(search.toLowerCase()) ||
      item.courseTitle.toLowerCase().includes(search.toLowerCase());
      
    const matchesDept = deptFilter === 'All' || item.department === deptFilter;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Filter calculations for Quiz attempts logs
  const filteredQuizzes = quizAttempts.filter(item => {
    const matchesSearch = 
      item.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      item.employeeEmail.toLowerCase().includes(search.toLowerCase()) ||
      item.courseTitle.toLowerCase().includes(search.toLowerCase()) ||
      item.quizTitle.toLowerCase().includes(search.toLowerCase());
      
    const matchesDept = deptFilter === 'All' || item.department === deptFilter;
    
    // Status match for quiz (Passed vs Failed)
    let matchesStatus = true;
    if (statusFilter !== 'All') {
      const isPassedFilter = statusFilter === 'completed'; // maps to 'Passed'
      const isFailedFilter = statusFilter === 'assigned'; // maps to 'Failed'
      if (isPassedFilter) matchesStatus = item.passed;
      if (isFailedFilter) matchesStatus = !item.passed;
    }

    return matchesSearch && matchesDept && matchesStatus;
  });

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
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-slate-800">Reports & Logs</h1>
          <p class="text-slate-500 text-xs mt-0.5 font-medium">Audit employee learning cycles, course progress percentages, and final test results.</p>
        </div>
        <button
          onClick={fetchReportData}
          class="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-205 text-xs font-semibold px-3 py-2 rounded-xl transition shadow-sm"
        >
          <RefreshCw class="h-3.5 w-3.5" />
          <span>Reload logs</span>
        </button>
      </div>

      {error && (
        <div class="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-4 rounded-xl">
          Error loading logs: {error}
        </div>
      )}

      {/* Report Tabs */}
      <div class="border-b border-slate-205 flex space-x-6">
        <button
          onClick={() => {
            setActiveReportTab('progress');
            setStatusFilter('All');
          }}
          class={`pb-2.5 text-xs font-bold tracking-wide transition border-b-2 ${
            activeReportTab === 'progress' ? 'border-indigo-500 text-indigo-650' : 'border-transparent text-slate-450 hover:text-slate-700'
          }`}
        >
          Employee Course Progress
        </button>
        <button
          onClick={() => {
            setActiveReportTab('quizzes');
            setStatusFilter('All');
          }}
          class={`pb-2.5 text-xs font-bold tracking-wide transition border-b-2 ${
            activeReportTab === 'quizzes' ? 'border-indigo-500 text-indigo-650' : 'border-transparent text-slate-455 hover:text-slate-700'
          }`}
        >
          Quiz Exam Logs
        </button>
      </div>

      {/* Filter Control Box */}
      <div class="bg-white border border-slate-100 p-4 rounded-2xl flex flex-col md:flex-row gap-3.5 shadow-sm shadow-slate-100/40">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee, email, course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        <div class="flex flex-wrap gap-2.5 items-center">
          <div class="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter class="h-3.5 w-3.5 text-slate-450" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              class="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="HR">HR</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          <div class="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              class="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              {activeReportTab === 'progress' ? (
                <>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </>
              ) : (
                <>
                  <option value="completed">Passed Quiz</option>
                  <option value="assigned">Failed Quiz</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm shadow-slate-100/40 overflow-hidden">
        {activeReportTab === 'progress' ? (
          /* =======================================
             PROGRESS REPORT GRID
             ======================================= */
          filteredProgress.length === 0 ? (
            <p class="text-center py-12 text-slate-400 text-xs font-medium">No progress logs match your query.</p>
          ) : (
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-650">
                <thead>
                  <tr class="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th class="pb-3 font-extrabold">Employee</th>
                    <th class="pb-3 font-extrabold">Department</th>
                    <th class="pb-3 font-extrabold">Course Title</th>
                    <th class="pb-3 font-extrabold">Completed Modules</th>
                    <th class="pb-3 font-extrabold">Completion Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100/60 font-medium">
                  {filteredProgress.map((p) => (
                    <tr key={p.assignmentId} class="hover:bg-slate-50/50 transition duration-75">
                      <td class="py-4">
                        <div class="font-bold text-slate-700">{p.employeeName}</div>
                        <div class="text-[10px] text-slate-450 leading-tight font-semibold mt-0.5">{p.employeeEmail}</div>
                      </td>
                      <td class="py-4 font-semibold text-slate-500">{p.department}</td>
                      <td class="py-4 font-bold text-slate-700">{p.courseTitle}</td>
                      <td class="py-4">
                        <div class="flex items-center space-x-2 w-36">
                          <span class="text-[11px] font-bold text-slate-700 shrink-0">{p.percentage}%</span>
                          <div class="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              class="bg-indigo-500 h-full rounded-full"
                              style={{ width: `${p.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td class="py-4">
                        <span class={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md ${
                          p.status === 'completed' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/60'
                            : p.status === 'in-progress' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-indigo-50 text-indigo-650 border border-indigo-100/60'
                        }`}>
                          {p.status}
                        </span>
                        {p.completedDate && (
                          <div class="text-[9px] text-slate-450 mt-1">
                            Done: {new Date(p.completedDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* =======================================
             QUIZ REPORT GRID
             ======================================= */
          filteredQuizzes.length === 0 ? (
            <p class="text-center py-12 text-slate-400 text-xs font-medium">No exam records found.</p>
          ) : (
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-650">
                <thead>
                  <tr class="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th class="pb-3 font-extrabold">Employee</th>
                    <th class="pb-3 font-extrabold">Course Title</th>
                    <th class="pb-3 font-extrabold">Quiz Title</th>
                    <th class="pb-3 font-extrabold">Score Scored</th>
                    <th class="pb-3 font-extrabold">Exams Date</th>
                    <th class="pb-3 font-extrabold text-right">Result</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100/60 font-medium">
                  {filteredQuizzes.map((q) => (
                    <tr key={q.attemptId} class="hover:bg-slate-50/50 transition duration-75">
                      <td class="py-4">
                        <div class="font-bold text-slate-700">{q.employeeName}</div>
                        <div class="text-[10px] text-slate-450 leading-tight font-semibold mt-0.5">{q.employeeEmail}</div>
                      </td>
                      <td class="py-4 font-semibold text-slate-750">{q.courseTitle}</td>
                      <td class="py-4 text-xs font-semibold text-slate-500">{q.quizTitle}</td>
                      <td class="py-4">
                        <span class={`text-sm font-bold ${q.passed ? 'text-emerald-650' : 'text-rose-600'}`}>
                          {q.score}%
                        </span>
                      </td>
                      <td class="py-4 text-slate-450">
                        {new Date(q.attemptDate).toLocaleDateString()} &bull; {new Date(q.attemptDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td class="py-4 text-right font-semibold">
                        <span class={`inline-flex items-center space-x-1 text-xs font-bold ${
                          q.passed ? 'text-emerald-650' : 'text-rose-600'
                        }`}>
                          {q.passed ? (
                            <>
                              <CheckCircle2 class="h-4 w-4" />
                              <span>Passed</span>
                            </>
                          ) : (
                            <>
                              <XCircle class="h-4 w-4" />
                              <span>Failed</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AdminReports;
