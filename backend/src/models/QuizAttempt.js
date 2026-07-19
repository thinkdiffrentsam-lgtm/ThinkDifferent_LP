const mongoose = require('mongoose');

const QuizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  answers: {
    type: [Number], // array of selected indices for each question
    required: true
  },
  score: {
    type: Number, // Percentage scored
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  attemptDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
