const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['assigned', 'in-progress', 'completed'],
    default: 'assigned'
  },
  completedDate: {
    type: Date
  }
});

// Avoid duplicate assignments
AssignmentSchema.index({ courseId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);
