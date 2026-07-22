const nodemailer = require('nodemailer');

/**
 * Send email using Nodemailer with support for custom SMTP configuration
 * and fallback logging in development mode.
 * @param {Object} options - Email parameters { email, subject, message, html }
 */
const sendEmail = async (options) => {
  const isDevMode = !process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com';

  if (isDevMode) {
    console.log(`[DEVELOPMENT MODE] Email notification queued for ${options.email}:`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message:\n${options.message}`);
    return;
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: secure,
    family: 4,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const fromName = process.env.FROM_NAME || process.env.SMTP_FROM || 'ThinkDifferent LMS';
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
