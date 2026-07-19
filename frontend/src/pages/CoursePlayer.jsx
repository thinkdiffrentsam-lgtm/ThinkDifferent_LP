import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  Link as LinkIcon, 
  AlignLeft, 
  CheckCircle2, 
  Circle,
  HelpCircle,
  Award,
  Play,
  ExternalLink,
  ChevronRight,
  Loader2,
  Clock
} from 'lucide-react';

const CoursePlayer = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [progress, setProgress] = useState({ completedModules: [], status: 'not-started', percentage: 0 });
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Player state: either a module object (e.g. modules[0]) or the string 'quiz'
  const [activeItem, setActiveItem] = useState(null);

  // Toggle state during API operations
  const [togglingModuleId, setTogglingModuleId] = useState(null);

  // Quiz submission state
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    fetchPlayerDetails();
  }, [courseId]);

  const fetchPlayerDetails = async () => {
    try {
      const res = await api.get(`/api/employee/courses/${courseId}`);
      setCourse(res.data.course);
      setModules(res.data.modules);
      setQuiz(res.data.quiz);
      setProgress(res.data.progress);
      setQuizAttempts(res.data.quizAttempts);

      // Set initial item to play (either first incomplete module or first module overall)
      if (res.data.modules.length > 0 && !activeItem) {
        const completedIds = res.data.progress?.completedModules || [];
        const firstIncomplete = res.data.modules.find(m => !completedIds.includes(m._id));
        setActiveItem(firstIncomplete || res.data.modules[0]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load course player files.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (moduleId) => {
    setTogglingModuleId(moduleId);
    try {
      const res = await api.post(`/api/employee/courses/${courseId}/modules/${moduleId}/complete`);
      setProgress({
        ...progress,
        completedModules: res.data.completedModules,
        percentage: res.data.percentage,
        status: res.data.status
      });

      // Show notification/refresh data
      showModuleFeedback(res.data.message);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingModuleId(null);
    }
  };

  const [feedbackText, setFeedbackText] = useState('');
  const showModuleFeedback = (text) => {
    setFeedbackText(text);
    setTimeout(() => setFeedbackText(''), 2500);
  };

  // Submit Quiz Answers
  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    if (!quiz) return;

    // Check if all questions are answered
    const answersArray = [];
    for (let i = 0; i < quiz.questionsCount; i++) {
      const ans = quizAnswers[i];
      if (ans === undefined) {
        alert(`Please select an answer for Question ${i + 1}.`);
        return;
      }
      answersArray.push(ans);
    }

    setSubmittingQuiz(true);
    try {
      const res = await api.post(`/api/employee/quizzes/${quiz._id}/submit`, {
        answers: answersArray
      });
      setQuizResult(res.data);
      
      // Reload progress state
      fetchPlayerDetails();
    } catch (err) {
      console.error(err);
      alert('Failed to submit quiz.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const selectAnswer = (qIndex, optionIndex) => {
    setQuizAnswers({
      ...quizAnswers,
      [qIndex]: optionIndex
    });
  };

  const handleNextItem = () => {
    if (activeItem === 'quiz') return;

    const currentIndex = modules.findIndex(m => m._id === activeItem._id);
    if (currentIndex < modules.length - 1) {
      // Go to next module
      setActiveItem(modules[currentIndex + 1]);
    } else if (quiz) {
      // Go to quiz
      setActiveItem('quiz');
      setQuizResult(null);
      setQuizAnswers({});
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
      default: return <AlignLeft class="h-4 w-4" />;
    }
  };

  const isCompleted = (moduleId) => progress.completedModules.includes(moduleId);
  const bestAttempt = quizAttempts.length > 0 
    ? quizAttempts.reduce((max, cur) => cur.score > max.score ? cur : max, quizAttempts[0])
    : null;

  return (
    <div class="min-h-[calc(100vh-73px)] flex flex-col lg:flex-row bg-slate-50">
      
      {/* 1. Left Sidebar: Course outline list */}
      <div class="w-full lg:w-80 border-r border-slate-200/80 bg-white shrink-0 flex flex-col">
        {/* Course info card */}
        <div class="p-4 border-b border-slate-100 space-y-3">
          <Link to="/employee/my-courses" class="text-xs text-slate-450 hover:text-indigo-650 flex items-center space-x-1 transition font-bold">
            <ArrowLeft class="h-3.5 w-3.5" />
            <span>Back to My Learning</span>
          </Link>
          <div>
            <h2 class="text-xs font-extrabold text-slate-850 line-clamp-1">{course?.title}</h2>
            <div class="flex items-center space-x-2 mt-1">
              <span class="text-[9px] font-extrabold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50">
                {progress.percentage}% Done
              </span>
              <span class="text-[10px] text-slate-450 font-bold">&bull; {modules.length} lessons</span>
            </div>
          </div>
          {/* Progress bar */}
          <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              class="bg-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          
          {progress.status === 'completed' && (
            <div class="pt-2">
              <Link 
                to={`/employee/courses/${courseId}/certificate`} 
                class="w-full flex items-center justify-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 border border-indigo-200 text-xs font-bold py-2 rounded-xl transition shadow-sm"
              >
                <Award class="h-4 w-4" />
                <span>View Certificate</span>
              </Link>
            </div>
          )}
        </div>

        {/* Lessons checklist list */}
        <div class="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[300px] lg:max-h-none">
          <div class="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Lesson Outline</div>
          
          {modules.map((mod, index) => {
            const active = activeItem !== 'quiz' && activeItem?._id === mod._id;
            const completed = isCompleted(mod._id);
            
            return (
              <div 
                key={mod._id}
                class={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition ${
                  active 
                    ? 'bg-indigo-50/70 border-indigo-100/85 text-indigo-650 font-semibold' 
                    : 'bg-transparent border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-850'
                }`}
                onClick={() => setActiveItem(mod)}
              >
                <div class="flex items-center space-x-3 min-w-0 pr-2">
                  <button
                    type="button"
                    disabled={togglingModuleId === mod._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(mod._id);
                    }}
                    class="text-slate-400 hover:text-indigo-600 transition"
                  >
                    {completed ? (
                      <CheckCircle2 class="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle class="h-5 w-5 text-slate-300 shrink-0" />
                    )}
                  </button>
                  <div class="min-w-0">
                    <div class="text-xs font-bold truncate">
                      {index + 1}. {mod.title}
                    </div>
                    <div class="flex items-center space-x-1.5 text-[9px] text-slate-450 font-bold mt-0.5 uppercase tracking-wide">
                      {getModuleIcon(mod.type)}
                      <span>{mod.type}</span>
                      {mod.duration > 0 && <span>&bull; {mod.duration} min</span>}
                    </div>
                  </div>
                </div>
                <ChevronRight class="h-4 w-4 text-slate-350 shrink-0" />
              </div>
            );
          })}

          {/* Final Quiz node in sidebar */}
          {quiz && (() => {
            const allModulesCompleted = modules.every(m => isCompleted(m._id));
            return (
              <div class="pt-3 border-t border-slate-100 mt-3 space-y-1">
                <div class="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Assessment</div>
                
                <button
                  onClick={() => {
                    if (!allModulesCompleted) {
                      showFeedback('Please complete all learning materials before taking the assessment.');
                      return;
                    }
                    setActiveItem('quiz');
                    setQuizResult(null);
                    setQuizAnswers({});
                  }}
                  disabled={!allModulesCompleted}
                  class={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                    !allModulesCompleted
                      ? 'opacity-60 cursor-not-allowed bg-slate-50 border-transparent'
                      : activeItem === 'quiz' 
                        ? 'bg-indigo-50/70 border-indigo-100/85 text-indigo-655 font-semibold cursor-pointer' 
                        : 'bg-transparent border-transparent hover:bg-slate-50 text-slate-650 hover:text-slate-850 cursor-pointer'
                  }`}
                >
                  <div class="flex items-center space-x-3 min-w-0">
                    <div class={`p-1.5 rounded-lg border shrink-0 ${!allModulesCompleted ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100/60'}`}>
                      <HelpCircle class="h-4 w-4" />
                    </div>
                    <div>
                      <div class="text-xs font-bold">{quiz.title}</div>
                      <div class="text-[9px] text-slate-550 font-semibold mt-0.5">
                        {!allModulesCompleted ? (
                           <span class="text-rose-500 font-bold">Locked - Complete modules first</span>
                        ) : bestAttempt ? (
                          <span class={bestAttempt.passed ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            Best: {bestAttempt.score}% ({bestAttempt.passed ? 'Passed' : 'Failed'})
                          </span>
                        ) : (
                          <span>Required to pass</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight class="h-4 w-4 text-slate-350 shrink-0" />
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 2. Right Main viewport area */}
      <div class="flex-1 bg-[#fafafc] flex flex-col justify-between">
        
        {/* Toggle feedback bar */}
        {feedbackText && (
          <div class="bg-white border-b border-emerald-100 text-emerald-600 text-xs px-6 py-2 flex items-center justify-between font-semibold shadow-sm">
            <span>{feedbackText}</span>
          </div>
        )}

        {/* Viewport Content */}
        <div class="p-6 lg:p-8 flex-1 overflow-y-auto max-w-4xl w-full mx-auto space-y-6">
          {activeItem !== 'quiz' && activeItem ? (
            /* =======================================
               MODULE VIEWPORT VIEW
               ======================================= */
            <div class="space-y-6">
              {/* Module header details */}
              <div class="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-200/60 pb-4 gap-2">
                <div>
                  <span class="bg-indigo-50 text-indigo-600 text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md border border-indigo-100 inline-block mb-1.5">
                    {activeItem.type} lesson
                  </span>
                  <h1 class="text-xl font-extrabold text-slate-800 leading-tight">{activeItem.title}</h1>
                </div>

                <button
                  onClick={() => handleToggleComplete(activeItem._id)}
                  disabled={togglingModuleId === activeItem._id}
                  class={`flex items-center space-x-1.5 text-xs font-bold px-4 py-2 rounded-xl border transition ${
                    isCompleted(activeItem._id)
                      ? 'bg-emerald-50 text-emerald-650 border-emerald-100/60'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white border-transparent shadow shadow-indigo-500/10'
                  }`}
                >
                  <CheckCircle2 class="h-4 w-4 shrink-0" />
                  <span>{isCompleted(activeItem._id) ? 'Completed ✓' : 'Mark Completed'}</span>
                </button>
              </div>

              {/* Module Description */}
              {activeItem.description && (
                <p class="text-slate-500 text-sm italic font-medium">{activeItem.description}</p>
              )}

              {/* Media viewer panels */}
              <div class="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm shadow-slate-100/50 p-5">
                {activeItem.type === 'video' && (
                  <div class="space-y-4">
                    {/* Render embed if stream URL is a Youtube string, else render native video player */}
                    {activeItem.content.includes('youtube.com') || activeItem.content.includes('youtu.be') ? (
                      (() => {
                        const match = activeItem.content.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                        const videoId = (match && match[2].length === 11) ? match[2] : null;
                        const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : activeItem.content;
                        return (
                          <div class="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-205">
                            <iframe
                              src={embedUrl}
                              title={activeItem.title}
                              class="w-full h-full"
                              allowFullScreen
                            ></iframe>
                          </div>
                        );
                      })()
                    ) : (
                      <div class="aspect-video w-full rounded-xl bg-black border border-slate-200 relative overflow-hidden group">
                        <video 
                          src={activeItem.content} 
                          controls 
                          class="w-full h-full object-contain"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                    
                    <div class="flex items-center justify-between text-xs text-slate-450 border-t border-slate-100 pt-3.5 font-bold">
                      <span class="flex items-center">
                        <Clock class="h-4 w-4 mr-1.5 text-indigo-500" />
                        Duration: {activeItem.duration || 'N/A'} minutes
                      </span>
                      <a
                        href={activeItem.content}
                        target="_blank"
                        rel="noreferrer"
                        class="text-indigo-600 hover:text-indigo-500 font-bold flex items-center space-x-1"
                      >
                        <span>Open source video link</span>
                        <ExternalLink class="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {activeItem.type === 'pdf' && (
                  <div class="flex flex-col items-center text-center p-8 space-y-4">
                    <div class="bg-rose-50 text-rose-600 p-4 rounded-full border border-rose-100">
                      <FileText class="h-8 w-8" />
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-800 text-sm">PDF Study Material</h3>
                      <p class="text-xs text-slate-500 mt-1 max-w-sm font-medium">Download the PDF document study sheet or open it in a separate tab to continue readings.</p>
                    </div>
                    <a
                      href={activeItem.content}
                      target="_blank"
                      rel="noreferrer"
                      class="bg-indigo-500 hover:bg-indigo-650 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow shadow-indigo-500/10 transition flex items-center space-x-2"
                    >
                      <span>Open Document PDF</span>
                      <ExternalLink class="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {activeItem.type === 'link' && (
                  <div class="flex flex-col items-center text-center p-8 space-y-4">
                    <div class="bg-indigo-50 text-indigo-600 p-4 rounded-full border border-indigo-100">
                      <LinkIcon class="h-8 w-8" />
                    </div>
                    <div>
                      <h3 class="font-bold text-slate-800 text-sm">External Web Resource</h3>
                      <p class="text-xs text-slate-500 mt-1 max-w-sm font-medium">This module links to an external web page. Click below to view the resource and return here to complete.</p>
                    </div>
                    <a
                      href={activeItem.content}
                      target="_blank"
                      rel="noreferrer"
                      class="bg-indigo-500 hover:bg-indigo-650 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow shadow-indigo-500/10 transition flex items-center space-x-2"
                    >
                      <span>Launch External Resource</span>
                      <ExternalLink class="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {activeItem.type === 'text' && (
                  <div class="prose max-w-none text-slate-650 text-xs font-semibold leading-relaxed p-2 whitespace-pre-wrap">
                    {activeItem.content}
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div class="flex items-center justify-between border-t border-slate-200/60 pt-5 mt-4">
                <span></span>
                <button
                  onClick={handleNextItem}
                  disabled={activeItem === 'quiz' || modules[modules.length - 1]._id === activeItem._id && !quiz}
                  class="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-550 transition disabled:opacity-30 disabled:pointer-events-none"
                >
                  <span>Next Lesson</span>
                  <ChevronRight class="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          ) : (
            /* =======================================
               QUIZ VIEWPORT VIEW
               ======================================= */
            <div class="space-y-6">
              <div class="border-b border-slate-200/60 pb-4">
                <h1 class="text-xl font-extrabold text-slate-800 leading-tight">{quiz?.title}</h1>
                <p class="text-xs text-slate-500 mt-1 font-medium">
                  Answer the following questions. You must score at least <span class="font-semibold text-indigo-600">{quiz?.passingScore}%</span> to pass.
                </p>
              </div>

              {/* If quiz result exists, render results block, else render form */}
              {quizResult ? (
                <div class="bg-white border border-slate-100 p-6 rounded-2xl space-y-6 shadow-sm shadow-slate-100/50">
                  <div class="flex flex-col items-center text-center p-4 space-y-3">
                    <div class={`p-3.5 rounded-full border ${
                      quizResult.passed 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      <Award class="h-8 w-8" />
                    </div>
                    <div>
                      <h2 class="text-base font-bold text-slate-850">
                        {quizResult.passed ? 'Congratulations, you passed!' : 'Assessment Failed'}
                      </h2>
                      <p class="text-xs text-slate-500 mt-1 font-medium">
                        You scored <span class="font-bold text-slate-700">{quizResult.score}%</span> on this exam. (Requires {quizResult.passingScore}%)
                      </p>
                    </div>

                    {!quizResult.passed && (
                      <button
                        onClick={() => setQuizResult(null)}
                        class="bg-indigo-500 hover:bg-indigo-650 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                      >
                        Retake Exam
                      </button>
                    )}
                  </div>

                  {/* Score details breakdown */}
                  <div class="border-t border-slate-100 pt-5 space-y-4">
                    <h3 class="text-xs font-bold text-slate-600 uppercase tracking-wider">Questions Review</h3>
                    <div class="space-y-3">
                      {quizResult.questions.map((q, idx) => (
                        <div key={idx} class="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 font-semibold">
                          <div class="flex items-start justify-between text-xs gap-2">
                            <span class="font-bold text-slate-700">{idx + 1}. {q.questionText}</span>
                            <span class={`text-[9px] font-extrabold uppercase shrink-0 ${q.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {q.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                            </span>
                          </div>
                          
                          <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-500 mt-2 font-medium">
                            <div>Your Answer: <span class="text-slate-700 font-semibold">{q.options[q.userAnswer] || 'None'}</span></div>
                            <div>Correct Answer: <span class="text-emerald-605 font-bold">{q.options[q.correctAnswer]}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitQuiz} class="space-y-5">
                  {quiz?.questions.map((q, qIndex) => (
                    <div key={q._id} class="bg-white border border-slate-100 p-5 rounded-2xl space-y-3.5 shadow-sm shadow-slate-100/40">
                      <div class="text-xs font-bold text-slate-800 flex items-start space-x-2">
                        <span class="bg-indigo-50 text-indigo-600 border border-indigo-100/50 text-[9px] uppercase font-extrabold tracking-wide px-2 py-0.5 rounded mr-1 inline-block shrink-0 mt-0.5">
                          Q{qIndex + 1}
                        </span>
                        <span>{q.questionText}</span>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {q.options.map((opt, oIndex) => {
                          const selected = quizAnswers[qIndex] === oIndex;
                          return (
                            <button
                              type="button"
                              key={oIndex}
                              onClick={() => selectAnswer(qIndex, oIndex)}
                              class={`p-3 rounded-xl border text-left text-xs transition duration-100 ${
                                selected 
                                  ? 'bg-indigo-500 border-indigo-400 text-white font-semibold shadow-sm shadow-indigo-500/10' 
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600 font-medium'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div class="flex items-center justify-end pt-3">
                    <button
                      type="submit"
                      disabled={submittingQuiz}
                      class="flex items-center space-x-1.5 bg-indigo-500 hover:bg-indigo-650 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/10 transition disabled:opacity-50"
                    >
                      {submittingQuiz && <Loader2 class="h-4 w-4 animate-spin" />}
                      <span>Submit Exam Answers</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;
