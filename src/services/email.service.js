const nodemailer = require('nodemailer');
const env = require('../config/env');

const createTransporter = () => {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
};

const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`Email verification link for ${to}: ${verificationUrl}`);
    return;
  }

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
};

module.exports = {
  sendVerificationEmail,
};
