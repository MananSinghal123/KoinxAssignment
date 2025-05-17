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
const nats_1 = require("nats");
const node_cron_1 = __importDefault(require("node-cron"));
class WorkerServer {
    constructor() {
        this.natsConnection = null;
        // Use the NATS URL from config or default to localhost
        this.natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
        this.eventSubject = 'crypto.trigger.update';
    }
    /**
     * Connect to the NATS server
     */
    connectToNats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Connecting to NATS server at ${this.natsUrl}...`);
                this.natsConnection = yield (0, nats_1.connect)({ servers: this.natsUrl });
                console.log(`Connected to NATS server at ${this.natsConnection.getServer()}`);
            }
            catch (error) {
                console.error('Failed to connect to NATS server:', error);
                throw error;
            }
        });
    }
    /**
     * Publish an update trigger event
     */
    publishUpdateTrigger() {
        return __awaiter(this, void 0, void 0, function* () {
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
            if (this.natsConnection) {
                console.log('Closing NATS connection...');
                yield this.natsConnection.close();
                console.log('NATS connection closed');
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
                // Connect to NATS
                yield this.connectToNats();
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
