const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // For development/testing without SMTP config, use mock transporter
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    return {
      sendMail: async (options) => {
        console.log('\n📧 Email would be sent:');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Body:', options.text);
        console.log('HTML:', options.html);
        return { messageId: 'mock-message-id' };
      },
    };
  }

  // If SMTP config is missing, return mock
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return {
      sendMail: async (options) => {
        console.log('\n📧 Email would be sent (SMTP not configured):');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Body:', options.text);
        return { messageId: 'mock-message-id' };
      },
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendOtpEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Use the OTP below to verify your identity:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #333; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
      text: `Your password reset OTP is: ${otp}. This OTP will expire in 10 minutes.`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = {
  sendOtpEmail,
};
