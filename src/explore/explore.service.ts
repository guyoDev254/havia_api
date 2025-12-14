import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ExploreCategory = 'opportunities' | 'resources' | 'articles' | 'partners';

@Injectable()
export class ExploreService {
  constructor(private prisma: PrismaService) {}

  async getContent(category: ExploreCategory) {
    // For now, return mock data structure
    // In production, you would have separate tables for opportunities, resources, articles, partners
    switch (category) {
      case 'opportunities':
        // Return events and mentorship opportunities
        const events = await this.prisma.event.findMany({
          where: {
            status: 'UPCOMING',
          },
          take: 10,
          include: {
            organizer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                attendees: true,
              },
            },
          },
          orderBy: {
            startDate: 'asc',
          },
        });

        return events.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          image: event.image,
          category: 'EVENT',
          date: event.startDate,
          type: event.type,
        }));

      case 'resources':
        // Return clubs and learning resources
        const clubs = await this.prisma.club.findMany({
          where: {
            isActive: true,
          },
          take: 10,
          include: {
            _count: {
              select: {
                members: true,
                events: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return clubs.map((club) => ({
          id: club.id,
          title: club.name,
          description: club.description,
          image: club.image,
          category: 'CLUB',
          date: club.createdAt,
          type: club.category,
        }));

      case 'articles':
        // Mock articles - in production, create an Articles table
        return [
          {
            id: '1',
            title: 'Getting Started with NorthernBox',
            description: 'Learn how to make the most of your NorthernBox experience',
            image: null,
            category: 'ARTICLE',
            date: new Date(),
            type: 'GUIDE',
          },
          {
            id: '2',
            title: 'Building Your Professional Network',
            description: 'Tips for connecting with mentors and peers',
            image: null,
            category: 'ARTICLE',
            date: new Date(),
            type: 'TIPS',
          },
        ];

      case 'partners':
        // Mock partners - in production, create a Partners table
        return [
          {
            id: '1',
            title: 'Tech Hub Kenya',
            description: 'Partner organization offering tech training programs',
            image: null,
            category: 'PARTNER',
            date: new Date(),
            type: 'ORGANIZATION',
          },
        ];

      default:
        return [];
    }
  }
}

