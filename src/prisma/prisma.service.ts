import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Enhance DATABASE_URL with connection pool parameters before PrismaClient is instantiated
if (process.env.DATABASE_URL) {
  try {
    const urlObj = new URL(process.env.DATABASE_URL);
    const hostname = urlObj.hostname;
    
    // Detect if using Neon pooler or other connection pooler
    const isUsingPooler = hostname.includes('pooler') || hostname.includes('-pooler.');
    
    // Always set connection pool parameters (override if already present to ensure correct values)
    // For pooler endpoints (like Neon), the pooler manages the overall pool,
    // but each application instance can still use multiple connections (5-10 recommended)
    // For direct connections, use a higher limit
    const connectionLimit = isUsingPooler ? '10' : '15';
    urlObj.searchParams.set('connection_limit', connectionLimit);
    if (!urlObj.searchParams.has('pool_timeout')) {
      urlObj.searchParams.set('pool_timeout', '30');
    }
    if (!urlObj.searchParams.has('connect_timeout')) {
      urlObj.searchParams.set('connect_timeout', '15');
    }
    // Disable statement caching to prevent connection issues
    if (!urlObj.searchParams.has('statement_cache_size')) {
      urlObj.searchParams.set('statement_cache_size', '0');
    }

    const enhancedUrl = urlObj.toString();
    process.env.DATABASE_URL = enhancedUrl;
    const limit = urlObj.searchParams.get('connection_limit');
    const timeout = urlObj.searchParams.get('pool_timeout');
    console.log(`✅ Enhanced DATABASE_URL with connection pool parameters (limit: ${limit}, timeout: ${timeout}s${isUsingPooler ? ', using pooler settings' : ''})`);
  } catch (error) {
    // If URL parsing fails, use original URL
    console.warn('⚠️ Failed to parse DATABASE_URL, using as-is');
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    // Handle Prisma connection errors with automatic reconnection
    this.$on('error' as never, (e: any) => {
      this.logger.error('Prisma error:', e);
      
      // Check if it's a connection closed error
      if (e.message?.includes('Closed') || e.message?.includes('Connection')) {
        this.logger.warn('Database connection lost, attempting to reconnect...');
        this.handleReconnect();
      }
    });

    // Handle query errors that might indicate connection issues
    this.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (error: any) {
        // Check if error is due to closed connection
        if (error.code === 'P1001' || error.message?.includes('Closed')) {
          this.logger.warn('Connection error during query, attempting to reconnect...');
          await this.handleReconnect();
          // Retry the query once after reconnection
          try {
            return await next(params);
          } catch (retryError) {
            this.logger.error('Query failed after reconnection attempt:', retryError);
            throw retryError;
          }
        }
        throw error;
      }
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma connected to database');
      this.reconnectAttempts = 0; // Reset on successful connection
      
      // Set up periodic connection health check
      this.startHealthCheck();
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      // Attempt reconnection
      await this.handleReconnect();
    }
  }

  async onModuleDestroy() {
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    try {
      await this.$disconnect();
      this.logger.log('✅ Prisma disconnected from database');
    } catch (error) {
      this.logger.error('❌ Error disconnecting from database:', error);
    }
  }

  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    this.reconnectAttempts++;
    this.logger.warn(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    try {
      // Disconnect if already connected
      try {
        await this.$disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }

      // Wait before reconnecting
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

      // Attempt to reconnect
      await this.$connect();
      this.logger.log('✅ Successfully reconnected to database');
      this.reconnectAttempts = 0; // Reset on successful reconnection
    } catch (error) {
      this.logger.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      
      // Exponential backoff for next attempt
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const nextDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        this.logger.warn(`Retrying in ${nextDelay}ms...`);
        setTimeout(() => this.handleReconnect(), nextDelay);
      }
    }
  }

  private healthCheckInterval: NodeJS.Timeout | null = null;

  private startHealthCheck() {
    // Check connection health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        // Simple query to check connection
        await this.$queryRaw`SELECT 1`;
      } catch (error: any) {
        this.logger.warn('Health check failed, connection may be lost:', error.message);
        if (error.code === 'P1001' || error.message?.includes('Closed')) {
          await this.handleReconnect();
        }
      }
    }, 30000); // Every 30 seconds
  }

  async ensureConnection() {
    try {
      // Quick check if connection is alive
      await this.$queryRaw`SELECT 1`;
    } catch (error: any) {
      if (error.code === 'P1001' || error.message?.includes('Closed')) {
        this.logger.warn('Connection check failed, reconnecting...');
        await this.handleReconnect();
      }
    }
  }
}

