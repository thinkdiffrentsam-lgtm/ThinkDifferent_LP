const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const { protect, employee } = require('../middleware/auth');

// @desc    Get courses assigned to the logged-in employee
// @route   GET /api/employee/courses
// @access  Private/Employee
router.get('/courses', protect, employee, async (req, res) => {
  try {
    // 1. Find assignments for this user
    const assignments = await Assignment.find({ userId: req.user._id })
      .populate({
        path: 'courseId',
        select: 'title description thumbnail isPublished'
      });

    // Filter assignments where the course actually exists and is published
    const activeAssignments = assignments.filter(a => a.courseId && a.courseId.isPublished);

    // 2. Fetch progress for each active assignment
    const enrichedCourses = [];
    for (const assign of activeAssignments) {
      const course = assign.courseId;
      
      // Get progress
      let progress = await Progress.findOne({ userId: req.user._id, courseId: course._id });
      if (!progress) {
        progress = await Progress.create({
          userId: req.user._id,
          courseId: course._id,
          completedModules: [],
          status: 'not-started',
          percentage: 0
        });
      }

      // Count modules
      const totalModules = await Module.countDocuments({ courseId: course._id });
      const totalQuizzes = await Quiz.countDocuments({ courseId: course._id });

      enrichedCourses.push({
        assignmentId: assign._id,
        courseId: course._id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        dueDate: assign.dueDate,
        assignedDate: assign.assignedDate,
        assignmentStatus: assign.status,
        completedDate: assign.completedDate,
        progressStatus: progress.status,
        percentage: progress.percentage,
        completedModulesCount: progress.completedModules.length,
        totalModulesCount: totalModules,
        hasQuiz: totalQuizzes > 0
      });
    }

    res.json(enrichedCourses);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching assigned courses', error: error.message });
  }
});

// @desc    Get specific assigned course modules & quiz details with completion flags
// @route   GET /api/employee/courses/:courseId
// @access  Private/Employee
router.get('/courses/:courseId', protect, employee, async (req, res) => {
  const courseId = req.params.courseId;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify assignment
    const assignment = await Assignment.findOne({ userId: req.user._id, courseId });
    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this course' });
    }

    const modules = await Module.find({ courseId }).sort('order');
    const quiz = await Quiz.findOne({ courseId }); // Supports 1 quiz per course
    const progress = await Progress.findOne({ userId: req.user._id, courseId }) || { completedModules: [], status: 'not-started', percentage: 0 };

    // Fetch quiz attempts if quiz exists
    let quizAttempts = [];
    if (quiz) {
      quizAttempts = await QuizAttempt.find({ userId: req.user._id, quizId: quiz._id }).sort('-attemptDate');
    }

    res.json({
      course,
      modules,
      quiz: quiz ? {
        _id: quiz._id,
        title: quiz.title,
        passingScore: quiz.passingScore,
        questionsCount: quiz.questions.length,
        // Hide correct option indexes from user
        questions: quiz.questions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          points: q.points
        }))
      } : null,
      progress: {
        completedModules: progress.completedModules,
        status: progress.status,
        percentage: progress.percentage,
        completedDate: assignment.completedDate
      },
      quizAttempts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error loading course player details', error: error.message });
  }
});

// @desc    Toggle module completion status
// @route   POST /api/employee/courses/:courseId/modules/:moduleId/complete
// @access  Private/Employee
router.post('/courses/:courseId/modules/:moduleId/complete', protect, employee, async (req, res) => {
  const { courseId, moduleId } = req.params;

  try {
    // 1. Verify module and assignment
    const moduleItem = await Module.findById(moduleId);
    if (!moduleItem) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const assignment = await Assignment.findOne({ userId: req.user._id, courseId });
    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this course' });
    }

    // 2. Find or create progress record
    let progress = await Progress.findOne({ userId: req.user._id, courseId });
    if (!progress) {
      progress = await Progress.create({
        userId: req.user._id,
        courseId,
        completedModules: [],
        status: 'in-progress',
        percentage: 0
      });
    }

    // 3. Toggle completion
    const isCompleted = progress.completedModules.includes(moduleId);
    if (isCompleted) {
      // Unmark complete
      progress.completedModules = progress.completedModules.filter(id => id.toString() !== moduleId);
    } else {
      // Mark complete
      progress.completedModules.push(moduleId);
    }

    // 4. Update percentage
    const totalModules = await Module.countDocuments({ courseId });
    progress.percentage = totalModules > 0 ? Math.round((progress.completedModules.length / totalModules) * 100) : 100;

    // Check if overall course is completed (we also look at quizzes, but modules completion is the core metric)
    if (progress.percentage === 100) {
      // Check if a quiz exists
      const quiz = await Quiz.findOne({ courseId });
      if (quiz) {
        // If there's a quiz, user must pass the quiz to fully mark course completed.
        // Let's check if they passed it.
        const passedQuiz = await QuizAttempt.findOne({ userId: req.user._id, quizId: quiz._id, passed: true });
        if (passedQuiz) {
          progress.status = 'completed';
          assignment.status = 'completed';
          assignment.completedDate = new Date();
        } else {
          progress.status = 'in-progress'; // modules done, but quiz pending/failed
          assignment.status = 'in-progress';
        }
      } else {
        progress.status = 'completed';
        assignment.status = 'completed';
        assignment.completedDate = new Date();
      }
    } else {
      progress.status = 'in-progress';
      assignment.status = 'in-progress';
    }

    progress.lastAccessed = new Date();
    await progress.save();
    await assignment.save();

    res.json({
      message: isCompleted ? 'Module marked incomplete' : 'Module marked complete',
      completedModules: progress.completedModules,
      percentage: progress.percentage,
      status: progress.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating module completion status', error: error.message });
  }
});

// @desc    Submit answers for course quiz & auto-grade
// @route   POST /api/employee/quizzes/:quizId/submit
// @access  Private/Employee
router.post('/quizzes/:quizId/submit', protect, employee, async (req, res) => {
  const { answers } = req.body; // Array of selected option indices corresponding to quiz questions
  const quizId = req.params.quizId;

  try {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (!answers || !Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({ message: 'Please submit answers for all questions' });
    }

    // Auto grading
    let correctCount = 0;
    const questionsResponse = quiz.questions.map((q, idx) => {
      const userAnswer = answers[idx];
      const isCorrect = q.correctOptionIndex === userAnswer;
      if (isCorrect) {
        correctCount++;
      }
      return {
        questionText: q.questionText,
        options: q.options,
        userAnswer,
        correctAnswer: q.correctOptionIndex,
        isCorrect
      };
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    // Save Attempt
    const attempt = await QuizAttempt.create({
      userId: req.user._id,
      quizId,
      answers,
      score,
      passed
    });

    // Update course progress and assignment status if passed
    if (passed) {
      const courseId = quiz.courseId;
      const progress = await Progress.findOne({ userId: req.user._id, courseId });
      const assignment = await Assignment.findOne({ userId: req.user._id, courseId });

      if (progress && assignment) {
        const totalModules = await Module.countDocuments({ courseId });
        const allModulesDone = progress.completedModules.length === totalModules;
        
        if (allModulesDone) {
          progress.status = 'completed';
          assignment.status = 'completed';
          assignment.completedDate = new Date();
          
          await progress.save();
          await assignment.save();
        }
      }
    }

    res.json({
      attemptId: attempt._id,
      score,
      passed,
      passingScore: quiz.passingScore,
      correctCount,
      totalQuestions: quiz.questions.length,
      questions: questionsResponse
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error submitting quiz', error: error.message });
  }
});

module.exports = router;
