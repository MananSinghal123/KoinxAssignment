// worker-server.ts
import { createClient } from 'redis';
import cron from 'node-cron';
import { config } from './config/config';

class WorkerServer {
  private redisClient: ReturnType<typeof createClient> | null = null;
  private readonly redisUrl: string;
  private readonly eventChannel: string;

  constructor() {
    this.redisUrl = config.redis.url;
    this.eventChannel = 'crypto.update';
  }

  /**
   * Connect to the Redis server
   */
  private async connectToRedis(): Promise<void> {
    try {
      console.log(`Connecting to Redis server...`);
      this.redisClient = createClient({
        url: this.redisUrl
      });

      this.redisClient.on('error', (err: any) => console.error('Redis Client Error:', err));
      this.redisClient.on('connect', () => console.log('Connected to Redis'));
      await this.redisClient.connect();
      console.log('Connected to Redis server');
    } catch (error) {
      console.error('Failed to connect to Redis server:', error);
      throw error;
    }
  }

  /**
   * Publish an update trigger event
   */
  private async publishUpdateTrigger(): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Not connected to Redis server');
    }
    const message = {
      trigger: 'update',
      timestamp: new Date().toISOString()
    };
    try {
      console.log(`Publishing update trigger to ${this.eventChannel}: ${JSON.stringify(message)}`);
      await this.redisClient.publish(this.eventChannel, JSON.stringify(message));
      console.log('Message published successfully');
    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  }

  /**
   * Schedule the background job
   */
  private scheduleUpdateJob(): void {
    // Run every 15 minutes: '*/15 * * * *'
    cron.schedule('*/15 * * * *', async () => {
      try {
        console.log('Running scheduled update job');
        await this.publishUpdateTrigger();
      } catch (error) {
        console.error('Error in scheduled job:', error);
      }
    });
    console.log('Update job scheduled to run every 15 minutes');
  }

  /**
   * Set up shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string): Promise<void> => {
      console.log(`${signal} received. Starting graceful shutdown...`);
      if (this.redisClient) {
        console.log('Closing Redis connection...');
        await this.redisClient.quit();
        console.log('Redis connection closed');
      }
      process.exit(0);
    };

    // Handle termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Start the worker server
   */
  public async start(): Promise<void> {
    try {
      // Connect to Redis
      await this.connectToRedis();
      
      // Setup shutdown handlers
      this.setupShutdownHandlers();
      
      // Send initial update trigger
      await this.publishUpdateTrigger();
      
      // Schedule recurring job
      this.scheduleUpdateJob();
      
      console.log('Worker server started successfully');
    } catch (error) {
      console.error('Failed to start worker server:', error);
      process.exit(1);
    }
  }
}

// Create and start the worker server
const workerServer = new WorkerServer();
workerServer.start().catch((error) => {
  console.error('Failed to start worker server:', error);
  process.exit(1);
});