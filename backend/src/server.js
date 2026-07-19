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
  max: 100, // Limit each IP to 100 requests per windowMs
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
  origin: process.env.FRONTEND_URL || '*', // Specify your Vercel URL in environment variables
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Allow cookies if needed
};
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/employee', require('./routes/employee'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/upload', require('./routes/upload'));

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

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
