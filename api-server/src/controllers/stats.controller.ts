import { Request, Response } from "express";
import { CryptoPrice } from "../models/CryptoPrice";
import { CoinId } from "../config/config";
import { NextFunction, RequestHandler } from "express-serve-static-core";
import axios from "axios";
import { config } from "../config/config";

// Supported coins
const SUPPORTED_COINS = ["bitcoin", "matic-network", "ethereum"] as const;

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
    usd_market_cap: number;
    usd_24h_change: number;
  };
}

// Function to calculate standard deviation
const calculateStandardDeviation = (prices: number[]): number => {
  const n = prices.length;
  if (n === 0) return 0;

  const mean = prices.reduce((acc, price) => acc + price, 0) / n;
  const variance = prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / n;
  return Math.sqrt(variance);
};

// Controller function to store cryptocurrency stats
export const storeCryptoStats: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const params = {
      ids: SUPPORTED_COINS.join(","),
      vs_currencies: "usd",
      include_market_cap: "true",
      include_24hr_change: "true",
    };

    const response = await axios.get<CoinGeckoResponse>(
      `${config.coinGecko.baseUrl}/simple/price`,
      { params }
    );

    const results = [];
    for (const coinId of SUPPORTED_COINS) {
      const data = response.data[coinId];
      if (data) {
        const cryptoPrice = new CryptoPrice({
          coinId,
          priceUsd: data.usd,
          marketCapUsd: data.usd_market_cap,
          priceChange24h: data.usd_24h_change,
        });

        await cryptoPrice.save();
        results.push({ coinId, status: "success" });
      } else {
        results.push({ coinId, status: "failed", error: "No data received" });
      }
    }

    res.json({ message: "Crypto stats stored", results });
  } catch (error) {
    console.error("Error storing crypto stats:", error);
    res.status(500).json({ error: "Failed to store crypto stats" });
  }
};

// Controller function to get cryptocurrency stats
export const getCryptoStats: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const coinId = req.query.coin as CoinId;

  if (!coinId || !SUPPORTED_COINS.includes(coinId)) {
    res.status(400).json({ error: "Invalid or missing 'coin' parameter" });
    return;
  }

  try {
    // Fetch coin data from MongoDB
    const coinData = await CryptoPrice.findOne({ coinId })
      .sort({ createdAt: -1 })
      .limit(1);

    if (!coinData) {
      res.status(404).json({ error: "Coin data not found" });
      return;
    }

    // Send the response with coin data
    res.json({
      price: coinData.priceUsd,
      marketCap: coinData.marketCapUsd,
      "24hChange": coinData.priceChange24h,
    });
  } catch (error) {
    console.error("Error fetching coin data from MongoDB:", error);
    res.status(500).json({ error: "Failed to fetch coin data" });
  }
};

// Controller function to get price deviation
export const getPriceDeviation: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const coinId = req.query.coin as CoinId;

  if (!coinId || !SUPPORTED_COINS.includes(coinId)) {
    res.status(400).json({ error: "Invalid or missing 'coin' parameter" });
    return;
  }

  try {
    // Fetch the last 100 records from the database
    const prices = await CryptoPrice.find({ coinId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("priceUsd -_id");

    if (prices.length === 0) {
      res.status(404).json({ error: "No price records found for the specified coin" });
      return;
    }

    // Extract price values into an array
    const priceValues = prices.map((record) => record.priceUsd);

    // Calculate the standard deviation
    const deviation = calculateStandardDeviation(priceValues);

    // Send the response
    res.json({ deviation: parseFloat(deviation.toFixed(2)) });
  } catch (error) {
    console.error("Error calculating price deviation:", error);
    res.status(500).json({ error: "Failed to calculate price deviation" });
  }
};

