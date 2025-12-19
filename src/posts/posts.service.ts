import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PostType, ReactionType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createPostDto: CreatePostDto) {
    // Check if user is restricted from posting
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPostingRestricted: true, strikeCount: true },
    });

    if (user?.isPostingRestricted) {
      throw new ForbiddenException(
        `You are temporarily restricted from posting due to ${user.strikeCount} strike(s). Please review our community guidelines.`,
      );
    }
    const { content, clubId, parentPostId, images } = createPostDto;

    // If replying, verify parent post exists
    if (parentPostId) {
      const parentPost = await this.prisma.post.findUnique({
        where: { id: parentPostId },
      });

      if (!parentPost) {
        throw new NotFoundException('Parent post not found');
      }

      if (parentPost.isDeleted) {
        throw new BadRequestException('Cannot reply to deleted post');
      }
    }

    // If posting to club, verify user is a member
    if (clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: clubId },
        include: { members: true },
      });

      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const isMember = club.members.some((member) => member.id === userId);
      if (!isMember) {
        throw new ForbiddenException('You must be a member of the club to post');
      }
    }

    const post = await this.prisma.post.create({
      data: {
        userId,
        clubId: clubId || null,
        parentPostId: parentPostId || null,
        content,
        images: images || [],
        type: parentPostId ? PostType.REPLY : PostType.POST,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        parentPost: parentPostId
          ? {
              include: {
                author: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    profileImage: true,
                  },
                },
              },
            }
          : undefined,
        _count: {
          select: {
            replies: true,
            comments: true,
            reactions: true,
          },
        },
      },
    });

    // Create activity
    await this.prisma.activity.create({
      data: {
        userId,
        type: 'POST_CREATED',
        title: 'Created a post',
        description: parentPostId ? 'Replied to a post' : 'Created a new post',
        link: `/posts/${post.id}`,
        clubId: clubId || null,
      },
    });

    // Notify parent post author if this is a reply
    if (parentPostId) {
      const parentPost = await this.prisma.post.findUnique({
        where: { id: parentPostId },
        select: { userId: true },
      });

      if (parentPost && parentPost.userId !== userId) {
        await this.notificationsService.createAndSend(parentPost.userId, {
          title: 'New Reply',
          message: `${post.author.firstName} ${post.author.lastName} replied to your post`,
          type: 'OTHER',
          link: `/posts/${post.id}`,
        });
      }
    }

    return post;
  }

  async findAll(
    userId?: string,
    clubId?: string,
    parentPostId?: string,
    limit = 20,
    cursor?: string,
  ) {
    const where: any = {
      isDeleted: false,
      isHidden: false, // Hide posts that admins have hidden
      ...(clubId && { clubId }),
      ...(parentPostId && { parentPostId }),
      ...(!parentPostId && { parentPostId: null }), // Only top-level posts if no parentPostId
    };

    const posts = await this.prisma.post.findMany({
      where,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        parentPost: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
            comments: true,
            reactions: true,
          },
        },
        reactions: userId
          ? {
              where: { userId },
              select: { type: true },
            }
          : false,
      },
    });

    const hasMore = posts.length > limit;
    if (hasMore) {
      posts.pop();
    }

    return {
      posts,
      hasMore,
      nextCursor: hasMore ? posts[posts.length - 1].id : null,
    };
  }

  async findOne(id: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id, isDeleted: false, isHidden: false },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
            image: true,
            category: true,
          },
        },
        parentPost: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
        replies: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
            _count: {
              select: {
                replies: true,
                comments: true,
                reactions: true,
              },
            },
            reactions: userId
              ? {
                  where: { userId },
                  select: { type: true },
                }
              : false,
          },
        },
        comments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
            comments: true,
            reactions: true,
          },
        },
        reactions: userId
          ? {
              where: { userId },
              select: { type: true },
            }
          : false,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async update(id: string, userId: string, content: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    return this.prisma.post.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            replies: true,
            comments: true,
            reactions: true,
          },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    return this.prisma.post.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async react(postId: string, userId: string, type: ReactionType) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existingReaction = await this.prisma.postReaction.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Remove reaction if same type
        await this.prisma.postReaction.delete({
          where: {
            postId_userId: {
              postId,
              userId,
            },
          },
        });
        return { reacted: false, type: null };
      } else {
        // Update reaction type
        await this.prisma.postReaction.update({
          where: {
            postId_userId: {
              postId,
              userId,
            },
          },
          data: { type },
        });
        return { reacted: true, type };
      }
    }

    // Create new reaction
    await this.prisma.postReaction.create({
      data: {
        postId,
        userId,
        type,
      },
    });

    // Notify post author (if not own post)
    if (post.userId !== userId) {
      await this.notificationsService.createAndSend(post.userId, {
        title: 'New Reaction',
        message: `Someone reacted to your post`,
        type: 'OTHER',
        link: `/posts/${postId}`,
      });
    }

    return { reacted: true, type };
  }

  async createComment(postId: string, userId: string, createCommentDto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.isDeleted) {
      throw new BadRequestException('Cannot comment on deleted post');
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        userId,
        content: createCommentDto.content,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    // Create activity
    await this.prisma.activity.create({
      data: {
        userId,
        type: 'COMMENT_ADDED',
        title: 'Commented on a post',
        description: 'Added a comment',
        link: `/posts/${postId}`,
      },
    });

    // Notify post author (if not own post)
    if (post.userId !== userId) {
      await this.notificationsService.createAndSend(post.userId, {
        title: 'New Comment',
        message: `${comment.author.firstName} ${comment.author.lastName} commented on your post`,
        type: 'OTHER',
        link: `/posts/${postId}`,
      });
    }

    return comment;
  }

  async getComments(postId: string, limit = 20, cursor?: string) {
    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        isDeleted: false,
      },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    const hasMore = comments.length > limit;
    if (hasMore) {
      comments.pop();
    }

    return {
      comments,
      hasMore,
      nextCursor: hasMore ? comments[comments.length - 1].id : null,
    };
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
  }

  async getReactions(postId: string) {
    const reactions = await this.prisma.postReaction.groupBy({
      by: ['type'],
      where: { postId },
      _count: {
        type: true,
      },
    });

    return reactions.map((r) => ({
      type: r.type,
      count: r._count.type,
    }));
  }
}

