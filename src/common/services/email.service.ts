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
    verificationToken: string,
    verificationUrl?: string,
    recipientId?: string,
  ) {
    const verifyLink = verificationUrl ?? `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Verify Email</title></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">NorthernBox</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin-top: 0;">Verify Your Email Address</h2>
            <p>Hello,</p>
            <p>Thank you for signing up! Please verify your email by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}" style="background: #0284c7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link:</p>
            <p style="color: #0284c7; font-size: 12px; word-break: break-all;">${verifyLink}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't create an account, ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} NorthernBox. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(email, 'Verify Your Email - NorthernBox', html, undefined, {
      type: ScheduledEmailType.VERIFICATION,
      recipientId,
      metadata: { verificationToken, verifyLink },
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
}
