import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DeadlineCheckerTask } from './deadline-checker.task';
import { MentorshipDropoutTask } from './mentorship-dropout.task';
import { StudentsModule } from '../students/students.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MentorshipModule } from '../mentorship/mentorship.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    StudentsModule,
    NotificationsModule,
    MentorshipModule,
    PrismaModule,
  ],
  providers: [DeadlineCheckerTask, MentorshipDropoutTask],
})
export class TasksModule {}

