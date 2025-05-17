// worker-server.ts
import { connect, NatsConnection } from 'nats';
import cron from 'node-cron';
import { config } from './config/config';

class WorkerServer {
  private natsConnection: NatsConnection | null = null;
  private readonly natsUrl: string;
  private readonly eventSubject: string;

  constructor() {
    // Use the NATS URL from config or default to localhost
    this.natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
    this.eventSubject = 'crypto.trigger.update';
  }

  /**
   * Connect to the NATS server
   */
  private async connectToNats(): Promise<void> {
    try {
      console.log(`Connecting to NATS server at ${this.natsUrl}...`);
      this.natsConnection = await connect({ servers: this.natsUrl });
      console.log(`Connected to NATS server at ${this.natsConnection.getServer()}`);
    } catch (error) {
      console.error('Failed to connect to NATS server:', error);
      throw error;
    }
  }

  /**
   * Publish an update trigger event
   */
  private async publishUpdateTrigger(): Promise<void> {
    if (!this.natsConnection) {
      throw new Error('Not connected to NATS server');
    }

    const message = {
      trigger: 'update',
      timestamp: new Date().toISOString()
    };

    try {
      console.log(`Publishing update trigger to ${this.eventSubject}: ${JSON.stringify(message)}`);
      this.natsConnection.publish(this.eventSubject, JSON.stringify(message));
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
      
      if (this.natsConnection) {
        console.log('Closing NATS connection...');
        await this.natsConnection.close();
        console.log('NATS connection closed');
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
      // Connect to NATS
      await this.connectToNats();
      
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