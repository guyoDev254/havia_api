import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Initialize email transporter
    const emailConfig = {
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: parseInt(this.configService.get<string>('SMTP_PORT') || '587'),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true', // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    };

    // Only create transporter if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
    } else {
      this.logger.warn('Email service not configured. SMTP credentials missing.');
    }
  }

  /**
   * Send email
   */
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email service not configured. Email not sent.');
      this.logger.debug(`Would send email to: ${to}, Subject: ${subject}`);
      return false;
    }

    try {
      const from = this.configService.get<string>('SMTP_FROM') || 'noreply@northernbox.com';
      
      await this.transporter.sendMail({
        from,
        to,
        subject,
        text: text || this.stripHtml(html),
        html,
      });

      this.logger.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl?: string): Promise<boolean> {
    const resetLink = resetUrl || `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:19006'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">NorthernBox</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin-top: 0;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>You requested to reset your password for your NorthernBox account. Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #0284c7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #0284c7; font-size: 12px; word-break: break-all;">${resetLink}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} NorthernBox. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(email, 'Reset Your Password - NorthernBox', html);
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(email: string, verificationToken: string, verificationUrl?: string): Promise<boolean> {
    const verifyLink = verificationUrl || `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:19006'}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">NorthernBox</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin-top: 0;">Verify Your Email Address</h2>
            <p>Hello,</p>
            <p>Thank you for signing up for NorthernBox! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}" style="background: #0284c7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Verify Email</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #0284c7; font-size: 12px; word-break: break-all;">${verifyLink}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} NorthernBox. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(email, 'Verify Your Email - NorthernBox', html);
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
}

