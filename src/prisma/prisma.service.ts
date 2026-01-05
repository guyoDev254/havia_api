import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Enhance DATABASE_URL with connection pool parameters before PrismaClient is instantiated
if (process.env.DATABASE_URL) {
  try {
    const urlObj = new URL(process.env.DATABASE_URL);
    const hostname = urlObj.hostname;
    
    // Detect if using Neon pooler or other connection pooler
    const isUsingPooler = hostname.includes('pooler') || hostname.includes('-pooler.');
    
    // Set connection pool parameters if not already present
    if (!urlObj.searchParams.has('connection_limit')) {
      // For pooler endpoints (like Neon), use connection_limit=1 as the pooler manages connections
      // For direct connections, use a higher limit
      const connectionLimit = isUsingPooler ? '1' : '10';
      urlObj.searchParams.set('connection_limit', connectionLimit);
    }
    if (!urlObj.searchParams.has('pool_timeout')) {
      urlObj.searchParams.set('pool_timeout', '10');
    }

    const enhancedUrl = urlObj.toString();
    if (enhancedUrl !== process.env.DATABASE_URL) {
      process.env.DATABASE_URL = enhancedUrl;
      const limit = urlObj.searchParams.get('connection_limit');
      const timeout = urlObj.searchParams.get('pool_timeout');
      console.log(`✅ Enhanced DATABASE_URL with connection pool parameters (limit: ${limit}, timeout: ${timeout}s${isUsingPooler ? ', using pooler settings' : ''})`);
    }
  } catch (error) {
    // If URL parsing fails, use original URL
    console.warn('⚠️ Failed to parse DATABASE_URL, using as-is');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Handle Prisma connection errors
    this.$on('error' as never, (e: any) => {
      this.logger.error('Prisma error:', e);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma connected to database');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('✅ Prisma disconnected from database');
    } catch (error) {
      this.logger.error('❌ Error disconnecting from database:', error);
    }
  }
}

