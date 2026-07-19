import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Papa from 'papaparse';
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  Link as LinkIcon, 
  AlignLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Check, 
  AlertCircle,
  Clock,
  Loader2,
  Upload,
  FileCode
} from 'lucide-react';

const CourseBuilder = () => {
  const fileInputRef = useRef(null);
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [codingTask, setCodingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Tab control: 'modules' or 'quiz'
  const [activeTab, setActiveTab] = useState('modules');

  // Module form state
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [modTitle, setModTitle] = useState('');
  const [modDesc, setModDesc] = useState('');
  const [modType, setModType] = useState('video');
  const [modContent, setModContent] = useState('');
  const [modDuration, setModDuration] = useState(0);
  const [modOrder, setModOrder] = useState('');
  const [modSaving, setModSaving] = useState(false);

  // Quiz editor state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizPassingScore, setQuizPassingScore] = useState(70);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizSaving, setQuizSaving] = useState(false);

  // Coding Task editor state
  const [ctTitle, setCtTitle] = useState('');
  const [ctDesc, setCtDesc] = useState('');
  const [ctStarterCodeUrl, setCtStarterCodeUrl] = useState('');
  const [ctSaving, setCtSaving] = useState(false);
  const [uploadingCtFile, setUploadingCtFile] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const res = await api.get(`/api/courses/${courseId}`);
      setCourse(res.data.course);
      setModules(res.data.modules);
      const q = res.data.quizzes[0] || null;
      setQuiz(q);
      
      // Initialize quiz editor with loaded data
      if (q) {
        setQuizTitle(q.title);
        setQuizPassingScore(q.passingScore);
        setQuizQuestions(q.questions || []);
      } else {
        setQuizTitle('Course Final Assessment');
        setQuizPassingScore(70);
        setQuizQuestions([]);
      }

      // Initialize coding task editor
      const ct = res.data.codingTask || null;
      setCodingTask(ct);
      if (ct) {
        setCtTitle(ct.title);
        setCtDesc(ct.description);
        setCtStarterCodeUrl(ct.starterCodeUrl || '');
      } else {
        setCtTitle('Final Coding Project');
        setCtDesc('');
        setCtStarterCodeUrl('');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch course detail information.');
    } finally {
      setLoading(false);
    }
  };

  const [uploadingFile, setUploadingFile] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds the 50MB limit.');
      return;
    }

    setUploadingFile(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setModContent(res.data.url);
      showNotification(res.data.message || 'File uploaded successfully!');
    } catch (err) {
      console.error('File upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload file.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Trigger alert
  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // ==========================================
  // MODULES ACTIONS
  // ==========================================
  const handleSaveModule = async (e) => {
    e.preventDefault();
    if (!modTitle || !modContent) return;
    setModSaving(true);

    const payload = {
      title: modTitle,
      description: modDesc,
      type: modType,
      content: modContent,
      duration: modDuration,
      order: modOrder ? parseInt(modOrder) : undefined
    };

    try {
      if (editingModuleId) {
        // Edit module
        await api.put(`/api/courses/${courseId}/modules/${editingModuleId}`, payload);
        showNotification('Module updated successfully!');
      } else {
        // Create module
        await api.post(`/api/courses/${courseId}/modules`, payload);
        showNotification('Module added successfully!');
      }
      resetModuleForm();
      fetchCourseDetails();
    } catch (err) {
      console.error(err);
      setError('Failed to save module.');
    } finally {
      setModSaving(false);
    }
  };

  const handleEditModule = (mod) => {
    setEditingModuleId(mod._id);
    setModTitle(mod.title);
    setModDesc(mod.description);
    setModType(mod.type);
    setModContent(mod.content);
    setModDuration(mod.duration);
    setModOrder(mod.order);
    setShowModuleForm(true);
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Are you sure you want to delete this module?')) return;
    try {
      await api.delete(`/api/courses/${courseId}/modules/${moduleId}`);
      showNotification('Module deleted.');
      fetchCourseDetails();
    } catch (err) {
      console.error(err);
      setError('Failed to delete module.');
    }
  };

  const resetModuleForm = () => {
    setShowModuleForm(false);
    setEditingModuleId(null);
    setModTitle('');
    setModDesc('');
    setModType('video');
    setModContent('');
    setModDuration(0);
    setModOrder('');
  };

  // ==========================================
  // QUIZ ACTIONS
  // ==========================================
  const addQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        points: 10
      }
    ]);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedQuestions = [];
        let hasError = false;

        results.data.forEach((row, idx) => {
          try {
            // Map headers to properties (e.g. Question, Option 1, Option 2, Option 3, Option 4, Correct Option, Points)
            const keys = Object.keys(row);
            
            // Allow loose matching of keys just in case
            const getVal = (search) => {
              const key = keys.find(k => k.toLowerCase().includes(search.toLowerCase()));
              return key ? row[key] : '';
            };

            const questionText = getVal('question') || getVal('prompt');
            const opt1 = getVal('option 1') || getVal('choice 1');
            const opt2 = getVal('option 2') || getVal('choice 2');
            const opt3 = getVal('option 3') || getVal('choice 3');
            const opt4 = getVal('option 4') || getVal('choice 4');
            const correctOptStr = getVal('correct option') || getVal('answer');
            const pointsStr = getVal('points') || getVal('score');

            if (!questionText || !opt1 || !opt2 || !opt3 || !opt4 || !correctOptStr) {
              console.warn(`Row ${idx + 1} is missing required fields. Skipping.`);
              hasError = true;
              return;
            }

            const correctOptMatch = correctOptStr.toString().match(/\d+/);
            const correctOptionIndex = correctOptMatch ? parseInt(correctOptMatch[0], 10) - 1 : NaN;
            const points = parseInt(pointsStr, 10) || 10;

            if (isNaN(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
              console.warn(`Row ${idx + 1} has an invalid correct option index. Must be 1-4. Skipping.`);
              hasError = true;
              return;
            }

            parsedQuestions.push({
              questionText,
              options: [opt1, opt2, opt3, opt4],
              correctOptionIndex,
              points
            });
          } catch (err) {
            console.error('Error parsing row:', err);
            hasError = true;
          }
        });

        if (parsedQuestions.length > 0) {
          setQuizQuestions(prev => [...prev, ...parsedQuestions]);
          showNotification(`Successfully imported ${parsedQuestions.length} questions!`);
        } else {
          setError('Failed to import questions. Ensure your CSV matches the required format.');
        }

        if (hasError) {
          setError('Some rows were skipped due to missing or invalid data.');
        }

        // Reset input
        e.target.value = '';
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
        e.target.value = '';
      }
    });
  };

  const deleteQuestion = (index) => {
    const updated = quizQuestions.filter((_, qIdx) => qIdx !== index);
    setQuizQuestions(updated);
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...quizQuestions];
    updated[index][field] = value;
    setQuizQuestions(updated);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...quizQuestions];
    updated[qIndex].options[optIndex] = value;
    setQuizQuestions(updated);
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle) {
      setError('Please provide a quiz title.');
      return;
    }
    if (quizQuestions.length === 0) {
      setError('Please add at least one question to the quiz.');
      return;
    }

    // Basic validation
    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      if (!q.questionText) {
        setError(`Question ${i + 1} text is empty.`);
        return;
      }
      if (q.options.some(opt => !opt)) {
        setError(`Please fill all options for Question ${i + 1}.`);
        return;
      }
    }

    setQuizSaving(true);
    setError('');

    try {
      await api.post(`/api/courses/${courseId}/quizzes`, {
        title: quizTitle,
        passingScore: quizPassingScore,
        questions: quizQuestions
      });
      showNotification('Quiz saved successfully!');
      fetchCourseDetails();
    } catch (err) {
      console.error(err);
      setError('Failed to save quiz.');
    } finally {
      setQuizSaving(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quiz?._id) return;
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    
    try {
      await api.delete(`/api/courses/${courseId}/quizzes/${quiz._id}`);
      showNotification('Quiz deleted.');
      setQuiz(null);
      setQuizQuestions([]);
      setQuizTitle('Course Final Assessment');
    } catch (err) {
      console.error(err);
      setError('Failed to delete quiz.');
    }
  };

  // ==========================================
  // CODING TASK ACTIONS
  // ==========================================
  const handleCtFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds the 50MB limit.');
      return;
    }

    setUploadingCtFile(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCtStarterCodeUrl(res.data.url);
      showNotification('Starter code uploaded successfully!');
    } catch (err) {
      console.error('File upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload starter code.');
    } finally {
      setUploadingCtFile(false);
    }
  };

  const handleSaveCodingTask = async (e) => {
    e.preventDefault();
    if (!ctTitle || !ctDesc) {
      setError('Please provide a title and description for the coding task.');
      return;
    }

    setCtSaving(true);
    setError('');

    try {
      await api.post(`/api/courses/${courseId}/coding-task`, {
        title: ctTitle,
        description: ctDesc,
        starterCodeUrl: ctStarterCodeUrl
      });
      showNotification('Coding task saved successfully!');
      fetchCourseDetails();
    } catch (err) {
      console.error(err);
      setError('Failed to save coding task.');
    } finally {
      setCtSaving(false);
    }
  };

  const handleDeleteCodingTask = async () => {
    if (!codingTask?._id) return;
    if (!window.confirm('Are you sure you want to delete this coding task?')) return;
    
    try {
      await api.delete(`/api/courses/${courseId}/coding-task`);
      showNotification('Coding task deleted.');
      setCodingTask(null);
      setCtTitle('Final Coding Project');
      setCtDesc('');
      setCtStarterCodeUrl('');
    } catch (err) {
      console.error(err);
      setError('Failed to delete coding task.');
    }
  };

  if (loading) {
    return (
      <div class="p-8 flex justify-center items-center h-full">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const getModuleIcon = (type) => {
    switch (type) {
      case 'video': return <Video class="h-4 w-4" />;
      case 'pdf': return <FileText class="h-4 w-4" />;
      case 'link': return <LinkIcon class="h-4 w-4" />;
      case 'task': return <Check class="h-4 w-4 text-indigo-500" />;
      default: return <AlignLeft class="h-4 w-4" />;
    }
  };

  return (
    <div class="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div class="flex items-center space-x-3 text-xs text-slate-400">
        <Link to="/admin/courses" class="hover:text-indigo-600 flex items-center space-x-1 transition font-semibold">
          <ArrowLeft class="h-3.5 w-3.5" />
          <span>Courses</span>
        </Link>
        <span>&bull;</span>
        <span class="text-slate-600 font-semibold">Builder</span>
      </div>

      {/* Course Header Summary */}
      <div class="bg-white border border-slate-100 p-6 rounded-2xl flex flex-col md:flex-row justify-between md:items-center shadow-sm shadow-slate-100/40">
        <div class="space-y-1">
          <h1 class="text-xl font-extrabold text-slate-800">{course?.title}</h1>
          <p class="text-slate-500 text-xs font-medium">{course?.description}</p>
        </div>
        <div class="mt-4 md:mt-0 flex space-x-2 shrink-0">
          <span class={`text-[9px] uppercase font-extrabold tracking-wider px-3 py-1.5 rounded-md self-center border ${
            course?.isPublished 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100/80' 
              : 'bg-slate-105 text-slate-500 border-slate-200/50'
          }`}>
            {course?.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div class="bg-emerald-50 border border-emerald-100/80 text-emerald-600 px-4 py-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <Check class="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div class="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <AlertCircle class="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div class="border-b border-slate-200/60 flex space-x-6">
        <button
          onClick={() => setActiveTab('modules')}
          class={`pb-2.5 text-xs font-bold tracking-wide transition border-b-2 ${
            activeTab === 'modules' ? 'border-indigo-500 text-indigo-650' : 'border-transparent text-slate-450 hover:text-slate-700'
          }`}
        >
          Lesson Modules ({modules.length})
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          class={`pb-2.5 text-xs font-bold tracking-wide transition border-b-2 ${
            activeTab === 'quiz' ? 'border-indigo-500 text-indigo-650' : 'border-transparent text-slate-455 hover:text-slate-700'
          }`}
        >
          Quiz Assessment {quiz ? '✓' : '(None)'}
        </button>
        <button
          onClick={() => setActiveTab('coding-task')}
          class={`pb-2.5 text-xs font-bold tracking-wide transition border-b-2 ${
            activeTab === 'coding-task' ? 'border-indigo-500 text-indigo-650' : 'border-transparent text-slate-455 hover:text-slate-700'
          }`}
        >
          Coding Task {codingTask ? '✓' : '(None)'}
        </button>
      </div>

      {/* Tab 1: MODULES */}
      {activeTab === 'modules' && (
        <div class="space-y-6">
          {/* Add module button */}
          {!showModuleForm && (
            <button
              onClick={() => setShowModuleForm(true)}
              class="flex items-center space-x-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Plus class="h-4 w-4" />
              <span>Add Module</span>
            </button>
          )}

          {/* Module Add/Edit Form */}
          {showModuleForm && (
            <form onSubmit={handleSaveModule} class="bg-white border border-slate-100 p-6 rounded-2xl space-y-4 shadow-md">
              <h3 class="text-xs font-extrabold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wider">
                {editingModuleId ? 'Edit Module' : 'Create Module'}
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-4 md:col-span-2">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Module Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chapter 1: Introduction"
                      value={modTitle}
                      onChange={(e) => setModTitle(e.target.value)}
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Short Description (Optional)</label>
                    <input
                      type="text"
                      placeholder="Summary of learnings..."
                      value={modDesc}
                      onChange={(e) => setModDesc(e.target.value)}
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module Content</label>
                      {(modType === 'pdf' || modType === 'video') && (
                        <div class="flex items-center space-x-2">
                          {uploadingFile ? (
                            <span class="text-[9px] text-slate-450 flex items-center font-bold">
                              <Loader2 class="h-3.5 w-3.5 animate-spin mr-1 text-indigo-500" />
                              Uploading file...
                            </span>
                          ) : (
                            <label class="text-[9px] font-bold text-indigo-650 hover:text-indigo-500 cursor-pointer flex items-center bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md hover:bg-indigo-100/30 transition">
                              <span>Upload File</span>
                              <input
                                type="file"
                                accept={modType === 'pdf' ? '.pdf' : '.mp4,.mkv,.avi,.webm'}
                                onChange={handleFileUpload}
                                class="hidden"
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                    <textarea
                      rows="4"
                      required
                      placeholder={
                        modType === 'video' ? 'Paste Video Embed/Stream URL or Upload file...' :
                        modType === 'pdf' ? 'Paste Document URL or Upload file...' :
                        modType === 'link' ? 'Paste Web Link...' :
                        modType === 'task' ? 'Enter task prompt and instructions...' :
                        'Enter Rich Text/Lecture content...'
                      }
                      value={modContent}
                      onChange={(e) => setModContent(e.target.value)}
                      class="w-full bg-slate-55 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition font-mono"
                    />
                  </div>
                </div>

                <div class="space-y-4">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Content Type</label>
                    <select
                      value={modType}
                      onChange={(e) => setModType(e.target.value)}
                      class="w-full bg-slate-55 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    >
                      <option value="video">Video Stream</option>
                      <option value="pdf">PDF Document</option>
                      <option value="link">Web Resource Link</option>
                      <option value="text">Rich Text/Lecture</option>
                      <option value="task">GitHub Task Submission</option>
                    </select>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Minutes</label>
                      <input
                        type="number"
                        min="0"
                        value={modDuration}
                        onChange={(e) => setModDuration(parseInt(e.target.value) || 0)}
                        class="w-full bg-slate-55 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sort Order</label>
                      <input
                        type="number"
                        placeholder="e.g. 1"
                        value={modOrder}
                        onChange={(e) => setModOrder(e.target.value)}
                        class="w-full bg-slate-55 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetModuleForm}
                  class="bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modSaving}
                  class="flex items-center space-x-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  {modSaving && <Loader2 class="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Module</span>
                </button>
              </div>
            </form>
          )}

          {/* Module List grid */}
          {modules.length === 0 ? (
            <div class="bg-white border border-slate-100 p-8 rounded-2xl text-center text-slate-450 text-xs font-medium shadow-sm">
              This course does not contain any lesson modules yet. Use the button above to add a video, PDF, or text module.
            </div>
          ) : (
            <div class="space-y-2.5">
              {modules.map((mod) => (
                <div key={mod._id} class="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-indigo-100/50 transition">
                  <div class="flex items-center space-x-4">
                    <div class="bg-indigo-50 text-indigo-650 p-2.5 rounded-xl border border-indigo-100/60 shrink-0">
                      {getModuleIcon(mod.type)}
                    </div>
                    <div>
                      <h4 class="text-xs font-bold text-slate-800">
                        {mod.order}. {mod.title}
                      </h4>
                      <p class="text-[11px] text-slate-450 mt-0.5 line-clamp-1 font-medium">{mod.description || 'No description provided.'}</p>
                      <div class="flex items-center space-x-3 mt-1.5 text-[9px] text-slate-450 font-bold uppercase tracking-wider">
                        <span class="bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5 rounded">{mod.type}</span>
                        {mod.duration > 0 && (
                          <span class="flex items-center">
                            <Clock class="h-3 w-3 mr-1 text-slate-400" />
                            {mod.duration} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleEditModule(mod)}
                      class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition"
                      title="Edit Module"
                    >
                      <Edit2 class="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteModule(mod._id)}
                      class="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition"
                      title="Delete Module"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: QUIZ ASSESSMENT */}
      {activeTab === 'quiz' && (
        <div class="bg-white border border-slate-100 p-6 rounded-2xl space-y-6 shadow-sm shadow-slate-100/40">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-sm font-extrabold text-slate-850">Quiz Assessment Builder</h2>
              <p class="text-[10px] text-slate-450 mt-0.5 font-medium">Attach a final exam. Employees must reach the passing score to complete the course.</p>
            </div>
            {quiz && (
              <button
                type="button"
                onClick={handleDeleteQuiz}
                class="flex items-center space-x-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100/80 hover:bg-rose-600 hover:text-white transition"
              >
                <Trash2 class="h-3.5 w-3.5" />
                <span>Delete Assessment</span>
              </button>
            )}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2">
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quiz Title</label>
              <input
                type="text"
                required
                placeholder="Final Examination"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Passing Score (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={quizPassingScore}
                onChange={(e) => setQuizPassingScore(parseInt(e.target.value) || 0)}
                class="w-full bg-slate-55 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Questions Editor */}
          <div class="space-y-4 mt-6">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 class="text-xs font-bold text-slate-600 uppercase tracking-wider">Questions ({quizQuestions.length})</h3>
              <div class="flex items-center space-x-2">
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleCSVUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  class="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                >
                  <Upload class="h-3.5 w-3.5" />
                  <span>Bulk Import CSV</span>
                </button>
                <button
                  type="button"
                  onClick={addQuestion}
                  class="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-650 border border-slate-200/50 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                >
                  <Plus class="h-3.5 w-3.5" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {quizQuestions.length === 0 ? (
              <div class="text-center py-8 text-slate-400 text-xs font-medium">
                No quiz questions added. Press "Add Question" to begin composing questions.
              </div>
            ) : (
              <div class="space-y-6">
                {quizQuestions.map((q, qIndex) => (
                  <div key={qIndex} class="bg-slate-50/50 border border-slate-100 p-5 rounded-xl space-y-4">
                    <div class="flex items-start justify-between">
                      <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/80 px-2.5 py-1 rounded-lg">
                        Question {qIndex + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteQuestion(qIndex)}
                        class="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div class="md:col-span-3">
                        <label class="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Question Prompt</label>
                        <input
                          type="text"
                          placeholder="What is the definition of..."
                          value={q.questionText}
                          onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                          class="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label class="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Points</label>
                        <input
                          type="number"
                          value={q.points}
                          onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 0)}
                          class="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>

                    {/* Options list */}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} class="space-y-1">
                          <label class="text-[9px] uppercase font-bold text-slate-450 tracking-widest">Option {optIndex + 1}</label>
                          <input
                            type="text"
                            placeholder={`Choice ${optIndex + 1}`}
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                            class="w-full bg-white border border-slate-200/80 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Correct Option select */}
                    <div class="w-full md:w-1/3 mt-2">
                      <label class="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Correct Choice</label>
                      <select
                        value={q.correctOptionIndex}
                        onChange={(e) => handleQuestionChange(qIndex, 'correctOptionIndex', parseInt(e.target.value))}
                        class="w-full bg-white border border-slate-250 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                      >
                        {q.options.map((_, idx) => (
                          <option key={idx} value={idx}>
                            Option {idx + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Action */}
          <div class="flex items-center justify-end pt-5 border-t border-slate-100 mt-6">
            <button
              onClick={handleSaveQuiz}
              disabled={quizSaving}
              class="flex items-center space-x-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {quizSaving ? (
                <Loader2 class="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Save class="h-4.5 w-4.5" />
              )}
              <span>Save Quiz Assessment</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: CODING TASK */}
      {activeTab === 'coding-task' && (
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-xl font-black text-slate-800 tracking-tight flex items-center space-x-2">
              <FileCode class="h-6 w-6 text-indigo-500" />
              <span>Coding Task</span>
            </h2>
            {codingTask && (
              <button
                onClick={handleDeleteCodingTask}
                class="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition"
              >
                <Trash2 class="h-4 w-4" />
                <span>Delete Task</span>
              </button>
            )}
          </div>

          <div class="space-y-6">
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                Task Title
              </label>
              <input
                type="text"
                value={ctTitle}
                onChange={(e) => setCtTitle(e.target.value)}
                placeholder="e.g. Final React Project"
                class="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 transition"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                Task Description & Instructions
              </label>
              <textarea
                value={ctDesc}
                onChange={(e) => setCtDesc(e.target.value)}
                rows={6}
                placeholder="Explain the requirements for this coding task..."
                class="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 transition"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                Starter Code (Optional)
              </label>
              <div class="flex items-center space-x-3">
                <input
                  type="text"
                  value={ctStarterCodeUrl}
                  onChange={(e) => setCtStarterCodeUrl(e.target.value)}
                  placeholder="Paste URL to zip file or upload..."
                  class="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 transition"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.onchange = handleCtFileUpload;
                    input.click();
                  }}
                  disabled={uploadingCtFile}
                  class="flex items-center space-x-1.5 px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
                >
                  {uploadingCtFile ? <Loader2 class="h-4 w-4 animate-spin" /> : <Upload class="h-4 w-4 text-slate-400" />}
                  <span>Upload Zip</span>
                </button>
              </div>
            </div>
          </div>

          {/* Save Action */}
          <div class="flex items-center justify-end pt-5 border-t border-slate-100 mt-8">
            <button
              onClick={handleSaveCodingTask}
              disabled={ctSaving}
              class="flex items-center space-x-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {ctSaving ? (
                <Loader2 class="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Save class="h-4.5 w-4.5" />
              )}
              <span>Save Coding Task</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseBuilder;
