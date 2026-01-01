import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduledEmailStatus, ScheduledEmailType } from '@prisma/client';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private isConfigured = false;
  private senderEmail: string | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeSendGrid();
  }

  private initializeSendGrid() {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    const sender = this.configService.get<string>('SENDGRID_FROM')?.trim();

    // Validate that sender is a non-empty string and looks like an email
    if (!apiKey || !sender || sender === 'null' || sender === 'undefined' || !sender.includes('@')) {
      this.logger.warn('SendGrid API key or sender email missing or invalid. Emails will not be sent.');
      this.logger.warn(`API Key: ${apiKey ? 'set' : 'missing'}, Sender: ${sender || 'missing'}`);
      this.isConfigured = false;
      this.senderEmail = null;
      return;
    }

    sgMail.setApiKey(apiKey);
    this.senderEmail = sender;
    this.isConfigured = true;
    this.logger.log(`SendGrid initialized successfully with sender: ${sender}`);
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  getConfigurationStatus() {
    return {
      configured: this.isConfigured,
      from: this.senderEmail || this.configService.get<string>('SENDGRID_FROM') || 'not set',
      apiKey: this.configService.get<string>('SENDGRID_API_KEY') ? 'configured' : 'not set',
    };
  }

  async testEmailConnection(testEmail?: string) {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'SendGrid not configured. Set SENDGRID_API_KEY and SENDGRID_FROM in .env',
        details: this.getConfigurationStatus(),
      };
    }

    if (!testEmail) {
      return { success: true, message: 'SendGrid is configured', details: { connection: 'verified' } };
    }

    try {
      await this.sendEmail(
        testEmail,
        'NorthernBox Test Email',
        `<div style="font-family: Arial, sans-serif; text-align:center;">
          <h2 style="color:#0284c7;">✅ SendGrid Email Test Successful!</h2>
          <p>If you received this email, your email service is working correctly.</p>
        </div>`,
      );
      return {
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        details: { connection: 'verified', emailSent: true, recipient: testEmail },
      };
    } catch (error: any) {
      this.logger.error('SendGrid test email failed:', error);
      return { success: false, message: error.message, details: { error: error.message } };
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    options?: {
      type?: ScheduledEmailType;
      recipientId?: string;
      createdBy?: string;
      metadata?: any;
      priority?: number;
    },
  ): Promise<boolean> {
    if (!this.isConfigured || !this.senderEmail) {
      this.logger.warn('SendGrid not configured. Email not sent.');
      // Store as failed even if not configured
      await this.storeEmail(to, subject, html, text || this.stripHtml(html), {
        status: ScheduledEmailStatus.FAILED,
        type: options?.type || ScheduledEmailType.CUSTOM,
        errorMessage: 'SendGrid not configured',
        recipientId: options?.recipientId,
        createdBy: options?.createdBy,
        metadata: options?.metadata,
        priority: options?.priority,
      });
      return false;
    }

    // Ensure we have a valid sender email (should never be null at this point, but double-check)
    const from = this.senderEmail || 'noreply@northernbox.com';

    if (!from || from === 'null' || !from.includes('@')) {
      this.logger.error(`Invalid sender email: ${from}. Email not sent.`);
      // Store as failed
      await this.storeEmail(to, subject, html, text || this.stripHtml(html), {
        status: ScheduledEmailStatus.FAILED,
        type: options?.type || ScheduledEmailType.CUSTOM,
        errorMessage: `Invalid sender email: ${from}`,
        recipientId: options?.recipientId,
        createdBy: options?.createdBy,
        metadata: options?.metadata,
        priority: options?.priority,
      });
      return false;
    }

    // Store email before sending
    const storedEmail = await this.storeEmail(to, subject, html, text || this.stripHtml(html), {
      status: ScheduledEmailStatus.PENDING,
      type: options?.type || ScheduledEmailType.CUSTOM,
      recipientId: options?.recipientId,
      createdBy: options?.createdBy,
      metadata: options?.metadata,
      priority: options?.priority,
    });

    try {
      await sgMail.send({
        to,
        from,
        subject,
        text: text || this.stripHtml(html),
        html,
      });
      this.logger.log(`Email sent successfully to ${to} from ${from}`);
      
      // Update stored email as sent
      await this.prisma.scheduledEmail.update({
        where: { id: storedEmail.id },
        data: {
          status: ScheduledEmailStatus.SENT,
          sentAt: new Date(),
        },
      });
      
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      
      // Update stored email as failed
      await this.prisma.scheduledEmail.update({
        where: { id: storedEmail.id },
        data: {
          status: ScheduledEmailStatus.FAILED,
          failedAt: new Date(),
          errorMessage: error?.message || 'Failed to send email',
          retryCount: { increment: 1 },
        },
      });
      
      return false;
    }
  }

  private async storeEmail(
    recipientEmail: string,
    subject: string,
    body: string,
    textBody: string,
    options: {
      status: ScheduledEmailStatus;
      type: ScheduledEmailType;
      recipientId?: string;
      createdBy?: string;
      metadata?: any;
      priority?: number;
      errorMessage?: string;
    },
  ) {
    try {
      return await this.prisma.scheduledEmail.create({
        data: {
          recipientEmail,
          recipientId: options.recipientId || null,
          subject,
          body,
          textBody,
          status: options.status,
          type: options.type,
          priority: options.priority || 0,
          scheduledFor: new Date(), // Send immediately
          errorMessage: options.errorMessage || null,
          metadata: options.metadata || null,
          createdBy: options.createdBy || null,
        },
      });
    } catch (error: any) {
      this.logger.error('Failed to store email in scheduledEmails table:', error);
      // Don't throw - we still want to send the email even if storing fails
      // Return a dummy object so the calling code doesn't break
      return {
        id: 'store-failed',
        update: async () => ({}),
      } as any;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    resetUrl?: string,
    recipientId?: string,
  ) {
    const resetLink = resetUrl || `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Password Reset</title></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">NorthernBox</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin-top: 0;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #0284c7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #0284c7; font-size: 12px; word-break: break-all;">${resetLink}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} NorthernBox. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(email, 'Reset Your Password - NorthernBox', html, undefined, {
      type: ScheduledEmailType.PASSWORD_RESET,
      recipientId,
      metadata: { resetToken, resetLink },
    });
  }

  async sendVerificationEmail(
    email: string,
    otpCode: string,
    recipientId?: string,
    firstName?: string,
    lastName?: string,
  ) {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #333;">
        
        <!-- Container -->
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
          
          <!-- Logo Section -->
          <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 1px solid #f0f0f0;">
            <img src="https://res.cloudinary.com/dymlg8elg/image/upload/v1726666635/NB-1-removebg-preview_cevjr5.png" alt="NorthernBox Logo" style="max-width: 150px; height: auto; display: inline-block;">
          </div>

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white;">
            <h1 style="font-size: 28px; font-weight: 600; margin: 0;">Verify Your Email</h1>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 20px; text-align: center;">
            <p style="font-size: 18px; color: #333; margin-bottom: 24px; font-weight: 500; margin-top: 0;">Hello${firstName && lastName ? ` ${firstName} ${lastName}` : firstName ? ` ${firstName}` : ''},</p>
            
            <p style="font-size: 16px; color: #666; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
              We received a request to verify your email address. Use the verification code below to complete the process:
            </p>

            <!-- OTP Code Box -->
            <div style="background-color: #f9f9f9; border: 2px solid #667eea; border-radius: 8px; padding: 24px; margin: 32px 0;">
              <div style="font-size: 14px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: 600;">Your Verification Code</div>
              <div style="font-size: 42px; font-weight: 700; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; word-spacing: 12px;">${otpCode}</div>
            </div>

            <!-- Expiry Notice -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 24px 0; border-radius: 4px; font-size: 14px; color: #856404;">
              ⏱️ This code will expire in <strong>10 minutes</strong>. Please use it right away.
            </div>

            <!-- Security Note -->
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 24px 0; font-size: 14px; color: #666; line-height: 1.6;">
              <div style="font-size: 20px; margin-bottom: 8px;">🔒</div>
              <strong>Security Reminder:</strong><br>
              Never share this code with anyone. We will never ask for it. If you didn't request this code, please ignore this email.
            </div>

            <div style="border-top: 1px solid #eee; margin: 24px 0;"></div>

            <p style="font-size: 16px; color: #666; margin-bottom: 32px; line-height: 1.6; margin-top: 0;">
              Enter this code in the app to verify your email address.
            </p>
          </div>

          <!-- Signature Section -->
          <div style="padding: 24px 20px; text-align: center; border-top: 1px solid #eee; background-color: #fafafa;">
            <img src="https://res.cloudinary.com/dymlg8elg/image/upload/v1767153441/nbc_sign_ws7kqb.png" alt="NorthernBox Signature" style="max-width: 150px; height: auto; margin-bottom: 12px;" />
            <p style="font-size: 14px; color: #666; margin: 0 0 8px 0; font-weight: 500;">Best regards,</p>
            <p style="font-size: 14px; color: #333; margin: 0 0 4px 0; font-weight: 600;">NorthernBox Team</p>
            <p style="font-size: 12px; color: #999; margin: 0;">northernbox.co.ke</p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 24px 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999; line-height: 1.6; margin: 0;">
              This is an automated email from our verification system. Please do not reply to this email.<br>
              <a href="https://northernbox.co.ke/support" style="color: #667eea; text-decoration: none;">Contact Support</a> | <a href="https://northernbox.co.ke/privacy" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
            </p>
            <p style="font-size: 12px; color: #ccc; line-height: 1.6; margin-top: 16px; margin-bottom: 0;">
              © ${new Date().getFullYear()} NorthernBox. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `NorthernBox Email Verification\n\nYour verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nIf you didn't create an account, ignore this email.`;

    return this.sendEmail(email, 'Verify Your Email - NorthernBox', html, text, {
      type: ScheduledEmailType.VERIFICATION,
      recipientId,
      metadata: { otpCode },
    });
  }

  async sendWelcomeEmail(
    email: string,
    firstName: string,
    lastName: string,
    recipientId?: string,
  ) {
    const fullName = `${firstName} ${lastName}`.trim();
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to NorthernBox</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #333;">
        
        <!-- Container -->
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
          
          <!-- Logo Section -->
          <div style="background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 1px solid #f0f0f0;">
            <img src="https://res.cloudinary.com/dymlg8elg/image/upload/v1726666635/NB-1-removebg-preview_cevjr5.png" alt="NorthernBox Logo" style="max-width: 180px; height: auto; display: inline-block;">
          </div>

          <!-- Hero Section -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 20px; text-align: center; color: white;">
            <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
            <h1 style="font-size: 32px; font-weight: 700; margin: 0 0 12px 0; color: white;">Welcome to NorthernBox!</h1>
            <p style="font-size: 18px; margin: 0; color: rgba(255, 255, 255, 0.95);">We're thrilled to have you join our community</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 20px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px; font-weight: 500;">Hello ${fullName},</p>
            
            <p style="font-size: 16px; color: #666; margin-bottom: 24px; line-height: 1.7;">
              Welcome to NorthernBox! We're excited to have you as part of our growing community of learners, mentors, and changemakers.
            </p>

            <!-- Features Grid -->
            <div style="margin: 32px 0;">
              <h2 style="font-size: 20px; color: #333; margin-bottom: 20px; text-align: center; font-weight: 600;">What You Can Do</h2>
              
              <div style="margin-bottom: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                <div style="font-size: 24px; margin-bottom: 8px;">🎯</div>
                <h3 style="font-size: 16px; color: #333; margin: 0 0 8px 0; font-weight: 600;">Join Clubs</h3>
                <p style="font-size: 14px; color: #666; margin: 0; line-height: 1.6;">Connect with like-minded individuals and participate in community clubs</p>
              </div>

              <div style="margin-bottom: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #764ba2;">
                <div style="font-size: 24px; margin-bottom: 8px;">📅</div>
                <h3 style="font-size: 16px; color: #333; margin: 0 0 8px 0; font-weight: 600;">Attend Events</h3>
                <p style="font-size: 14px; color: #666; margin: 0; line-height: 1.6;">Discover workshops, meetups, and conferences tailored to your interests</p>
              </div>

              <div style="margin-bottom: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="font-size: 24px; margin-bottom: 8px;">🤝</div>
                <h3 style="font-size: 16px; color: #333; margin: 0 0 8px 0; font-weight: 600;">Find Mentorship</h3>
                <p style="font-size: 14px; color: #666; margin: 0; line-height: 1.6;">Connect with mentors or become a mentor yourself</p>
              </div>

              <div style="margin-bottom: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-size: 24px; margin-bottom: 8px;">🏆</div>
                <h3 style="font-size: 16px; color: #333; margin: 0 0 8px 0; font-weight: 600;">Earn Badges</h3>
                <p style="font-size: 14px; color: #666; margin: 0; line-height: 1.6;">Get recognized for your participation and achievements</p>
              </div>
            </div>

            <!-- Next Steps -->
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); padding: 24px; border-radius: 8px; margin: 32px 0; border: 1px solid #c7d2fe;">
              <h3 style="font-size: 18px; color: #333; margin: 0 0 12px 0; font-weight: 600;">✨ Next Steps</h3>
              <ol style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
                <li style="margin-bottom: 8px;">Verify your email address using the code we just sent you</li>
                <li style="margin-bottom: 8px;">Complete your profile to help others discover you</li>
                <li style="margin-bottom: 8px;">Explore clubs and events that match your interests</li>
                <li>Start connecting with the community!</li>
              </ol>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://northernbox.co.ke" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">Get Started</a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 32px; line-height: 1.6;">
              If you have any questions or need help getting started, don't hesitate to reach out to our support team. We're here to help!
            </p>
          </div>

          <!-- Signature Section -->
          <div style="padding: 24px 20px; text-align: center; border-top: 1px solid #eee; background-color: #fafafa;">
            <img src="https://res.cloudinary.com/dymlg8elg/image/upload/v1767153441/nbc_sign_ws7kqb.png" alt="NorthernBox Signature" style="max-width: 150px; height: auto; margin-bottom: 12px;" />
            <p style="font-size: 14px; color: #666; margin: 0 0 8px 0; font-weight: 500;">Best regards,</p>
            <p style="font-size: 14px; color: #333; margin: 0 0 4px 0; font-weight: 600;">The NorthernBox Team</p>
            <p style="font-size: 12px; color: #999; margin: 0;">northernbox.co.ke</p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 24px 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999; line-height: 1.6; margin: 0;">
              Follow us on social media for updates and community highlights<br>
              <a href="https://northernbox.co.ke" style="color: #667eea; text-decoration: none; margin: 0 8px;">Website</a> | 
              <a href="https://northernbox.co.ke/support" style="color: #667eea; text-decoration: none; margin: 0 8px;">Support</a> | 
              <a href="https://northernbox.co.ke/privacy" style="color: #667eea; text-decoration: none; margin: 0 8px;">Privacy Policy</a>
            </p>
            <p style="font-size: 12px; color: #ccc; line-height: 1.6; margin-top: 16px; margin-bottom: 0;">
              © ${new Date().getFullYear()} NorthernBox. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `Welcome to NorthernBox!\n\nHello ${fullName},\n\nWelcome to NorthernBox! We're excited to have you as part of our growing community of learners, mentors, and changemakers.\n\nWhat You Can Do:\n- Join Clubs: Connect with like-minded individuals\n- Attend Events: Discover workshops and meetups\n- Find Mentorship: Connect with mentors\n- Earn Badges: Get recognized for achievements\n\nNext Steps:\n1. Verify your email address using the code we sent\n2. Complete your profile\n3. Explore clubs and events\n4. Start connecting with the community!\n\nVisit us at: https://northernbox.co.ke\n\nBest regards,\nThe NorthernBox Team`;

    return this.sendEmail(email, 'Welcome to NorthernBox! 🎉', html, text, {
      type: ScheduledEmailType.CUSTOM,
      recipientId,
      metadata: { firstName, lastName, emailType: 'welcome' },
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
}
