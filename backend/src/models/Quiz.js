const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    required: true,
    validate: [arr => arr.length >= 2, 'A question must have at least 2 options.']
  },
  correctOptionIndex: {
    type: Number,
    required: true
  },
  points: {
    type: Number,
    default: 10
  }
});

const QuizSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  questions: [QuestionSchema],
  passingScore: {
    type: Number, // Percentage, e.g. 70 for 70%
    default: 70
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Quiz', QuizSchema);
