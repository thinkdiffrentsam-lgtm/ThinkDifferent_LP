import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  AlertCircle, 
  Check, 
  X,
  Loader2
} from 'lucide-react';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [empForm, setEmpForm] = useState({ name: '', email: '', password: '', department: 'Engineering', designation: '' });
  const [empStatus, setEmpStatus] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/auth/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch employees list.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (employee = null) => {
    setEmpStatus({ loading: false, error: '', success: '' });
    if (employee) {
      setIsEditing(true);
      setEditingId(employee._id);
      setEmpForm({
        name: employee.name,
        email: employee.email,
        password: '', // Don't pre-fill password
        department: employee.department || 'Engineering',
        designation: employee.designation || ''
      });
    } else {
      setIsEditing(false);
      setEditingId(null);
      setEmpForm({ name: '', email: '', password: '', department: 'Engineering', designation: '' });
    }
    setShowModal(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setEmpStatus({ loading: true, error: '', success: '' });
    try {
      if (isEditing) {
        const res = await api.put(`/api/auth/employees/${editingId}`, empForm);
        setEmpStatus({ loading: false, error: '', success: `Employee ${res.data.name} updated successfully!` });
      } else {
        const res = await api.post('/api/auth/register', { ...empForm, role: 'employee' });
        setEmpStatus({ loading: false, error: '', success: `Employee ${res.data.name} created successfully!` });
      }
      fetchEmployees();
      setTimeout(() => setShowModal(false), 1500);
    } catch (err) {
      setEmpStatus({ loading: false, error: err.response?.data?.message || 'Failed to save employee', success: '' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete employee ${name}? All their learning progress will be lost.`)) {
      return;
    }
    try {
      await api.delete(`/api/auth/employees/${id}`);
      setSuccess(`Employee ${name} deleted successfully.`);
      fetchEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete employee.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && employees.length === 0) {
    return (
      <div class="p-8 flex justify-center items-center h-full">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div class="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-slate-800">Employee Management</h1>
          <p class="text-slate-500 text-xs mt-0.5 font-medium">Add, update, and remove staff members from the platform.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          class="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition shrink-0"
        >
          <UserPlus class="h-4 w-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div class="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
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

      {/* Main Content */}
      <div class="bg-white border border-slate-100 rounded-2xl shadow-sm shadow-slate-100/40 p-5">
        
        {/* Search */}
        <div class="relative mb-6 max-w-md">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Table */}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-650">
            <thead>
              <tr class="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th class="pb-3 font-extrabold">Employee</th>
                <th class="pb-3 font-extrabold">Department</th>
                <th class="pb-3 font-extrabold text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100/60 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="3" class="text-center py-8 text-slate-400 text-xs font-medium">
                    No employees found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp._id} class="hover:bg-slate-50/50 transition duration-75">
                    <td class="py-3.5">
                      <div class="flex items-center space-x-3">
                        <div class="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div class="font-bold text-slate-700">{emp.name}</div>
                          <div class="text-[10px] text-slate-450">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5">
                      <span class="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                        {emp.department || 'General'}
                      </span>
                      <div class="text-[10px] text-slate-450 mt-1">{emp.designation || 'Staff'}</div>
                    </td>
                    <td class="py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(emp)}
                        class="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition"
                        title="Edit employee"
                      >
                        <Edit class="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(emp._id, emp.name)}
                        class="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title="Delete employee"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 class="text-sm font-extrabold text-slate-800 flex items-center">
                <UserPlus class="h-4.5 w-4.5 mr-2 text-indigo-500" />
                {isEditing ? 'Edit Employee Account' : 'Create Employee Account'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                class="text-slate-400 hover:text-slate-600 p-1 bg-white border border-slate-200 rounded-lg shadow-sm"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
            
            <div class="p-6">
              {empStatus.error && (
                <div class="mb-4 bg-rose-50 text-rose-600 text-xs px-3 py-2 rounded-xl border border-rose-100 font-semibold">
                  {empStatus.error}
                </div>
              )}
              {empStatus.success && (
                <div class="mb-4 bg-emerald-50 text-emerald-600 text-xs px-3 py-2 rounded-xl border border-emerald-100 font-semibold">
                  {empStatus.success}
                </div>
              )}

              <form onSubmit={handleSaveEmployee} class="space-y-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                  <input type="text" required value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
                  <input type="email" required value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500" placeholder="john@example.com" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {isEditing ? 'New Password (Optional)' : 'Temporary Password'}
                  </label>
                  <input type="password" required={!isEditing} value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500" placeholder={isEditing ? "Leave blank to keep current" : "••••••••"} />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</label>
                    <select value={empForm.department} onChange={e => setEmpForm({...empForm, department: e.target.value})} class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500">
                      <option value="Engineering">Engineering</option>
                      <option value="HR">HR</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Designation</label>
                    <input type="text" required value={empForm.designation} onChange={e => setEmpForm({...empForm, designation: e.target.value})} class="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500" placeholder="e.g. Developer" />
                  </div>
                </div>
                <button type="submit" disabled={empStatus.loading} class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 rounded-xl shadow-md text-xs uppercase tracking-wider mt-2 transition disabled:opacity-50">
                  {empStatus.loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Employee' : 'Create Employee')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
