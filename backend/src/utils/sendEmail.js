const nodemailer = require('nodemailer');

/**
 * Send email via Resend HTTP REST API (using native fetch, zero npm dependency required).
 */
const sendViaResend = async (options, apiKey, fromName) => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const recipients = Array.isArray(options.email) ? options.email : [options.email];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: recipients,
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${(options.message || '').replace(/\n/g, '<br>')}</p>`,
    }),
  });

  const resData = await response.json();

  if (!response.ok) {
    throw new Error(`Resend API error (${response.status}): ${resData.name || ''} - ${resData.message || JSON.stringify(resData)}`);
  }

  return resData;
};

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

  // 1. Use Resend API if RESEND_API_KEY is present
  if (resendApiKey) {
    return await sendViaResend(options, resendApiKey, fromName);
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
