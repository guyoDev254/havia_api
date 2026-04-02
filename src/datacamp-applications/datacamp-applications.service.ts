import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import { SubmitDataCampApplicationDto } from './dto/submit-application.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class DataCampApplicationsService {
  private readonly logger = new Logger(DataCampApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async submit(dto: SubmitDataCampApplicationDto) {
    // Ensure applicants also exist in users table (using unique email)
    const normalizedEmail = dto.email.trim().toLowerCase();
    const fullName = dto.fullName?.trim() || '';
    const [firstNameRaw, ...restNames] = fullName.split(' ').filter(Boolean);
    const firstName = firstNameRaw || 'DataCamp';
    const lastName = restNames.join(' ') || 'Applicant';

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!existingUser) {
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'MEMBER',
          isActive: true,
          isEmailVerified: false,
          isStudent: true,
        },
      });
    }

    const application = await this.prisma.dataCampDonatesApplication.create({
      data: {
        fullName: dto.fullName,
        email: normalizedEmail,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        cityOfResidence: dto.cityOfResidence,
        motivationForDataScience: dto.motivationForDataScience,
        howEnvisionLeveraging: dto.howEnvisionLeveraging,
        previousCoursesOrProjects: dto.previousCoursesOrProjects,
        whyDeserveScholarship: dto.whyDeserveScholarship,
        usedDataCampBefore: dto.usedDataCampBefore,
        currentSituation: dto.currentSituation,
        dataCampCompletionDetails: dto.dataCampCompletionDetails,
        highestEducationLevel: dto.highestEducationLevel,
        educationDetails: dto.educationDetails,
        scholarshipContribution: dto.scholarshipContribution,
        challengesOrObstacles: dto.challengesOrObstacles,
        areasOfInterest: dto.areasOfInterest,
        participatedInProjects: dto.participatedInProjects,
        projectsDetails: dto.projectsDetails,
        planToContribute: dto.planToContribute,
        affiliatedWithInstitutions: dto.affiliatedWithInstitutions,
        affiliationDetails: dto.affiliationDetails,
        goalsThisYear: dto.goalsThisYear,
        howFreeAccessWillHelp: dto.howFreeAccessWillHelp,
        hoursPerWeek: dto.hoursPerWeek,
        otherInfo: dto.otherInfo,
        howDidYouHear: dto.howDidYouHear,
        internetAccess: dto.internetAccess,
        computerAccess: dto.computerAccess,
        additionalUploadDetails: dto.additionalUploadDetails,
      },
    });

    // Send confirmation email to applicant (non-blocking; don't fail submission if email fails)
    try {
      const name = dto.fullName?.trim() || 'Applicant';
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received – DataCamp Donates</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px 32px; text-align: center;">
              <span style="font-size: 22px; font-weight: 700; color: #ffffff;">NorthernBox</span>
              <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.9);">Empowering Northern Kenya's youth</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 20px; background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Scholarship</p>
                    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #111827;">DataCamp Donates × NorthernBox</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 0 0;">
                    <h1 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827;">We received your application</h1>
                    <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">Hello ${name},</p>
                    <p style="margin: 0 0 16px; color: #374151; line-height: 1.6;">Thank you for applying for the <strong>DataCamp Donates</strong> scholarship through NorthernBox. We have received your application.</p>
                    <p style="margin: 0 0 16px; color: #374151; line-height: 1.6;">Our team will review it and get back to you. You can expect to hear from us once the review is complete. If your application is approved, you will receive instructions on how to access DataCamp and start learning.</p>
                    <p style="margin: 0 0 16px; color: #374151; line-height: 1.6;">If you have any questions in the meantime, please reach out through our <a href="https://northernbox.co.ke/contact" style="color: #0284c7; text-decoration: none;">contact page</a>.</p>
                    <p style="margin: 24px 0 0; font-size: 16px; color: #111827;">Best regards,<br><strong>The NorthernBox Team</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e0f2fe;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Need help?</p>
              <p style="margin: 0; font-size: 14px;">
                <a href="https://northernbox.co.ke/contact" style="color: #0284c7; text-decoration: none;">Contact us</a>
                &nbsp;·&nbsp;
                <a href="https://northernbox.co.ke" style="color: #0284c7; text-decoration: none;">northernbox.co.ke</a>
              </p>
              <p style="margin: 20px 0 0; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} NorthernBox. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();
      const text = `NorthernBox – Application Received\n\nHello ${name},\n\nThank you for applying for the DataCamp Donates scholarship through NorthernBox. We have received your application. Our team will review it and get back to you. If approved, you will receive instructions on how to access DataCamp.\n\nContact us: https://northernbox.co.ke/contact\n\nBest regards,\nThe NorthernBox Team`;
      await this.emailService.sendEmail(
        normalizedEmail,
        'We received your DataCamp Donates scholarship application – NorthernBox',
        html,
        text,
      );
      this.logger.log(`Confirmation email sent to ${normalizedEmail} for application ${application.id}`);
    } catch (error) {
      this.logger.error(`Failed to send confirmation email to ${normalizedEmail}:`, error);
      // Don't throw – application was saved; email failure shouldn't break the flow
    }

    return application;
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [applications, total] = await Promise.all([
      this.prisma.dataCampDonatesApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dataCampDonatesApplication.count({ where }),
    ]);
    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const app = await this.prisma.dataCampDonatesApplication.findUnique({
      where: { id },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async updateStatus(id: string, status: string, reviewedBy: string, notes?: string) {
    await this.findOne(id);
    return this.prisma.dataCampDonatesApplication.update({
      where: { id },
      data: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        notes: notes ?? undefined,
      },
    });
  }
}
