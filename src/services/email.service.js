const nodemailer = require('nodemailer');
const env = require('../config/env');

const createTransporter = () => {
  if (!env.smtpUser || !env.smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
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
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`Email verification link for ${to}: ${verificationUrl}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: env.emailFrom || env.smtpUser,
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
