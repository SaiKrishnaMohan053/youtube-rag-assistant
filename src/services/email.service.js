const axios = require('axios');
const env = require('../config/env');

const BREVO_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';

const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  console.log('Starting verification email flow for:', to);

  if (!env.brevoApiKey) {
    console.log(`BREVO_API_KEY missing. Verification link for ${to}: ${verificationUrl}`);
    return;
  }

  try {
    const payload = {
      sender: {
        name: 'YouTube RAG Assistant',
        email: env.emailFrom,
      },
      to: [
        {
          email: to,
          name,
        },
      ],
      subject: 'Verify your YouTube RAG Assistant account',
      htmlContent: `
        <p>Hi ${name},</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email</a></p>
        <p>This link expires in 24 hours.</p>
      `,
    };

    const { data } = await axios.post(BREVO_EMAIL_URL, payload, {
      headers: {
        accept: 'application/json',
        'api-key': env.brevoApiKey,
        'content-type': 'application/json',
      },
      timeout: 15000,
    });

    console.log('Verification email sent successfully:', {
      to,
      messageId: data?.messageId,
    });

    return data;
  } catch (error) {
    console.error('Failed to send verification email:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
};
