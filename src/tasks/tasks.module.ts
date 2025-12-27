import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DeadlineCheckerTask } from './deadline-checker.task';
import { StudentsModule } from '../students/students.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    StudentsModule,
    NotificationsModule,
    PrismaModule,
  ],
  providers: [DeadlineCheckerTask],
})
export class TasksModule {}

