import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClubsModule } from './clubs/clubs.module';
import { EventsModule } from './events/events.module';
import { MentorshipModule } from './mentorship/mentorship.module';
import { BadgesModule } from './badges/badges.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { StudentsModule } from './students/students.module';
import { AdminModule } from './admin/admin.module';
import { ExploreModule } from './explore/explore.module';
import { ActivityModule } from './activity/activity.module';
import { HealthModule } from './health/health.module';
import { PostsModule } from './posts/posts.module';
import { UploadModule } from './upload/upload.module';
import { ReportsModule } from './reports/reports.module';
import { PartnershipsModule } from './partnerships/partnerships.module';
import { CommunityPartnersModule } from './community-partners/community-partners.module';
import { ContentModule } from './content/content.module';
import { TasksModule } from './tasks/tasks.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    AuthModule,
    UsersModule,
    ClubsModule,
    EventsModule,
    MentorshipModule,
    BadgesModule,
    NotificationsModule,
    ChatModule,
    AdminModule,
    ExploreModule,
    ActivityModule,
    HealthModule,
    PostsModule,
    StudentsModule,
    UploadModule,
    ReportsModule,
    PartnershipsModule,
    CommunityPartnersModule,
    ContentModule,
    TasksModule,
    PaymentsModule,
  ],
})
export class AppModule {}

