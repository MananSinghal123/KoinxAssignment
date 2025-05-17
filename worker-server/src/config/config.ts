import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

interface Config {
  nats: {
    uri: string;
  };
}

export const config: Config = {
  nats: {
    uri: process.env.NATS_URI || "nats://localhost:4222",
  },
}; 