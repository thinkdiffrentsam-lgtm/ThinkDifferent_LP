const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
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
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['video', 'pdf', 'link', 'text'],
    required: true
  },
  content: {
    type: String,
    required: true // Can be a Video URL, PDF link, URL, or plain HTML/markdown text
  },
  order: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Module', ModuleSchema);
