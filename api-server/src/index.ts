import express, { Express } from "express";
import mongoose from "mongoose";
import { config } from "./config/config";
import router from "./routes/route";
import cors from "cors";
import { createClient } from 'redis';
import { storeCryptoStats } from "./controllers/stats.controller";

class App {
  private readonly app: Express;
  private redisClient: ReturnType<typeof createClient> | null = null;
  private readonly eventChannel = "crypto.update";

  constructor() {
    this.app = express();
  }

  private async connectToDatabase(): Promise<void> {
    try {
      await mongoose.connect(config.mongodb.uri);
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      process.exit(1);
    }
  }

  private setupMiddleware(): void {
    this.app.use(cors({ origin: "*" }));
    this.app.use(express.json());
    this.app.use("/api", router);
  }

  private async connectToRedis(): Promise<void> {
    try {
      console.log("Connecting to Redis server...");
      this.redisClient = createClient({
        url: config.redis.url
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

  private async setupRedisSubscription(): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Not connected to Redis server');
    }

    try {
      const subscriber = this.redisClient.duplicate();
      await subscriber.connect();
      await subscriber.subscribe(this.eventChannel, async (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.trigger === "update") {
            console.log("Received update trigger, fetching crypto stats...");
            // Create a mock request and response object
            const mockReq = {} as any;
            const mockRes = {
              json: (data: any) => console.log("Stats update response:", data),
              status: (code: number) => ({
                json: (data: any) => console.log(`Stats update error (${code}):`, data),
              }),
            } as any;
            const mockNext = () => {}; // Add empty next function
            await storeCryptoStats(mockReq, mockRes, mockNext);
          }
        } catch (error) {
          console.error("Error processing Redis message:", error);
        }
      });
      console.log(`Subscribed to Redis channel: ${this.eventChannel}`);
    } catch (error) {
      console.error("Error setting up Redis subscription:", error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Connect to MongoDB
      await this.connectToDatabase();
      console.log("Setting up middleware");
      // Setup middleware
      this.setupMiddleware();

      // Connect to Redis and setup subscription
      await this.connectToRedis();
      await this.setupRedisSubscription();

      // Start the server
      const port = config.server.port;
      this.app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
        console.log("Crypto price tracker started successfully");
      });

      // Handle graceful shutdown
      process.on("SIGTERM", async () => {
        console.log("SIGTERM received. Starting graceful shutdown...");
        await this.shutdown();
      });

      process.on("SIGINT", async () => {
        console.log("SIGINT received. Starting graceful shutdown...");
        await this.shutdown();
      });
    } catch (error) {
      console.error("Error starting the application:", error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    try {
      await mongoose.connection.close();
      if (this.redisClient) {
        await this.redisClient.quit();
        console.log("Redis connection closed");
      }
      console.log("MongoDB connection closed");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  }
}

// Create and start the application
const app = new App();
app.start().catch((error) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});

// Export for testing purposes
export default App;
