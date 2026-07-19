const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const CodingTask = require('../models/CodingTask');
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
    const codingTask = await CodingTask.findOne({ courseId }); // 1 coding task per course
    const progress = await Progress.findOne({ userId: req.user._id, courseId }) || { completedModules: [], taskSubmissions: [], codingTaskSubmission: null, status: 'not-started', percentage: 0 };

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
        taskSubmissions: progress.taskSubmissions || [],
        codingTaskSubmission: progress.codingTaskSubmission || null,
        status: progress.status,
        percentage: progress.percentage,
        completedDate: assignment.completedDate
      },
      quizAttempts,
      codingTask
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

    // Check if overall course is completed
    if (progress.percentage === 100) {
      const quiz = await Quiz.findOne({ courseId });
      const codingTask = await CodingTask.findOne({ courseId });
      
      let quizPassed = true;
      if (quiz) {
        const passedQuiz = await QuizAttempt.findOne({ userId: req.user._id, quizId: quiz._id, passed: true });
        quizPassed = !!passedQuiz;
      }

      let codingTaskPassed = true;
      if (codingTask) {
        codingTaskPassed = progress.codingTaskSubmission?.status === 'working';
      }

      if (quizPassed && codingTaskPassed) {
        progress.status = 'completed';
        assignment.status = 'completed';
        assignment.completedDate = new Date();
      } else {
        progress.status = 'in-progress';
        assignment.status = 'in-progress';
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

// @desc    Submit GitHub task link for a module
// @route   POST /api/employee/courses/:courseId/modules/:moduleId/submit-task
// @access  Private/Employee
router.post('/courses/:courseId/modules/:moduleId/submit-task', protect, employee, async (req, res) => {
  const { courseId, moduleId } = req.params;
  const { githubLink } = req.body;

  try {
    if (!githubLink) {
      return res.status(400).json({ message: 'GitHub link is required' });
    }

    // 1. Verify module and assignment
    const moduleItem = await Module.findById(moduleId);
    if (!moduleItem || moduleItem.type !== 'task') {
      return res.status(404).json({ message: 'Task module not found' });
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
        taskSubmissions: [],
        status: 'in-progress',
        percentage: 0
      });
    }

    // 3. Check if already submitted and update or push new submission
    const existingSubmissionIndex = progress.taskSubmissions.findIndex(sub => sub.moduleId.toString() === moduleId);
    if (existingSubmissionIndex !== -1) {
      progress.taskSubmissions[existingSubmissionIndex].githubLink = githubLink;
      progress.taskSubmissions[existingSubmissionIndex].submittedAt = new Date();
    } else {
      progress.taskSubmissions.push({
        moduleId,
        githubLink,
        submittedAt: new Date()
      });
    }

    // 4. Mark module as complete if it isn't already
    const isCompleted = progress.completedModules.includes(moduleId);
    if (!isCompleted) {
      progress.completedModules.push(moduleId);
    }

    // 5. Update percentage
    const totalModules = await Module.countDocuments({ courseId });
    progress.percentage = totalModules > 0 ? Math.round((progress.completedModules.length / totalModules) * 100) : 100;

    // Check if overall course is completed
    if (progress.percentage === 100) {
      const quiz = await Quiz.findOne({ courseId });
      const codingTask = await CodingTask.findOne({ courseId });
      
      let quizPassed = true;
      if (quiz) {
        const passedQuiz = await QuizAttempt.findOne({ userId: req.user._id, quizId: quiz._id, passed: true });
        quizPassed = !!passedQuiz;
      }

      let codingTaskPassed = true;
      if (codingTask) {
        codingTaskPassed = !!progress.codingTaskSubmission?.fileUrl;
      }

      if (quizPassed && codingTaskPassed) {
        progress.status = 'completed';
        assignment.status = 'completed';
        assignment.completedDate = new Date();
      } else {
        progress.status = 'in-progress';
        assignment.status = 'in-progress';
      }
    } else {
      progress.status = 'in-progress';
      assignment.status = 'in-progress';
    }

    progress.lastAccessed = new Date();
    await progress.save();
    await assignment.save();

    res.json({
      message: 'Task submitted successfully',
      completedModules: progress.completedModules,
      percentage: progress.percentage,
      status: progress.status,
      taskSubmissions: progress.taskSubmissions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error submitting task', error: error.message });
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
        
    // Check if overall course is completed
    if (progress.percentage === 100) {
      const quiz = await Quiz.findOne({ courseId });
      const codingTask = await CodingTask.findOne({ courseId });
      
      let quizPassed = true;
      if (quiz) {
        const passedQuiz = await QuizAttempt.findOne({ userId: req.user._id, quizId: quiz._id, passed: true });
        quizPassed = !!passedQuiz;
      }

      let codingTaskPassed = true;
      if (codingTask) {
        codingTaskPassed = !!progress.codingTaskSubmission?.fileUrl;
      }

      if (quizPassed && codingTaskPassed) {
        progress.status = 'completed';
        assignment.status = 'completed';
        assignment.completedDate = new Date();
      } else {
        progress.status = 'in-progress';
        assignment.status = 'in-progress';
      }
    } else {
      progress.status = 'in-progress';
      assignment.status = 'in-progress';
    }

        await progress.save();
        await assignment.save();
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

// @desc    Submit github link for course coding task
// @route   POST /api/employee/courses/:courseId/submit-coding-task
// @access  Private/Employee
router.post('/courses/:courseId/submit-coding-task', protect, employee, async (req, res) => {
  const courseId = req.params.courseId;
  const { githubLink, employeeMessage } = req.body;

  try {
    if (!githubLink) {
      return res.status(400).json({ message: 'GitHub link is required' });
    }

    const codingTask = await CodingTask.findOne({ courseId });
    if (!codingTask) {
      return res.status(404).json({ message: 'Coding Task not found for this course' });
    }

    const assignment = await Assignment.findOne({ userId: req.user._id, courseId });
    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this course' });
    }

    let progress = await Progress.findOne({ userId: req.user._id, courseId });
    if (!progress) {
      progress = await Progress.create({
        userId: req.user._id,
        courseId,
        completedModules: [],
        taskSubmissions: [],
        status: 'in-progress',
        percentage: 0
      });
    }

    progress.codingTaskSubmission = {
      githubLink,
      employeeMessage,
      submittedAt: new Date(),
      status: 'pending',
      feedback: ''
    };

    // Check if overall course is completed
    if (progress.percentage === 100) {
      const quiz = await Quiz.findOne({ courseId });
      
      let quizPassed = true;
      if (quiz) {
        const passedQuiz = await QuizAttempt.findOne({ userId: req.user._id, quizId: quiz._id, passed: true });
        quizPassed = !!passedQuiz;
      }

      if (quizPassed && progress.codingTaskSubmission?.status === 'working') {
        progress.status = 'completed';
        assignment.status = 'completed';
        assignment.completedDate = new Date();
      } else {
        progress.status = 'in-progress';
        assignment.status = 'in-progress';
      }
    } else {
      progress.status = 'in-progress';
      assignment.status = 'in-progress';
    }

    progress.lastAccessed = new Date();
    await progress.save();
    await assignment.save();

    res.json({
      message: 'Coding Task submitted successfully',
      codingTaskSubmission: progress.codingTaskSubmission,
      status: progress.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error submitting coding task', error: error.message });
  }
});

// @desc    Delete coding task submission
// @route   DELETE /api/employee/courses/:courseId/coding-task
// @access  Private/Employee
router.delete('/courses/:courseId/coding-task', protect, employee, async (req, res) => {
  const courseId = req.params.courseId;
  try {
    const progress = await Progress.findOne({ userId: req.user._id, courseId });
    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    progress.codingTaskSubmission = undefined;
    await progress.save();

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting coding task submission', error: error.message });
  }
});

module.exports = router;
