const nodemailer = require('nodemailer');
const dns = require('dns').promises;

/**
 * Send email using Nodemailer SMTP with pre-resolved IPv4 IP address and automatic port fallback (465 SSL -> 587 TLS).
 * Resolving to an IPv4 IP address before connecting guarantees Node.js never attempts IPv6 connections.
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

  const targetHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const primaryPort = parseInt(process.env.SMTP_PORT || '465', 10);

  // Pre-resolve hostname strictly to IPv4 IP address to bypass Node.js dual-stack IPv6 preferences
  let resolvedIp = targetHost;
  try {
    const lookupRes = await dns.lookup(targetHost, { family: 4 });
    resolvedIp = lookupRes.address;
  } catch (dnsErr) {
    console.warn(`[DNS Warning] Could not pre-resolve IPv4 for ${targetHost}, falling back to hostname:`, dnsErr.message);
  }

  const createTransporterForPort = (targetPort) => {
    const isSecure = process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : targetPort === 465;

    return nodemailer.createTransport({
      host: resolvedIp,
      port: targetPort,
      secure: isSecure,
      tls: {
        servername: targetHost,
      },
      connectionTimeout: 10000,
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
    const fallbackPort = primaryPort === 465 ? 587 : 465;
    console.warn(`[SMTP Delivery Warning] Port ${primaryPort} failed (${err.message}). Retrying on fallback port ${fallbackPort}...`);

    const fallbackTransporter = createTransporterForPort(fallbackPort);
    await fallbackTransporter.sendMail(mailOptions);
  }
};

module.exports = sendEmail;
