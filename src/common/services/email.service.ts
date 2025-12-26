import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Read all email configuration from .env
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<string>('SMTP_PORT');
    const smtpSecure = this.configService.get<string>('SMTP_SECURE');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const smtpFrom = this.configService.get<string>('SMTP_FROM');

    // Log configuration status (without sensitive data)
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug('Email Configuration:', {
        host: smtpHost || 'not set',
        port: smtpPort || 'not set',
        secure: smtpSecure || 'not set',
        user: smtpUser ? `${smtpUser.substring(0, 3)}***` : 'not set',
        from: smtpFrom || 'not set',
      });
    }

    // Initialize email transporter
    const emailConfig = {
      host: smtpHost || 'smtp.gmail.com',
      port: smtpPort ? parseInt(smtpPort, 10) : 587,
      secure: smtpSecure === 'true' || smtpSecure === '1', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    };

    // Only create transporter if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      try {
        this.transporter = nodemailer.createTransport(emailConfig);
        this.isConfigured = true;
        this.logger.log('Email service initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize email transporter:', error);
        this.isConfigured = false;
      }
    } else {
      this.logger.warn('Email service not configured. SMTP credentials missing from .env');
      this.isConfigured = false;
    }
  }

  /**
   * Check if email service is configured
   */
  isEmailConfigured(): boolean {
    return this.isConfigured && !!this.transporter;
  }

  /**
   * Get email configuration status (without sensitive data)
   */
  getConfigurationStatus() {
    return {
      configured: this.isEmailConfigured(),
      host: this.configService.get<string>('SMTP_HOST') || 'not set',
      port: this.configService.get<string>('SMTP_PORT') || 'not set',
      secure: this.configService.get<string>('SMTP_SECURE') || 'not set',
      from: this.configService.get<string>('SMTP_FROM') || 'not set',
      user: this.configService.get<string>('SMTP_USER') ? 'configured' : 'not set',
      pass: this.configService.get<string>('SMTP_PASS') ? 'configured' : 'not set',
    };
  }

  /**
   * Test email connection and send a test email
   */
  async testEmailConnection(testEmail?: string): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.isEmailConfigured()) {
      return {
        success: false,
        message: 'Email service is not configured. Please check your .env file for SMTP settings.',
        details: this.getConfigurationStatus(),
      };
    }

    try {
      // Verify connection
      await this.transporter.verify();
      this.logger.log('Email connection verified successfully');

      // If test email is provided, send a test email
      if (testEmail) {
        const testSubject = 'NorthernBox Email Service Test';
        const testHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Email Test</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0284c7 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">NorthernBox</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
                <h2 style="color: #111827; margin-top: 0;">Email Service Test</h2>
                <p>Hello,</p>
                <p>This is a test email from the NorthernBox API email service.</p>
                <p style="color: #16a34a; font-weight: bold;">✅ If you received this email, your email service is working correctly!</p>
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  <strong>Test Details:</strong><br>
                  Time: ${new Date().toLocaleString()}<br>
                  Server: ${this.configService.get<string>('SMTP_HOST')}<br>
                  Port: ${this.configService.get<string>('SMTP_PORT')}
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} NorthernBox. All rights reserved.</p>
              </div>
            </body>
          </html>
        `;

        const sent = await this.sendEmail(testEmail, testSubject, testHtml);
        if (sent) {
          return {
            success: true,
            message: `Test email sent successfully to ${testEmail}`,
            details: {
              connection: 'verified',
              emailSent: true,
              recipient: testEmail,
            },
          };
        } else {
          return {
            success: false,
            message: 'Connection verified but failed to send test email',
            details: {
              connection: 'verified',
              emailSent: false,
            },
          };
        }
      }

      return {
        success: true,
        message: 'Email connection verified successfully',
        details: {
          connection: 'verified',
          emailSent: false,
        },
      };
    } catch (error: any) {
      this.logger.error('Email connection test failed:', error);
      return {
        success: false,
        message: `Email connection test failed: ${error.message}`,
        details: {
          error: error.message,
          code: error.code,
        },
      };
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
    const verifyLink = verificationUrl ?? `${this.configService.getOrThrow<string>('FRONTEND_URL')}/verify-email?token=${verificationToken}`;

    
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

