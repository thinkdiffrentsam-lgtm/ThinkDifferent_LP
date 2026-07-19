const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const { protect, admin } = require('../middleware/auth');

// @desc    Get dashboard metrics summary
// @route   GET /api/reports/dashboard
// @access  Private/Admin
router.get('/dashboard', protect, admin, async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const totalEmployees = await User.countDocuments({ role: 'employee' });
    const totalAssignments = await Assignment.countDocuments();
    const completedAssignments = await Assignment.countDocuments({ status: 'completed' });
    
    // Average completion percentage across all courses
    const allProgress = await Progress.find({});
    const avgPercentage = allProgress.length > 0
      ? Math.round(allProgress.reduce((sum, p) => sum + p.percentage, 0) / allProgress.length)
      : 0;

    // Course status counts
    const coursesStats = await Course.aggregate([
      {
        $lookup: {
          from: 'assignments',
          localField: '_id',
          foreignField: 'courseId',
          as: 'assigns'
        }
      },
      {
        $project: {
          title: 1,
          totalAssigned: { $size: '$assigns' },
          completions: {
            $size: {
              $filter: {
                input: '$assigns',
                as: 'a',
                cond: { $eq: ['$$a.status', 'completed'] }
              }
            }
          }
        }
      }
    ]);

    // Department breakdown of employees
    const departmentStats = await User.aggregate([
      { $match: { role: 'employee' } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      summary: {
        totalCourses,
        totalEmployees,
        totalAssignments,
        completedAssignments,
        completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
        averageProgress: avgPercentage
      },
      coursesStats,
      departmentStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error loading dashboard statistics', error: error.message });
  }
});

// @desc    Get detailed progress report for all assignments
// @route   GET /api/reports/progress
// @access  Private/Admin
router.get('/progress', protect, admin, async (req, res) => {
  try {
    const assignments = await Assignment.find({})
      .populate('courseId', 'title')
      .populate('userId', 'name email department designation')
      .sort('-assignedDate');

    const progressReports = [];
    for (const assign of assignments) {
      if (!assign.userId || !assign.courseId) continue;
      
      const progress = await Progress.findOne({
        userId: assign.userId._id,
        courseId: assign.courseId._id
      });

      progressReports.push({
        assignmentId: assign._id,
        employeeName: assign.userId.name,
        employeeEmail: assign.userId.email,
        department: assign.userId.department,
        designation: assign.userId.designation,
        courseTitle: assign.courseId.title,
        status: assign.status,
        percentage: progress ? progress.percentage : 0,
        assignedDate: assign.assignedDate,
        completedDate: assign.completedDate || null
      });
    }

    res.json(progressReports);
  } catch (error) {
    res.status(500).json({ message: 'Server error loading progress reports', error: error.message });
  }
});

// @desc    Get detailed quiz scores report
// @route   GET /api/reports/quiz-attempts
// @access  Private/Admin
router.get('/quiz-attempts', protect, admin, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({})
      .populate('userId', 'name email department')
      .populate({
        path: 'quizId',
        select: 'title courseId',
        populate: { path: 'courseId', select: 'title' }
      })
      .sort('-attemptDate');

    const attemptsFormatted = attempts.map(attempt => {
      if (!attempt.userId || !attempt.quizId) return null;
      return {
        attemptId: attempt._id,
        employeeName: attempt.userId.name,
        employeeEmail: attempt.userId.email,
        department: attempt.userId.department,
        quizTitle: attempt.quizId.title,
        courseTitle: attempt.quizId.courseId ? attempt.quizId.courseId.title : 'Deleted Course',
        score: attempt.score,
        passed: attempt.passed,
        attemptDate: attempt.attemptDate
      };
    }).filter(a => a !== null);

    res.json(attemptsFormatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error loading quiz attempts report', error: error.message });
  }
});

// @desc    Get detailed coding task submissions report
// @route   GET /api/reports/coding-tasks
// @access  Private/Admin
router.get('/coding-tasks', protect, admin, async (req, res) => {
  try {
    const progressDocs = await Progress.find({ 'codingTaskSubmission.githubLink': { $exists: true, $ne: '' } })
      .populate('userId', 'name email department')
      .populate('courseId', 'title');

    const codingTasksFormatted = progressDocs.map(progress => {
      if (!progress.userId || !progress.courseId) return null;
      return {
        progressId: progress._id,
        employeeName: progress.userId.name,
        employeeEmail: progress.userId.email,
        department: progress.userId.department,
        courseTitle: progress.courseId.title,
        githubLink: progress.codingTaskSubmission.githubLink,
        employeeMessage: progress.codingTaskSubmission.employeeMessage || '',
        status: progress.codingTaskSubmission.status || 'pending',
        feedback: progress.codingTaskSubmission.feedback || '',
        submittedAt: progress.codingTaskSubmission.submittedAt
      };
    }).filter(a => a !== null);

    res.json(codingTasksFormatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error loading coding task submissions', error: error.message });
  }
});

// @desc    Submit feedback and status for a coding task
// @route   POST /api/reports/coding-tasks/:progressId/feedback
// @access  Private/Admin
router.post('/coding-tasks/:progressId/feedback', protect, admin, async (req, res) => {
  const { status, feedback } = req.body;
  try {
    const progress = await Progress.findById(req.params.progressId);
    if (!progress) {
      return res.status(404).json({ message: 'Progress record not found' });
    }
    
    progress.codingTaskSubmission.status = status;
    progress.codingTaskSubmission.feedback = feedback;
    
    // If the admin marks it as working, check if the overall course should be completed
    if (progress.percentage === 100) {
      const { Assignment, Quiz, QuizAttempt } = require('../models'); // might need to import these if not already imported
      // wait, they are not imported at the top of reports.js! Let's just use mongoose.model
      const AssignmentModel = require('../models/Assignment');
      const QuizModel = require('../models/Quiz');
      const QuizAttemptModel = require('../models/QuizAttempt');

      const quiz = await QuizModel.findOne({ courseId: progress.courseId });
      let quizPassed = true;
      if (quiz) {
        const passedQuiz = await QuizAttemptModel.findOne({ userId: progress.userId, quizId: quiz._id, passed: true });
        quizPassed = !!passedQuiz;
      }

      if (quizPassed && status === 'working') {
        progress.status = 'completed';
        await AssignmentModel.findOneAndUpdate(
          { userId: progress.userId, courseId: progress.courseId },
          { status: 'completed', completedDate: new Date() }
        );
      } else {
        progress.status = 'in-progress';
        await AssignmentModel.findOneAndUpdate(
          { userId: progress.userId, courseId: progress.courseId },
          { status: 'in-progress' }
        );
      }
    }

    await progress.save();
    
    res.json({ message: 'Feedback saved successfully', codingTaskSubmission: progress.codingTaskSubmission });
  } catch (error) {
    res.status(500).json({ message: 'Server error saving feedback', error: error.message });
  }
});

module.exports = router;
