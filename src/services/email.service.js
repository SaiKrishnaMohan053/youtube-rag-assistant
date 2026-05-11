const { Resend } = require('resend');
const env = require('../config/env');

const createResendClient = () => {
  if (!env.resendApiKey) {
    return null;
  }

  return new Resend(env.resendApiKey);
};

const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  console.log('Starting verification email flow for:', to);

  const resend = createResendClient();

  if (!resend) {
    console.log(`RESEND_API_KEY missing. Verification link for ${to}: ${verificationUrl}`);
    return;
  }

  try {
    const result = await resend.emails.send({
      from: env.emailFrom || 'YouTube RAG Assistant <onboarding@resend.dev>',
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
      id: result?.data?.id,
    });

    return result;
  } catch (error) {
    console.error('Failed to send verification email:', {
      message: error.message,
      name: error.name,
      statusCode: error.statusCode,
    });

    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
};
