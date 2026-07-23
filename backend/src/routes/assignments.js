const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Progress = require('../models/Progress');
const User = require('../models/User');
const Course = require('../models/Course');
const { protect, admin } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

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
    const assignedUsers = [];

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

      // Fetch user details for notification
      const userObj = await User.findById(uId).select('name email');
      if (userObj && userObj.email) {
        assignedUsers.push(userObj);
      }
    }

    // Dispatch email notifications to assigned users
    if (assignedUsers.length > 0) {
      const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'No specific due date';

      let rawClientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://think-different-lp-lqg6.vercel.app';
      rawClientUrl = rawClientUrl.trim();
      if (rawClientUrl.includes('https://') && rawClientUrl.startsWith('http://localhost:3000')) {
        rawClientUrl = rawClientUrl.replace('http://localhost:3000', '');
      }
      if (!rawClientUrl.startsWith('http://') && !rawClientUrl.startsWith('https://')) {
        rawClientUrl = `https://${rawClientUrl}`;
      }
      rawClientUrl = rawClientUrl.replace(/\/$/, '');
      const courseDashboardUrl = rawClientUrl.endsWith('/employee/my-courses')
        ? rawClientUrl
        : `${rawClientUrl}/employee/my-courses`;

      for (const userObj of assignedUsers) {
        try {
          const subject = `New Course Assigned: ${course.title}`;
          const message = `Hello ${userObj.name},\n\nYou have been assigned a new course: "${course.title}".\nDue Date: ${formattedDueDate}\n\nPlease access your course dashboard at: ${courseDashboardUrl}\n\nBest regards,\nThinkDifferent LMS Admin Team`;

          const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Course Assigned</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f6f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- BRAND HEADER BANNER -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 36px 30px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); padding: 10px 18px; border-radius: 12px; margin-bottom: 10px; border: 1px solid rgba(255, 255, 255, 0.2);">
                      <span style="font-size: 22px; vertical-align: middle;">💡</span>
                      <span style="font-size: 20px; font-weight: 800; color: #ffffff; vertical-align: middle; margin-left: 8px;">ThinkDifferent <span style="color: #a5b4fc;">LP</span></span>
                    </div>
                    <div style="color: #c7d2fe; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                      ENTERPRISE LEARNING MANAGEMENT
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO BANNER RIBBON -->
          <tr>
            <td style="background-color: #eef2ff; padding: 12px 30px; border-bottom: 1px solid #e0e7ff; text-align: center;">
              <span style="color: #4338ca; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                🎓 NEW TRAINING COURSE ASSIGNED
              </span>
            </td>
          </tr>

          <!-- MAIN BODY CONTENT -->
          <tr>
            <td style="padding: 32px; color: #334155; font-size: 15px; line-height: 1.6;">
              <p style="margin-top: 0; font-size: 16px; font-weight: 700; color: #1e293b;">
                Hello ${userObj.name},
              </p>
              <p style="color: #475569; margin-bottom: 24px;">
                You have been assigned a new training course on the ThinkDifferent Learning Platform.
              </p>

              <!-- COURSE HIGHLIGHT CARD -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      COURSE TITLE
                    </div>
                    <div style="color: #0f172a; font-size: 18px; font-weight: 800; margin-bottom: 14px;">
                      ${course.title}
                    </div>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 12px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="50%">
                            <span style="color: #64748b; font-size: 11px; font-weight: 600; display: block;">DUE DATE</span>
                            <span style="color: #dc2626; font-size: 14px; font-weight: 700;">📅 ${formattedDueDate}</span>
                          </td>
                          <td width="50%">
                            <span style="color: #64748b; font-size: 11px; font-weight: 600; display: block;">STATUS</span>
                            <span style="color: #16a34a; font-size: 14px; font-weight: 700;">🟢 Assigned</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${courseDashboardUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                      Access Course Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin-bottom: 0; color: #64748b; font-size: 13px;">
                Best regards,<br>
                <strong style="color: #334155;">ThinkDifferent LMS Learning & Development Team</strong>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
              &copy; 2026 ThinkDifferent LMS. All rights reserved.<br>
              This is an automated notification from your enterprise learning management portal.
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
            email: userObj.email,
            subject,
            message,
            html
          });
        } catch (emailErr) {
          console.error(`Failed to send assignment notification email to ${userObj.email}:`, emailErr.message);
        }
      }
    }

    res.status(201).json({
      message: `Course assigned to ${results.length} user(s). Notification email(s) sent.`,
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
