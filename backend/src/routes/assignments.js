const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Progress = require('../models/Progress');
const User = require('../models/User');
const Course = require('../models/Course');
const { protect, admin } = require('../middleware/auth');

// @desc    Get assignments (Admin gets all, Employee gets their own)
// @route   GET /api/assignments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const assignments = await Assignment.find({})
        .populate('courseId', 'title description thumbnail')
        .populate('userId', 'name email department designation')
        .populate('assignedBy', 'name email');
      return res.json(assignments);
    } else {
      const assignments = await Assignment.find({ userId: req.user._id })
        .populate('courseId', 'title description thumbnail')
        .populate('assignedBy', 'name email');
      return res.json(assignments);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching assignments', error: error.message });
  }
});

// @desc    Assign a course to users or a whole department
// @route   POST /api/assignments
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { courseId, userIds, department, dueDate } = req.body;

  try {
    if (!courseId) {
      return res.status(400).json({ message: 'Please provide courseId' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    let targetUserIds = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Direct array of users
      targetUserIds = userIds;
    } else if (department) {
      // Select all employees in the department
      const usersInDept = await User.find({ role: 'employee', department }).select('_id');
      targetUserIds = usersInDept.map(u => u._id.toString());
    } else {
      return res.status(400).json({ message: 'Please provide either userIds list or department' });
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ message: 'No target employees found for assignment' });
    }

    const results = [];
    for (const uId of targetUserIds) {
      // Check if already assigned
      const existing = await Assignment.findOne({ courseId, userId: uId });
      if (existing) {
        continue;
      }

      // Create Assignment
      const newAssignment = await Assignment.create({
        courseId,
        userId: uId,
        assignedBy: req.user._id,
        dueDate: dueDate || null,
        status: 'assigned'
      });

      // Ensure Progress record exists
      const progressExists = await Progress.findOne({ courseId, userId: uId });
      if (!progressExists) {
        await Progress.create({
          userId: uId,
          courseId,
          completedModules: [],
          status: 'not-started',
          percentage: 0
        });
      }

      results.push(newAssignment);
    }

    res.status(201).json({
      message: `Course assigned to ${results.length} user(s).`,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error assigning course', error: error.message });
  }
});

// @desc    Delete an assignment (Unassign course)
// @route   DELETE /api/assignments/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Delete assignment
    await Assignment.findByIdAndDelete(req.params.id);

    // Note: We keep the Progress record in case they restart or want historical progress, 
    // or we delete it. Let's keep it but delete the assignment. Actually, let's keep progress for records.
    
    res.json({ message: 'Assignment removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error removing assignment', error: error.message });
  }
});

module.exports = router;
