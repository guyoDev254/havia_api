import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MentorshipService } from '../mentorship/mentorship.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Runs the mentorship dropout check for all active cycles.
 * Rule: 2 consecutive unexcused absences → mentorship status DROPPED.
 * Runs every Monday at 6:00 AM (weekly).
 */
@Injectable()
export class MentorshipDropoutTask {
  private readonly logger = new Logger(MentorshipDropoutTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mentorshipService: MentorshipService,
  ) {}

  @Cron('0 6 * * 1') // Every Monday at 6:00 AM
  async checkConsecutiveAbsences() {
    this.logger.log('Running mentorship dropout check (consecutive absences)...');
    try {
      const cycles = await this.prisma.mentorshipCycle.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true },
      });
      for (const c of cycles) {
        await this.mentorshipService.checkConsecutiveAbsencesAndDrop(c.id);
        this.logger.log(`Checked cycle: ${c.name} (${c.id})`);
      }
      this.logger.log(`Dropout check completed for ${cycles.length} active cycle(s).`);
    } catch (error) {
      this.logger.error('Mentorship dropout check failed:', error);
    }
  }
}
