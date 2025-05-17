import mongoose, { Document, Schema } from "mongoose";
import { CoinId } from "../config/config";

export interface ICryptoPrice extends Document {
  coinId: CoinId;
  priceUsd: number;
  marketCapUsd: number;
  priceChange24h: number;
  createdAt: Date;
}

const CryptoPriceSchema = new Schema<ICryptoPrice>({
  coinId: {
    type: String,
    required: true,
    index: true,
  },
  priceUsd: {
    type: Number,
    required: true,
  },
  marketCapUsd: {
    type: Number,
    required: true,
  },
  priceChange24h: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Create compound index for efficient queries
CryptoPriceSchema.index({ coinId: 1, createdAt: -1 });

export const CryptoPrice = mongoose.model<ICryptoPrice>(
  "CryptoPrice",
  CryptoPriceSchema
);
