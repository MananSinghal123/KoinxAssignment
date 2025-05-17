import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

interface Config {
  redis: {
    url: string;
  };
}

export const config: Config = {
  redis: {
    url: process.env.REDIS_URL ||""
  },
};