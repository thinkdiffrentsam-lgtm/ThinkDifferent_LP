import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BookOpen, 
  Trash2, 
  Settings, 
  Plus, 
  X, 
  Loader2, 
  FolderLock, 
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create / Edit course Modal/Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/api/courses');
      setCourses(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch courses list.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrEdit = async (e) => {
    e.preventDefault();
    if (!title || !description) return;
    setSaving(true);

    try {
      if (editingId) {
        // Edit course
        await api.put(`/api/courses/${editingId}`, { title, description, thumbnail, isPublished });
      } else {
        // Create course
        await api.post('/api/courses', { title, description, thumbnail, isPublished });
      }
      resetForm();
      fetchCourses();
    } catch (err) {
      console.error(err);
      setError('Failed to save course details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {

    try {
      await api.delete(`/api/courses/${id}`);
      fetchCourses();
    } catch (err) {
      console.error(err);
      setError('Failed to delete course.');
    }
  };

  const triggerEdit = (course) => {
    setIsEditing(true);
    setEditingId(course._id);
    setTitle(course.title);
    setDescription(course.description);
    setThumbnail(course.thumbnail);
    setIsPublished(course.isPublished);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setDescription('');
    setThumbnail('');
    setIsPublished(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Course Management</h1>
          <p className="text-slate-500 text-xs mt-0.5">Create training courses, add lesson modules, and deploy exams.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-1.5 bg-indigo-500 hover:bg-indigo-650 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Course</span>
          </button>
        )}
      </div>

      {/* Editing / Creation Panel */}
      {isEditing && (
        <form onSubmit={handleCreateOrEdit} className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800">
              {editingId ? 'Edit Course Details' : 'Create New Course'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-450 hover:text-slate-700"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Course Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Cybersecurity Essentials"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description</label>
              <textarea
                rows="3"
                required
                placeholder="Provide an outline of course learnings..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Thumbnail Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  className="w-full bg-slate-55 border border-slate-200 rounded-xl py-2.5 px-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Publish immediately</h4>
                  <p className="text-[10px] text-slate-450 mt-0.5">Allows employees to see and participate in this course.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isPublished ? 'bg-indigo-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isPublished ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={resetForm}
              className="bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold px-4 py-2 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 bg-indigo-500 hover:bg-indigo-650 text-white text-xs font-bold px-4 py-2 rounded-xl transition disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
              <span>{editingId ? 'Save Changes' : 'Create Course'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center flex flex-col items-center shadow-sm">
          <BookOpen className="h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-sm font-extrabold text-slate-800">No courses created yet</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm">Get started by creating your first training course. You will then be able to construct modules and attach exams.</p>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-indigo-500 hover:bg-indigo-650 text-white text-xs font-semibold px-4 py-2.5 rounded-xl mt-4 shadow-sm transition"
          >
            Create Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div key={course._id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md hover:border-indigo-100/55 transition duration-150">
              <div className="p-5 space-y-3.5">
                <div className="flex items-start justify-between">
                  <span class={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md flex items-center ${
                    course.isPublished 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/80' 
                      : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                  }`}>
                    {course.isPublished ? (
                      <>
                        <Globe className="h-3 w-3 mr-1 shrink-0" />
                        <span>Published</span>
                      </>
                    ) : (
                      <>
                        <FolderLock className="h-3 w-3 mr-1 shrink-0" />
                        <span>Draft</span>
                      </>
                    )}
                  </span>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => triggerEdit(course)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition"
                      title="Edit Course Information"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 transition"
                      title="Delete Course"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-800 tracking-tight leading-tight line-clamp-1">{course.title}</h3>
                  <p className="text-slate-400 text-[10px] font-semibold mt-0.5">Created by {course.createdBy?.name || 'Admin'}</p>
                  <p className="text-slate-500 text-xs mt-3.5 line-clamp-3 leading-relaxed font-medium">{course.description}</p>
                </div>
              </div>

              <div className="bg-slate-50/50 px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to={`/admin/courses/${course._id}/builder`}
                  className="w-full bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 hover:text-indigo-650 text-slate-650 text-xs font-bold py-2 rounded-xl text-center transition shadow-sm"
                >
                  Configure Lessons & Exams &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
