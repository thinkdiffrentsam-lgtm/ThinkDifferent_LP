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

module.exports = router;
