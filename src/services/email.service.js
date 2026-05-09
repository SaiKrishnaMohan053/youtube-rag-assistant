const dns = require('dns');
const nodemailer = require('nodemailer');
const env = require('../config/env');

dns.setDefaultResultOrder('ipv4first');

const resolveIPv4 = async (host) => {
  const addresses = await dns.promises.resolve4(host);

  if (!addresses.length) {
    throw new Error(`No IPv4 address found for SMTP host: ${host}`);
  }

  return addresses[0];
};

const createTransporter = async () => {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return null;
  }

  const smtpIPv4 = await resolveIPv4(env.smtpHost);

  return nodemailer.createTransport({
    host: smtpIPv4,
    port: Number(env.smtpPort) || 587,
    secure: Number(env.smtpPort) === 465,
    requireTLS: true,

    tls: {
      servername: env.smtpHost,
    },

    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },

    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};

const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const transporter = await createTransporter();

  if (!transporter) {
    console.log(`Email verification link for ${to}: ${verificationUrl}`);
    return;
  }

  try {
    await transporter.verify();

    await transporter.sendMail({
      from: env.emailFrom,
      to,
      subject: 'Verify your YouTube RAG Assistant account',
      html: `
        <p>Hi ${name},</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email</a></p>
        <p>This link expires in 24 hours.</p>
      `,
    });

    console.log(`Verification email sent successfully to ${to}`);
  } catch (error) {
    console.error('Failed to send verification email:', error.message);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
};
