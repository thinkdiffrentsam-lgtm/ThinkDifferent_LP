const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const Progress = require('../models/Progress');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

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
        profilePicture: user.profilePicture,
        preferences: user.preferences,
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
      profilePicture: user.profilePicture,
      preferences: user.preferences,
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

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.profilePicture = req.body.profilePicture !== undefined ? req.body.profilePicture : user.profilePicture;
    
    if (req.body.preferences) {
      user.preferences = {
        ...user.preferences,
        ...req.body.preferences
      };
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department,
      designation: updatedUser.designation,
      profilePicture: updatedUser.profilePicture,
      preferences: updatedUser.preferences,
      token: generateToken(updatedUser._id) // optionally issue a new token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid current password' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating password' });
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



// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'There is no user with that email address.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the OTP before saving to DB
    const salt = await bcrypt.genSalt(10);
    user.resetPasswordOtp = await bcrypt.hash(otp, salt);
    // OTP expires in 15 mins
    user.resetPasswordOtpExpires = Date.now() + 15 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Send email
    const message = `Your password reset code is: ${otp}\n\nThis code is valid for 15 minutes.`;

    try {
      if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com') {
        // Fallback for local testing without SMTP configured
        console.log(`[DEVELOPMENT MODE] OTP for ${email} is: ${otp}`);
        return res.status(200).json({ message: 'OTP sent (Check server console since SMTP is not configured).' });
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f6f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 550px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- BRAND BANNER HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); padding: 8px 16px; border-radius: 12px; margin-bottom: 8px; border: 1px solid rgba(255, 255, 255, 0.2);">
                <span style="font-size: 20px; vertical-align: middle;">💡</span>
                <span style="font-size: 18px; font-weight: 800; color: #ffffff; vertical-align: middle; margin-left: 6px;">ThinkDifferent <span style="color: #a5b4fc;">LP</span></span>
              </div>
              <div style="color: #c7d2fe; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                SECURITY AUTHENTICATION
              </div>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding: 32px; color: #334155; font-size: 15px; text-align: center;">
              <h2 style="margin-top: 0; color: #1e293b; font-size: 18px; font-weight: 800;">Password Reset Verification</h2>
              <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">
                Use the following 6-digit Security OTP code to reset your account password. This code will expire in <strong>15 minutes</strong>.
              </p>

              <!-- OTP CODE BOX -->
              <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 18px; display: inline-block; margin-bottom: 24px;">
                <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #4338ca;">
                  ${otp}
                </span>
              </div>

              <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                If you did not request a password reset, please ignore this message.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
              &copy; 2026 ThinkDifferent LMS. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await sendEmail({
        email: user.email,
        subject: 'Password Reset OTP',
        message,
        html
      });

      res.status(200).json({ message: 'OTP sent to email' });
    } catch (err) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'Email could not be sent. Check SMTP config.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error processing request.' });
  }
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({
      email,
      resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'OTP is invalid or has expired' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ message: 'OTP is invalid' });
    }

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error verifying OTP.' });
  }
});

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    
    // We re-verify the OTP here just in case someone tries to bypass the verify step
    const user = await User.findOne({
      email,
      resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'OTP is invalid or has expired' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ message: 'OTP is invalid' });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Clear OTP fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error resetting password.' });
  }
});

module.exports = router;
