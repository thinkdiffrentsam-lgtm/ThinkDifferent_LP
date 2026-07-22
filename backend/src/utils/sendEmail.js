const { Resend } = require('resend');
const nodemailer = require('nodemailer');

/**
 * Send email using Resend (primary) with fallback to Nodemailer SMTP or console logging.
 * @param {Object} options - Email parameters { email, subject, message, html }
 */
const sendEmail = async (options) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpUser = process.env.SMTP_USER;

  const isDevMode = !resendApiKey && (!smtpUser || smtpUser === 'your_email@gmail.com');

  if (isDevMode) {
    console.log(`[DEVELOPMENT MODE] Email notification queued for ${options.email}:`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message:\n${options.message}`);
    return;
  }

  const fromName = process.env.FROM_NAME || process.env.SMTP_FROM || 'ThinkDifferent LMS';

  // 1. Use Resend API if RESEND_API_KEY is defined
  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(options.email) ? options.email : [options.email],
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${options.message.replace(/\n/g, '<br>')}</p>`,
    });

    if (error) {
      throw new Error(`Resend email delivery failed: ${error.message}`);
    }

    return data;
  }

  // 2. Fallback to Nodemailer SMTP
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
