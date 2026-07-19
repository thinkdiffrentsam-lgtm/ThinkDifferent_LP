const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Module = require('../models/Module');
const Quiz = require('../models/Quiz');
const CodingTask = require('../models/CodingTask');
const Assignment = require('../models/Assignment');
const Progress = require('../models/Progress');
const { protect, admin } = require('../middleware/auth');

// ==========================================
// COURSE CRUD
// ==========================================

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const courses = await Course.find({}).populate('createdBy', 'name email');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching courses', error: error.message });
  }
});

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('createdBy', 'name email');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Fetch its modules and quizzes
    const modules = await Module.find({ courseId: course._id }).sort('order');
    const quizzes = await Quiz.find({ courseId: course._id });
    const codingTask = await CodingTask.findOne({ courseId: course._id });

    res.json({
      course,
      modules,
      quizzes,
      codingTask
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching course details', error: error.message });
  }
});

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { title, description, thumbnail, isPublished } = req.body;

  try {
    if (!title || !description) {
      return res.status(400).json({ message: 'Please provide course title and description' });
    }

    const course = await Course.create({
      title,
      description,
      thumbnail: thumbnail || '',
      isPublished: isPublished || false,
      createdBy: req.user._id
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating course', error: error.message });
  }
});

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  const { title, description, thumbnail, isPublished } = req.body;

  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.title = title !== undefined ? title : course.title;
    course.description = description !== undefined ? description : course.description;
    course.thumbnail = thumbnail !== undefined ? thumbnail : course.thumbnail;
    course.isPublished = isPublished !== undefined ? isPublished : course.isPublished;

    const updatedCourse = await course.save();
    res.json(updatedCourse);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating course', error: error.message });
  }
});

// @desc    Delete a course (along with its modules and quizzes)
// @route   DELETE /api/courses/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Delete corresponding child data
    await Module.deleteMany({ courseId: course._id });
    await Quiz.deleteMany({ courseId: course._id });
    await CodingTask.deleteMany({ courseId: course._id });
    await Assignment.deleteMany({ courseId: course._id });
    await Progress.deleteMany({ courseId: course._id });

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: 'Course and all associated content deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting course', error: error.message });
  }
});

// ==========================================
// MODULE CRUD (COURSE-SPECIFIC)
// ==========================================

// @desc    Add a module to a course
// @route   POST /api/courses/:courseId/modules
// @access  Private/Admin
router.post('/:courseId/modules', protect, admin, async (req, res) => {
  const { title, description, type, content, order, duration } = req.body;
  const courseId = req.params.courseId;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!title || !type || !content) {
      return res.status(400).json({ message: 'Please provide module title, type, and content' });
    }

    // Determine the next order index if not provided
    let moduleOrder = order;
    if (moduleOrder === undefined) {
      const lastModule = await Module.findOne({ courseId }).sort('-order');
      moduleOrder = lastModule ? lastModule.order + 1 : 1;
    }

    const moduleItem = await Module.create({
      courseId,
      title,
      description: description || '',
      type,
      content,
      order: moduleOrder,
      duration: duration || 0
    });

    res.status(201).json(moduleItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error adding module', error: error.message });
  }
});

// @desc    Update a module
// @route   PUT /api/courses/:courseId/modules/:moduleId
// @access  Private/Admin
router.put('/:courseId/modules/:moduleId', protect, admin, async (req, res) => {
  const { title, description, type, content, order, duration } = req.body;

  try {
    const moduleItem = await Module.findById(req.params.moduleId);
    if (!moduleItem) {
      return res.status(404).json({ message: 'Module not found' });
    }

    moduleItem.title = title !== undefined ? title : moduleItem.title;
    moduleItem.description = description !== undefined ? description : moduleItem.description;
    moduleItem.type = type !== undefined ? type : moduleItem.type;
    moduleItem.content = content !== undefined ? content : moduleItem.content;
    moduleItem.order = order !== undefined ? order : moduleItem.order;
    moduleItem.duration = duration !== undefined ? duration : moduleItem.duration;

    const updatedModule = await moduleItem.save();
    res.json(updatedModule);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating module', error: error.message });
  }
});

// @desc    Delete a module
// @route   DELETE /api/courses/:courseId/modules/:moduleId
// @access  Private/Admin
router.delete('/:courseId/modules/:moduleId', protect, admin, async (req, res) => {
  try {
    const moduleItem = await Module.findById(req.params.moduleId);
    if (!moduleItem) {
      return res.status(404).json({ message: 'Module not found' });
    }

    await Module.findByIdAndDelete(req.params.moduleId);

    // Pull from all user progresses
    await Progress.updateMany(
      { courseId: req.params.courseId },
      { $pull: { completedModules: req.params.moduleId } }
    );

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting module', error: error.message });
  }
});

// ==========================================
// QUIZ CRUD (COURSE-SPECIFIC)
// ==========================================

// @desc    Create or update a quiz for a course
// @route   POST /api/courses/:courseId/quizzes
// @access  Private/Admin
router.post('/:courseId/quizzes', protect, admin, async (req, res) => {
  const { title, questions, passingScore } = req.body;
  const courseId = req.params.courseId;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Please provide quiz title and an array of questions' });
    }

    // Check if a quiz already exists for this course
    let quiz = await Quiz.findOne({ courseId });

    if (quiz) {
      // Update existing
      quiz.title = title;
      quiz.questions = questions;
      quiz.passingScore = passingScore !== undefined ? passingScore : quiz.passingScore;
      await quiz.save();
    } else {
      // Create new
      quiz = await Quiz.create({
        courseId,
        title,
        questions,
        passingScore: passingScore || 70
      });
    }

    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error managing quiz', error: error.message });
  }
});

// @desc    Delete quiz
// @route   DELETE /api/courses/:courseId/quizzes/:quizId
// @access  Private/Admin
router.delete('/:courseId/quizzes/:quizId', protect, admin, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    await Quiz.findByIdAndDelete(req.params.quizId);
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting quiz', error: error.message });
  }
});

// @desc    Create or update a coding task for a course
// @route   POST /api/courses/:courseId/coding-task
// @access  Private/Admin
router.post('/:courseId/coding-task', protect, admin, async (req, res) => {
  const { title, description, starterCodeUrl } = req.body;
  const courseId = req.params.courseId;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!title || !description) {
      return res.status(400).json({ message: 'Please provide coding task title and description' });
    }

    let codingTask = await CodingTask.findOne({ courseId });

    if (codingTask) {
      codingTask.title = title;
      codingTask.description = description;
      codingTask.starterCodeUrl = starterCodeUrl !== undefined ? starterCodeUrl : codingTask.starterCodeUrl;
      await codingTask.save();
    } else {
      codingTask = await CodingTask.create({
        courseId,
        title,
        description,
        starterCodeUrl: starterCodeUrl || ''
      });
    }

    res.status(201).json(codingTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error managing coding task', error: error.message });
  }
});

// @desc    Delete coding task
// @route   DELETE /api/courses/:courseId/coding-task
// @access  Private/Admin
router.delete('/:courseId/coding-task', protect, admin, async (req, res) => {
  try {
    const codingTask = await CodingTask.findOne({ courseId: req.params.courseId });
    if (!codingTask) {
      return res.status(404).json({ message: 'Coding Task not found' });
    }

    await CodingTask.findByIdAndDelete(codingTask._id);
    res.json({ message: 'Coding Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting coding task', error: error.message });
  }
});

module.exports = router;
