import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StudentsService } from '../students/students.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DeadlineCheckerTask {
  private readonly logger = new Logger(DeadlineCheckerTask.name);

  constructor(
    private readonly studentsService: StudentsService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Check for upcoming deadlines every hour
   * This will send notifications for assignments and calendar events due within 24 hours
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkUpcomingDeadlines() {
    this.logger.log('Checking for upcoming deadlines...');
    try {
      const result = await this.studentsService.checkAndNotifyUpcomingDeadlines();
      this.logger.log(
        `Deadline check completed: ${result.assignmentsNotified} assignment notifications, ${result.calendarEventsNotified} calendar event notifications`,
      );
    } catch (error) {
      this.logger.error('Error checking deadlines:', error);
    }
  }

  /**
   * Daily check at 8 AM for deadlines due today
   * More frequent notifications for same-day deadlines
   */
  @Cron('0 8 * * *') // Every day at 8:00 AM
  async checkTodaysDeadlines() {
    this.logger.log('Checking for today\'s deadlines...');
    try {
      const result = await this.studentsService.checkAndNotifyUpcomingDeadlines();
      this.logger.log(
        `Today's deadline check completed: ${result.assignmentsNotified} assignment notifications, ${result.calendarEventsNotified} calendar event notifications`,
      );
    } catch (error) {
      this.logger.error('Error checking today\'s deadlines:', error);
    }
  }

  /**
   * Check for upcoming study group meetups and send reminders
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkUpcomingMeetups() {
    this.logger.log('Checking for upcoming study group meetups...');
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

      // Find meetups starting in the next 24 hours that haven't been reminded yet
      const upcomingMeetups = await this.prisma.studyGroupMeetup.findMany({
        where: {
          startDate: {
            gte: in1Hour,
            lte: in24Hours,
          },
          isCancelled: false,
          // We'll check if reminder was sent by checking notifications
        },
        include: {
          studyGroup: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      expoPushToken: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      for (const meetup of upcomingMeetups) {
        // Check if we already sent a reminder for this meetup
        const reminderSent = await this.prisma.notification.findFirst({
          where: {
            type: 'STUDY_GROUP_MEETUP',
            message: {
              contains: meetup.id,
            },
            createdAt: {
              gte: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Within last 2 hours
            },
          },
        });

        if (!reminderSent) {
          // Send reminders to all members who RSVP'd as attending
          const attendees = await this.prisma.studyGroupMeetupRSVP.findMany({
            where: {
              meetupId: meetup.id,
              status: 'ATTENDING',
            },
            include: {
              user: {
                select: {
                  id: true,
                  expoPushToken: true,
                },
              },
            },
          });

          const hoursUntil = Math.round((meetup.startDate.getTime() - now.getTime()) / (1000 * 60 * 60));

          for (const attendee of attendees) {
            if (attendee.user.expoPushToken) {
              await this.notificationsService.sendPushNotification(
                attendee.user.id,
                `Study Group Meetup Reminder`,
                `${meetup.title} starts in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`,
                {
                  type: 'STUDY_GROUP_MEETUP',
                  studyGroupId: meetup.studyGroupId,
                  meetupId: meetup.id,
                },
              );
            }

            // Also create in-app notification
            await this.notificationsService.create(attendee.user.id, {
              title: 'Study Group Meetup Reminder',
              message: `${meetup.title} starts in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`,
              type: 'STUDY_GROUP_MEETUP',
              link: `/students/study-groups/${meetup.studyGroupId}/meetups`,
            });
          }

          this.logger.log(`Sent meetup reminders for ${attendees.length} attendees`);
        }
      }
    } catch (error) {
      this.logger.error('Error checking upcoming meetups:', error);
    }
  }
}

