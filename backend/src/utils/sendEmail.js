const nodemailer = require('nodemailer');
require('dotenv').config({ override: true });

/**
 * Send email using Brevo (API or SMTP) or standard Nodemailer SMTP.
 * @param {Object} options - Email parameters { email, subject, message, html }
 */
const sendEmail = async (options) => {
  // Refresh environment variables in case .env was modified while process was running
  require('dotenv').config({ override: true });

  const fromName = process.env.FROM_NAME || process.env.SMTP_FROM || 'ThinkDifferent LMS';
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || '').trim().replace(/^["']|["']$/g, '');

  console.log(`[sendEmail] Sending email to ${options.email}. Key prefix: ${pass.substring(0, 8)}...`);

  // Try Brevo HTTP REST API if a Brevo key (xkeysib- or xsmtpsib-) or BREVO_API_KEY is provided
  if (pass.startsWith('xkeysib-') || pass.startsWith('xsmtpsib-') || process.env.BREVO_API_KEY) {
    const apiKey = process.env.BREVO_API_KEY || pass;
    console.log('[sendEmail] Attempting delivery via Brevo Transactional Email REST API...');
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: options.email }],
          subject: options.subject,
          htmlContent: options.html || `<p>${(options.message || '').replace(/\n/g, '<br>')}</p>`,
          textContent: options.message || '',
        }),
      });

      const resData = await response.json();
      if (response.ok) {
        console.log('[sendEmail] Email sent successfully via Brevo REST API:', resData);
        return resData;
      }
      console.warn('[sendEmail] Brevo REST API returned error:', resData);
    } catch (apiErr) {
      console.warn('[sendEmail] Brevo REST API call failed:', apiErr.message);
    }
  }

  // Standard Nodemailer SMTP Fallback
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  console.log(`[sendEmail] Attempting delivery via Nodemailer SMTP: ${host}:${port} (User: ${process.env.SMTP_USER})`);

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: pass,
    },
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${(options.message || '').replace(/\n/g, '<br>')}</p>`,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('[sendEmail] Email sent successfully via SMTP:', result.messageId);
    return result;
  } catch (smtpErr) {
    console.error('[sendEmail] SMTP Error:', smtpErr.message);
    throw new Error(
      `Failed to send email. Check Brevo settings:\n` +
      `1. Ensure SMTP_USER (${process.env.SMTP_USER}) is the EXACT login email of your Brevo account.\n` +
      `2. Ensure FROM_EMAIL (${fromEmail}) is an authorized sender in Brevo Dashboard.\n` +
      `3. Details: ${smtpErr.message}`
    );
  }
};

module.exports = sendEmail;


