const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// Get contacts with latest message
// Rule: Employees can ONLY contact Admins; Admins can contact everyone.
router.get('/contacts', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUserRole = (req.user.role || '').toLowerCase();

    // Filter target users based on user role
    const filter = { _id: { $ne: currentUserId } };
    if (currentUserRole === 'employee') {
      filter.role = { $regex: /^admin$/i }; // case-insensitive match for admin
    }

    const users = await User.find(filter).select('-password -__v');

    // Enhance with latest message and unread count
    const contactsWithMessages = await Promise.all(users.map(async (user) => {
      // Find latest message between currentUser and this user
      const latestMessage = await Message.findOne({
        $or: [
          { sender: currentUserId, receiver: user._id },
          { sender: user._id, receiver: currentUserId }
        ]
      }).sort({ createdAt: -1 });

      // Count unread messages from this user
      const unreadCount = await Message.countDocuments({
        sender: user._id,
        receiver: currentUserId,
        read: false
      });

      return {
        ...user.toObject(),
        latestMessage,
        unreadCount
      };
    }));

    // Sort by latest message timestamp, then by name
    contactsWithMessages.sort((a, b) => {
      if (a.latestMessage && b.latestMessage) {
        return new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt);
      }
      if (a.latestMessage) return -1;
      if (b.latestMessage) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json(contactsWithMessages);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Server error fetching contacts' });
  }
});

// Get chat history with a specific user
router.get('/:userId', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUserRole = (req.user.role || '').toLowerCase();
    const otherUserId = req.params.userId;

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isTargetAdmin = (otherUser.role || '').toLowerCase() === 'admin';

    // Restriction check: Employees can only message admins
    if (currentUserRole === 'employee' && !isTargetAdmin) {
      return res.status(403).json({ message: 'Employees can only send messages to administrators.' });
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 }); // Oldest first for chat history

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

// Send a message (HTTP fallback endpoint)
router.post('/', protect, async (req, res) => {
  try {
    const sender = req.user._id;
    const senderRole = (req.user.role || '').toLowerCase();
    const { receiver, content, fileUrl, fileName } = req.body;

    if (!receiver || (!content && !fileUrl)) {
      return res.status(400).json({ message: 'Receiver and content/file are required.' });
    }

    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
      return res.status(404).json({ message: 'Receiver user not found' });
    }

    const isReceiverAdmin = (receiverUser.role || '').toLowerCase() === 'admin';

    // Permission check: Employees can only send messages to admins
    if (senderRole === 'employee' && !isReceiverAdmin) {
      return res.status(403).json({ message: 'Employees can only send messages to administrators.' });
    }

    const message = await Message.create({
      sender,
      receiver,
      content: content || '',
      fileUrl: fileUrl || null,
      fileName: fileName || null
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

// Mark messages from a specific user as read
router.put('/:userId/read', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUserRole = (req.user.role || '').toLowerCase();
    const otherUserId = req.params.userId;

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isTargetAdmin = (otherUser.role || '').toLowerCase() === 'admin';

    // Restriction check: Employees can only message admins
    if (currentUserRole === 'employee' && !isTargetAdmin) {
      return res.status(403).json({ message: 'Employees can only message administrators.' });
    }

    await Message.updateMany(
      { sender: otherUserId, receiver: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error marking messages as read' });
  }
});

module.exports = router;
