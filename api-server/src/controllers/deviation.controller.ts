import { Request, Response } from "express";
import { CryptoPrice } from "../models/CryptoPrice";

// Function to calculate standard deviation
const calculateStandardDeviation = (prices: number[]): number => {
  const n = prices.length;
  if (n === 0) return 0;

  const mean = prices.reduce((acc, price) => acc + price, 0) / n;
  const variance =
    prices.reduce((acc, price) => acc + (price - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
};

// Controller function to get the standard deviation of cryptocurrency prices
export const getPriceDeviation = async (
  req: Request,
  res: Response
): Promise<void> => {
  const coinId = req.query.coinId as string; // Expecting query param "coin"

  if (!coinId || !["bitcoin", "matic-network", "ethereum"].includes(coinId)) {
    res.status(400).json({ error: "Invalid or missing 'coinId' parameter" });

    return;
  }

  try {
    // Fetch the last 100 records from the database
    const prices = await CryptoPrice.find({ coinId })
      .sort({ timestamp: -1 }) // Assuming you have a timestamp field to sort by
      .limit(100)
      .select("priceUsd -_id"); // Only select the price field

    if (prices.length === 0) {
      res
        .status(404)
        .json({ error: "No records found for the specified coin" });
      return;
    }

    // Extract price values into an array
    const priceValues = prices.map((record) => record.priceUsd);

    // Calculate the standard deviation
    const deviation = calculateStandardDeviation(priceValues);

    // Send the response
    res.json({ deviation: parseFloat(deviation.toFixed(2)) }); // Format to 2 decimal places
    return;
  } catch (error) {
    console.error("Error fetching coin price records:", error);
    res.status(500).json({ error: "Failed to fetch price records" });
    return;
  }
};
