const dns = require('dns');
const nodemailer = require('nodemailer');
const env = require('../config/env');
const { code } = require('framer-motion/client');
const { comma } = require('postcss/lib/list');

dns.setDefaultResultOrder('ipv4first');

const resolveIPv4 = async (host) => {
  const addresses = await dns.promises.resolve4(host);

  if (!addresses.length) {
    throw new Error(`No IPv4 address found for SMTP host: ${host}`);
  }

  return addresses[0];
};

const createTransporter = async () => {
  console.log('SMTP config check:', {
    smtpHost: env.smtpHost,
    smtpPort: env.smtpPort,
    smtpUserExists: Boolean(env.smtpUser),
    smtpPassExists: Boolean(env.smtpPass),
    emailFrom: env.emailFrom,
  });

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    console.log('SMTP config missing. Email will only be logged');
    return null;
  }

  console.log('Resolving SMTP IPv4:', env.smtpHost);

  const smtpIPv4 = await resolveIPv4(env.smtpHost);

  console.log('Resolved SMTP IPv4:', smtpIPv4);

  const transporter = nodemailer.createTransport({
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

  console.log('SMTP transporter created');

  return transporter;
};

const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  console.log('Starting verification email flow for:', to);

  const transporter = await createTransporter();

  if (!transporter) {
    console.log(`Email verification link for ${to}: ${verificationUrl}`);
    return;
  }

  try {
    console.log('Verifying SMTP connection...');

    await transporter.verify();

    console.log('SMTP connection verified successfully');

    console.log('Sending verification email...');

    const info = await transporter.sendMail({
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

    console.log('Verification email sent successfully:', {
      to,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (error) {
    console.error('Failed to send verification email:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
};
