import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials not configured. Email NOT sent to:', to);
      console.debug('Subject:', subject);
      console.debug('Content:', html);
      return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Smart Coffee Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendMfaOtp = async (email: string, otp: string) => {
  const subject = 'Your Smart Coffee Login Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #1C3829;">Verification Code</h2>
      <p>Hello,</p>
      <p>Your login verification code for the Smart Coffee Supply Chain Management System is:</p>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #1C3829; border-radius: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">IMPEXCOR Ltd • Smart Coffee Supply Chain Team</p>
    </div>
  `;
  return sendEmail(email, subject, html);
};

export const sendPasswordResetLink = async (email: string, link: string) => {
  const subject = 'Password Reset Request - Smart Coffee System';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #1C3829;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${link}" style="background-color: #1C3829; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If you did not request this, you can safely ignore this email. The link will expire in 1 hour.</p>
      <p>If the button doesn't work, copy and paste the following link into your browser:</p>
      <p style="font-size: 11px; word-break: break-all;">${link}</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">IMPEXCOR Ltd • Smart Coffee Supply Chain Team</p>
    </div>
  `;
  return sendEmail(email, subject, html);
};
export const sendApprovalNotification = async (email: string, name: string) => {
  const subject = 'Welcome to Smart Coffee - Application Approved!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #1C3829;">Registration Approved!</h2>
      <p>Hello ${name},</p>
      <p>Congratulations! Your farmer registration with the Smart Coffee Supply Chain Management System has been verified and approved.</p>
      <div style="background-color: #f4faf4; border-left: 4px solid #1C3829; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #1C3829;">Next Steps:</p>
        <ul style="margin: 10px 0 0 0; color: #444;">
          <li>You can now log in using your registered email and password.</li>
          <li>An aggregator from your district will contact you soon for coffee collection.</li>
          <li>You can now start recording your coffee deliveries on the platform.</li>
        </ul>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #1C3829; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Dashboard</a>
      </div>
      <p>Thank you for being part of our smart supply chain.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">IMPEXCOR Ltd • Smart Coffee Supply Chain Team</p>
    </div>
  `;
  return sendEmail(email, subject, html);
};
