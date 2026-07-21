import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Award, ArrowLeft, Printer, CheckCircle } from 'lucide-react';

const Certificate = () => {
  const { courseId } = useParams();
  const { user } = useContext(AuthContext);
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCertificateData = async () => {
      try {
        const res = await api.get(`/api/employee/courses/${courseId}`);
        setCourse(res.data.course);
        setProgress(res.data.progress);
        
        if (res.data.progress.status !== 'completed') {
          setError('This course has not been completed yet.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load certificate data.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCertificateData();
  }, [courseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center space-y-4">
        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-6 rounded-2xl max-w-md text-center shadow-sm">
          <h2 className="text-lg font-bold mb-2">Certificate Unavailable</h2>
          <p className="text-sm font-medium">{error}</p>
        </div>
        <Link to={`/employee/courses/${courseId}`} className="text-indigo-600 font-bold hover:underline flex items-center text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Return to Course
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4 print:p-0 print:bg-white">
      {/* Non-printable controls */}
      <div className="w-full max-w-[1056px] flex items-center justify-between mb-6 print:hidden">
        <Link to={`/employee/courses/${courseId}`} className="flex items-center text-slate-500 hover:text-indigo-600 font-bold text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 transition">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Course
        </Link>
        <button 
          onClick={handlePrint}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition"
        >
          <Printer className="h-4 w-4 mr-2" /> Print / Save as PDF
        </button>
      </div>

      {/* Certificate Container (A4 Landscape aspect ratio roughly 1.414) */}
      <div className="relative bg-white w-full max-w-[1056px] aspect-[1.414/1] shadow-2xl rounded-sm border-[12px] border-slate-900 overflow-hidden flex flex-col items-center justify-center p-12 print:border-none print:shadow-none print:w-screen print:h-screen print:max-w-none print:aspect-auto">
        
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full border-[8px] border-indigo-100 m-3 z-0 rounded-sm pointer-events-none print:border-4 print:border-indigo-100 print:m-8"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-60 z-0"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-60 z-0"></div>

        {/* Certificate Content */}
        <div className="relative z-10 flex flex-col items-center text-center w-full">
          <div className="mb-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-600/30">
            <Award className="h-12 w-12" />
          </div>

          <h3 className="text-sm font-extrabold text-indigo-600 uppercase tracking-[0.3em] mb-4">
            Certificate of Completion
          </h3>
          
          <h1 className="text-5xl md:text-6xl font-serif text-slate-900 mb-8 italic">
            ThinkDifferent LP
          </h1>

          <p className="text-slate-500 font-medium tracking-widest uppercase text-sm mb-4">
            This is to certify that
          </p>

          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-6 pb-2 border-b-2 border-slate-200 inline-block px-12">
            {user.name}
          </h2>

          <p className="text-slate-500 font-medium tracking-widest uppercase text-sm mb-4">
            has successfully completed the course
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 mb-12 max-w-3xl">
            "{course?.title}"
          </h2>

          {/* Footer Signatures */}
          <div className="flex w-full max-w-2xl justify-between items-end mt-8">
            <div className="flex flex-col items-center">
              <div className="h-12 border-b border-slate-300 w-48 mb-2 flex items-end justify-center">
                <span className="font-['Brush_Script_MT',cursive] text-2xl text-slate-700">A. Administrator</span>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Instructor</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-emerald-50 text-emerald-600 p-2 rounded-full mb-3 border border-emerald-100">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="h-6 border-b border-slate-300 w-48 mb-2 flex items-center justify-center text-sm font-bold text-slate-700">
                {progress?.completedDate ? new Date(progress.completedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Awarded</span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
        }
      `}} />
    </div>
  );
};

export default Certificate;
