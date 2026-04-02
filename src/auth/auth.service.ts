import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import { BadgesService } from '../badges/badges.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyPasswordResetOtpDto } from './dto/verify-password-reset-otp.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private badgesService: BadgesService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, phone, password, firstName, lastName, isStudent, educationLevel } = registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        ...(isStudent
          ? {
              isStudent: true,
              role: 'STUDENT',
              ...(educationLevel ? { educationLevel } : {}),
            }
          : {}),
        emailVerificationOtp: otpCode,
        emailVerificationOtpExpires: otpExpires,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        profileImage: true,
        isStudent: true,
        isEmailVerified: true,
      },
    });

    // Generate token
    const token = this.generateToken(user.id, user.email);

    // Check if email service is configured
    if (!this.emailService.isEmailConfigured()) {
      this.logger.warn(
        `Email service not configured. Verification email will not be sent to ${email}. ` +
        `Please configure SENDGRID_API_KEY and SENDGRID_FROM environment variables.`
      );
      this.logger.warn(`Email configuration status:`, this.emailService.getConfigurationStatus());
    }

    // Send verification email with OTP (non-blocking but with error handling)
    this.emailService.sendVerificationEmail(email, otpCode, user.id, firstName, lastName)
      .then((sent) => {
        if (sent) {
          this.logger.log(`✅ Verification email sent successfully to ${email}`);
        } else {
          this.logger.warn(`❌ Failed to send verification email to ${email}. Check email service configuration.`);
        }
      })
      .catch((error) => {
        this.logger.error(`❌ Error sending verification email to ${email}:`, error);
      });

    // Send welcome email (non-blocking but with error handling)
    this.emailService.sendWelcomeEmail(email, firstName, lastName, user.id)
      .then((sent) => {
        if (sent) {
          this.logger.log(`✅ Welcome email sent successfully to ${email}`);
        } else {
          this.logger.warn(`❌ Failed to send welcome email to ${email}. Check email service configuration.`);
        }
      })
      .catch((error) => {
        this.logger.error(`❌ Error sending welcome email to ${email}:`, error);
      });

    // Award New Member badge (non-blocking)
    this.badgesService.checkAndAwardBadges(user.id, { type: 'USER_REGISTERED' }).catch((err) => {
      this.logger.warn('Failed to award new member badge:', err);
    });

    return {
      user,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user.id, user.email);

    // Return user without password, explicitly including isEmailVerified
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: {
        ...userWithoutPassword,
        isEmailVerified: user.isEmailVerified ?? false, // Ensure it's always included
      },
      token,
    };
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        profileImage: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return { message: 'If an account exists with this email, a password reset OTP has been sent.' };
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save OTP to user (reusing resetPasswordToken field to store OTP)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: otpCode,
        resetPasswordExpires: otpExpires,
      },
    });

    // Send password reset OTP email
    await this.emailService.sendPasswordResetOtpEmail(
      email,
      otpCode,
      user.id,
      user.firstName,
      user.lastName,
    );

    return {
      message: 'If an account exists with this email, a password reset OTP has been sent.',
    };
  }

  async verifyPasswordResetOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (
      !user.resetPasswordToken ||
      user.resetPasswordToken !== otp ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    return { message: 'OTP verified successfully', verified: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword } = resetPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Verify OTP
    if (
      !user.resetPasswordToken ||
      user.resetPasswordToken !== otp ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return { message: 'Password has been changed successfully' };
  }
}

