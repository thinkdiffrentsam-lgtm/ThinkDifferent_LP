const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  completedModules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  }],
  taskSubmissions: [{
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
    githubLink: { type: String },
    submittedAt: { type: Date, default: Date.now }
  }],
  codingTaskSubmission: {
    githubLink: { type: String },
    employeeMessage: { type: String },
    status: { type: String, enum: ['pending', 'working', 'not-working'], default: 'pending' },
    feedback: { type: String },
    submittedAt: { type: Date }
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  percentage: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
});

// Unique index per user + course
ProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', ProgressSchema);
