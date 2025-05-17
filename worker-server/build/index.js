"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// worker-server.ts
const redis_1 = require("redis");
const node_cron_1 = __importDefault(require("node-cron"));
const config_1 = require("./config/config");
class WorkerServer {
    constructor() {
        this.redisClient = null;
        this.redisUrl = config_1.config.redis.url;
        this.eventChannel = 'crypto.update';
    }
    /**
     * Connect to the Redis server
     */
    connectToRedis() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Connecting to Redis server...`);
                this.redisClient = (0, redis_1.createClient)({
                    url: this.redisUrl
                });
                this.redisClient.on('error', (err) => console.error('Redis Client Error:', err));
                this.redisClient.on('connect', () => console.log('Connected to Redis'));
                yield this.redisClient.connect();
                console.log('Connected to Redis server');
            }
            catch (error) {
                console.error('Failed to connect to Redis server:', error);
                throw error;
            }
        });
    }
    /**
     * Publish an update trigger event
     */
    publishUpdateTrigger() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.redisClient) {
                throw new Error('Not connected to Redis server');
            }
            const message = {
                trigger: 'update',
                timestamp: new Date().toISOString()
            };
            try {
                console.log(`Publishing update trigger to ${this.eventChannel}: ${JSON.stringify(message)}`);
                yield this.redisClient.publish(this.eventChannel, JSON.stringify(message));
                console.log('Message published successfully');
            }
            catch (error) {
                console.error('Error publishing message:', error);
                throw error;
            }
        });
    }
    /**
     * Schedule the background job
     */
    scheduleUpdateJob() {
        // Run every 15 minutes: '*/15 * * * *'
        node_cron_1.default.schedule('*/15 * * * *', () => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Running scheduled update job');
                yield this.publishUpdateTrigger();
            }
            catch (error) {
                console.error('Error in scheduled job:', error);
            }
        }));
        console.log('Update job scheduled to run every 15 minutes');
    }
    /**
     * Set up shutdown handlers
     */
    setupShutdownHandlers() {
        const shutdown = (signal) => __awaiter(this, void 0, void 0, function* () {
            console.log(`${signal} received. Starting graceful shutdown...`);
            if (this.redisClient) {
                console.log('Closing Redis connection...');
                yield this.redisClient.quit();
                console.log('Redis connection closed');
            }
            process.exit(0);
        });
        // Handle termination signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    /**
     * Start the worker server
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Connect to Redis
                yield this.connectToRedis();
                // Setup shutdown handlers
                this.setupShutdownHandlers();
                // Send initial update trigger
                yield this.publishUpdateTrigger();
                // Schedule recurring job
                this.scheduleUpdateJob();
                console.log('Worker server started successfully');
            }
            catch (error) {
                console.error('Failed to start worker server:', error);
                process.exit(1);
            }
        });
    }
}
// Create and start the worker server
const workerServer = new WorkerServer();
workerServer.start().catch((error) => {
    console.error('Failed to start worker server:', error);
    process.exit(1);
});
