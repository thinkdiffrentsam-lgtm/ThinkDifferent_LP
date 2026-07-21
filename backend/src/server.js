require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const connectDB = require('./utils/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');

// Initialize app
const app = express();
app.set('trust proxy', 1); // Trust the first proxy (required for Render)

// Security and Performance Middlewares
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // To allow accessing uploaded static files

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // High limit for active testing and development
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Compress response bodies
app.use(compression());

// Middleware
// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Echo the exact origin to satisfy CORS with credentials
    callback(null, origin || '*');
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true, // Allow cookies/authorization headers
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize HTTP server and Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// In-memory tracking of online users (userId -> Set of socketIds)
const onlineUsersMap = new Map();

// Socket.io connection logic
io.on('connection', (socket) => {
  // Join a room based on the user's ID and register user online
  socket.on('join', (userId) => {
    if (!userId) return;
    socket.userId = userId;
    socket.join(userId);

    if (!onlineUsersMap.has(userId)) {
      onlineUsersMap.set(userId, new Set());
    }
    onlineUsersMap.get(userId).add(socket.id);

    // Send active online users list to joined user
    socket.emit('getOnlineUsers', Array.from(onlineUsersMap.keys()));

    // Broadcast user online status to all clients
    io.emit('userStatus', { userId, isOnline: true });
  });

  socket.on('disconnect', () => {
    if (socket.userId && onlineUsersMap.has(socket.userId)) {
      const userSockets = onlineUsersMap.get(socket.userId);
      userSockets.delete(socket.id);
      
      if (userSockets.size === 0) {
        onlineUsersMap.delete(socket.userId);
        // Broadcast user offline status to all clients
        io.emit('userStatus', { userId: socket.userId, isOnline: false });
      }
    }
  });

  socket.on('sendMessage', async (data) => {
    try {
      const { sender, receiver, content, fileUrl, fileName } = data;

      // Permission check: Employees can only send messages to admins
      const [senderUser, receiverUser] = await Promise.all([
        User.findById(sender),
        User.findById(receiver)
      ]);

      if (!senderUser || !receiverUser) {
        socket.emit('messagingError', { message: 'User not found' });
        return;
      }

      const isSenderEmployee = (senderUser.role || '').toLowerCase() === 'employee';
      const isReceiverAdmin = (receiverUser.role || '').toLowerCase() === 'admin';

      if (isSenderEmployee && !isReceiverAdmin) {
        socket.emit('messagingError', { message: 'Employees can only send messages to administrators.' });
        return;
      }

      const message = await Message.create({ sender, receiver, content, fileUrl, fileName });
      
      // Emit to receiver's room for instant delivery
      io.to(receiver).emit('receiveMessage', message);
      
      // Emit back to sender to confirm delivery
      socket.emit('messageSent', message);
    } catch (err) {
      console.error('Socket send message error:', err);
    }
  });

  socket.on('deleteMessage', async (data) => {
    try {
      const { messageId, receiver } = data;
      await Message.findByIdAndDelete(messageId);
      
      // Emit to receiver's room to delete it from their screen
      io.to(receiver).emit('messageDeleted', messageId);
      
      // Emit back to sender
      socket.emit('messageDeleted', messageId);
    } catch (err) {
      console.error('Socket delete message error:', err);
    }
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/employee', require('./routes/employee'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/messages', require('./routes/messages'));

// Basic status route
app.get('/', (req, res) => {
  res.json({ message: 'LMS API is running...' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// Connect to database and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to DB
  await connectDB();

  // Auto-seed database if empty
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Database empty. Seeding default Admin and Employee accounts...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedAdminPassword = await bcrypt.hash('admin123', salt);
      const hashedEmployeePassword = await bcrypt.hash('employee123', salt);

      // Create Admin
      await User.create({
        name: 'System Admin',
        email: 'admin@lms.com',
        password: hashedAdminPassword,
        role: 'admin',
        department: 'Operations',
        designation: 'LMS Manager'
      });

      // Create Employees
      await User.create({
        name: 'Emma Employee',
        email: 'employee@lms.com',
        password: hashedEmployeePassword,
        role: 'employee',
        department: 'Engineering',
        designation: 'Frontend Engineer'
      });

      await User.create({
        name: 'John Doe',
        email: 'john.doe@lms.com',
        password: hashedEmployeePassword,
        role: 'employee',
        department: 'Engineering',
        designation: 'Backend Developer'
      });

      await User.create({
        name: 'Jane Smith',
        email: 'jane.smith@lms.com',
        password: hashedEmployeePassword,
        role: 'employee',
        department: 'HR',
        designation: 'HR Coordinator'
      });

      console.log('Seeding completed! Logins:');
      console.log('  Admin: admin@lms.com / admin123');
      console.log('  Employee: employee@lms.com / employee123');
      console.log('  Employee: john.doe@lms.com / employee123');
      console.log('  Employee: jane.smith@lms.com / employee123');
    }
  } catch (seedErr) {
    console.error('Error seeding database:', seedErr.message);
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
