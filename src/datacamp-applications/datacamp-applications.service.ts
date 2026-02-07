import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import { SubmitDataCampApplicationDto } from './dto/submit-application.dto';

@Injectable()
export class DataCampApplicationsService {
  private readonly logger = new Logger(DataCampApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async submit(dto: SubmitDataCampApplicationDto) {
    const application = await this.prisma.dataCampDonatesApplication.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0284c7;">Application Received – DataCamp Donates Scholarship</h2>
          <p>Hello ${name},</p>
          <p>Thank you for applying for the DataCamp Donates scholarship through NorthernBox. We have received your application.</p>
          <p>Our team will review it and get back to you. You can expect to hear from us once the review is complete.</p>
          <p>If you have any questions in the meantime, please reach out through our contact page.</p>
          <p>Best regards,<br><strong>The NorthernBox Team</strong></p>
        </div>
      `;
      const text = `Application Received – DataCamp Donates Scholarship\n\nHello ${name},\n\nThank you for applying for the DataCamp Donates scholarship through NorthernBox. We have received your application.\n\nOur team will review it and get back to you. You can expect to hear from us once the review is complete.\n\nIf you have any questions in the meantime, please reach out through our contact page.\n\nBest regards,\nThe NorthernBox Team`;
      await this.emailService.sendEmail(
        dto.email,
        'We received your DataCamp Donates scholarship application',
        html,
        text,
      );
      this.logger.log(`Confirmation email sent to ${dto.email} for application ${application.id}`);
    } catch (error) {
      this.logger.error(`Failed to send confirmation email to ${dto.email}:`, error);
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
