import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

interface Config {
  mongodb: {
    uri: string;
  };
  coinGecko: {
    baseUrl: string;
    coins: readonly ["bitcoin", "matic-network", "ethereum"];
  };
  redis: {
    url: string;
  };
  server: {
    port: number;
  };
}

export const config: Config = {
  mongodb: {
    uri: process.env.MONGODB_URI || "https://api.coingecko.com/api/v3",
  },
  coinGecko: {
    baseUrl: "https://api.coingecko.com/api/v3",
    coins: ["bitcoin", "matic-network", "ethereum"] as const,
  },
  redis: {
    url: process.env.UPSTASH_REDIS_URL || "",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
  },
};

// Type for supported coin IDs
export type CoinId = (typeof config.coinGecko.coins)[number];
