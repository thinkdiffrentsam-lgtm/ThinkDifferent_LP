import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';

// Components & Shared Layout
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import CourseManagement from './pages/CourseManagement';
import CourseBuilder from './pages/CourseBuilder';
import EmployeeAssignment from './pages/EmployeeAssignment';
import EmployeeManagement from './pages/EmployeeManagement';
import AdminReports from './pages/AdminReports';

// Employee Pages
import EmployeeDashboard from './pages/EmployeeDashboard';
import MyCourses from './pages/MyCourses';
import CoursePlayer from './pages/CoursePlayer';
import Certificate from './pages/Certificate';

// Route Protection wrappers
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div class="min-h-screen bg-slate-50 flex justify-center items-center">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If Admin attempts to view employee page, or employee views admin page
    const fallbackRedirect = user.role === 'admin' ? '/admin' : '/employee';
    return <Navigate to={fallbackRedirect} replace />;
  }

  return children;
};

// Layout wrapper
const Layout = ({ children }) => {
  return (
    <div class="h-screen flex flex-col bg-[#fafafc] text-slate-800 overflow-hidden">
      <Navbar />
      <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
        <Sidebar />
        <main class="flex-1 overflow-y-auto bg-[#fafafc]">
          {children}
        </main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { user } = useContext(AuthContext);

  return (
    <Routes>
      {/* Auth */}
      <Route 
        path="/login" 
        element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace /> : <Login />} 
      />

      {/* Admin Protected Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout><AdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/courses" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout><CourseManagement /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/courses/:courseId/builder" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout><CourseBuilder /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/assignments" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout><EmployeeAssignment /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/employees" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout><EmployeeManagement /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout><AdminReports /></Layout>
        </ProtectedRoute>
      } />

      {/* Employee Protected Routes */}
      <Route path="/employee" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <Layout><EmployeeDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/employee/my-courses" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <Layout><MyCourses /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/employee/courses/:courseId" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <Layout><CoursePlayer /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/employee/courses/:courseId/certificate" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <Certificate />
        </ProtectedRoute>
      } />

      {/* Fallback Redirections */}
      <Route path="*" element={
        <Navigate to={user ? (user.role === 'admin' ? '/admin' : '/employee') : '/login'} replace />
      } />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
