const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const Progress = require('../models/Progress');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_lms_key_12345', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (for initial setup and ease of EMS integration testing)
router.post('/register', async (req, res) => {
  const { name, email, password, role, department, designation } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'employee',
      department: department || 'General',
      designation: designation || 'Staff Member'
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    // Check for user email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user details' });
  }
});

// @desc    Get list of employees (for assignment screen)
// @route   GET /api/auth/employees
// @access  Private/Admin
router.get('/employees', protect, async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' }).select('-password');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching employees list' });
  }
});

// @desc    Update employee details
// @route   PUT /api/auth/employees/:id
// @access  Private/Admin
router.put('/employees/:id', protect, async (req, res) => {
  try {
    const { name, email, department, designation, password } = req.body;
    
    // Prevent modifying admin accounts via this endpoint
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) return res.status(404).json({ message: 'User not found' });
    if (userToUpdate.role === 'admin') {
      return res.status(400).json({ message: 'Cannot modify admin users from this endpoint' });
    }

    userToUpdate.name = name || userToUpdate.name;
    userToUpdate.email = email || userToUpdate.email;
    userToUpdate.department = department || userToUpdate.department;
    userToUpdate.designation = designation || userToUpdate.designation;

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      userToUpdate.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await userToUpdate.save();
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating employee' });
  }
});

// @desc    Delete employee and related data
// @route   DELETE /api/auth/employees/:id
// @access  Private/Admin
router.delete('/employees/:id', protect, async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) return res.status(404).json({ message: 'User not found' });
    if (userToDelete.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin users from this endpoint' });
    }

    // Delete related assignments and progress to prevent orphaned data
    await Assignment.deleteMany({ userId: req.params.id });
    await Progress.deleteMany({ userId: req.params.id });
    
    // Delete the user
    await userToDelete.deleteOne();

    res.json({ message: 'Employee and all associated learning data deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting employee' });
  }
});

module.exports = router;
