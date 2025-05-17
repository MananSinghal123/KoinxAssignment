import axios from "axios";
import { config, CoinId } from "../config/config";
import { CryptoPrice } from "../models/CryptoPrice";

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
    usd_market_cap: number;
    usd_24h_change: number;
  };
}

export class CoinGeckoService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = config.coinGecko.baseUrl;
  }

  async fetchCryptoData(
    coinId: CoinId
  ): Promise<CoinGeckoResponse[string] | null> {
    try {
      const params = {
        ids: coinId,
        vs_currencies: "usd",
        include_market_cap: "true",
        include_24hr_change: "true",
      };

      const response = await axios.get<CoinGeckoResponse>(
        `${this.baseUrl}/simple/price`,
        { params }
      );

      return response.data[coinId] || null;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error fetching data for ${coinId}:`, error.message);
      }
      return null;
    }
  }

  async fetchAndStoreAll(): Promise<void> {
    console.log(`Fetching crypto data at ${new Date().toISOString()}`);

    for (const coinId of config.coinGecko.coins) {
      const data = await this.fetchCryptoData(coinId);

      if (data) {
        const cryptoPrice = new CryptoPrice({
          coinId,
          priceUsd: data.usd,
          marketCapUsd: data.usd_market_cap,
          priceChange24h: data.usd_24h_change,
        });

        try {
          await cryptoPrice.save();
          console.log(`Successfully stored data for ${coinId}`);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`Error storing data for ${coinId}:`, error.message);
          }
        }
      }
    }
  }
}
