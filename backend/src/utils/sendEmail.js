const nodemailer = require('nodemailer');
const dns = require('dns');

/**
 * Send email using Nodemailer SMTP with forced IPv4 DNS lookup and automatic port fallback (465 SSL -> 587 TLS)
 * to bypass cloud provider firewall blocks and prevent connection timeouts on Render/GCP/AWS.
 * @param {Object} options - Email parameters { email, subject, message, html }
 */
const sendEmail = async (options) => {
  const smtpUser = process.env.SMTP_USER;
  const isDevMode = !smtpUser || smtpUser === 'your_email@gmail.com';

  if (isDevMode) {
    console.log(`[DEVELOPMENT MODE] Email notification queued for ${options.email}:`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message:\n${options.message}`);
    return;
  }

  // Default to Port 465 (SSL/TLS) because cloud hosts like Render often block Port 587 (STARTTLS)
  const primaryPort = parseInt(process.env.SMTP_PORT || '465', 10);

  const createTransporterForPort = (targetPort) => {
    const isSecure = process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : targetPort === 465;

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: targetPort,
      secure: isSecure,
      family: 4,
      dnsOptions: { family: 4 },
      // Strict IPv4 lookup hook to avoid IPv6 unreachable errors
      lookup: (hostname, opts, callback) => {
        dns.lookup(hostname, { ...opts, family: 4 }, callback);
      },
      connectionTimeout: 10000, // 10 seconds connection timeout
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  };

  const fromName = process.env.FROM_NAME || process.env.SMTP_FROM || 'ThinkDifferent LMS';
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    const primaryTransporter = createTransporterForPort(primaryPort);
    await primaryTransporter.sendMail(mailOptions);
  } catch (err) {
    // If primary port times out or fails (e.g. port 465 vs 587), automatically retry on fallback port
    const fallbackPort = primaryPort === 465 ? 587 : 465;
    console.warn(`[SMTP Delivery Warning] Port ${primaryPort} failed (${err.message}). Retrying on fallback port ${fallbackPort}...`);
    
    const fallbackTransporter = createTransporterForPort(fallbackPort);
    await fallbackTransporter.sendMail(mailOptions);
  }
};

module.exports = sendEmail;
