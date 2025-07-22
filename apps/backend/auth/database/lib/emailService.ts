import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config({ path: "/app/.env" });

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email: string, code: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@sendyb.com",
      to: [email],
      subject: "Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify your email address</h2>
          <p>Thank you for registering! Please use the verification code below to verify your email address:</p>
          <div style="background-color: #f8f9fa; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0; color: #007bff;">Your verification code:</h3>
            <div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 4px; margin: 10px 0;">${code}</div>
          </div>
          <p><strong>This code will expire in 10 minutes.</strong></p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
          <p style="font-size: 12px; color: #6c757d;">
            This is an automated email from Transcendence. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetUrl = `${
    process.env.FRONTEND_URL || "http://localhost:5173"
  }#/reset-password?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@sendyb.com",
      to: [email],
      subject: "Reset your password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset your password</h2>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

export const sendTwoFactorCode = async (
  email: string,
  code: string,
  userAgent?: string
) => {
  const deviceInfo = userAgent ? `from ${userAgent.split(" ")[0]}` : "";

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@sendyb.com",
      to: [email],
      subject: "Your Login Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Login Verification Code</h2>
          <p>Someone is trying to sign in to your account ${deviceInfo}.</p>
          <div style="background-color: #f8f9fa; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0; color: #007bff;">Your verification code:</h3>
            <div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 4px; margin: 10px 0;">${code}</div>
          </div>
          <p><strong>This code will expire in 10 minutes.</strong></p>
          <p>If you didn't request this login, please ignore this email and consider changing your password.</p>
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
          <p style="font-size: 12px; color: #6c757d;">
            This is an automated security email from Transcendence. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Failed to send 2FA code email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error sending 2FA code email:", error);
    throw error;
  }
};
