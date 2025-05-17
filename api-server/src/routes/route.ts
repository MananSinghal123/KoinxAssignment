import express, { Router } from "express";
import { getCryptoStats, storeCryptoStats, getPriceDeviation } from "../controllers/stats.controller";

const router: Router = express.Router();

// Define the /stats route, handled by getCryptoStats controller
router.get("/stats", getCryptoStats);

// Define the /stats/store route, handled by storeCryptoStats controller
router.post("/stats/store", storeCryptoStats);

// Define the /deviation route, handled by getPriceDeviation controller
router.get("/deviation", getPriceDeviation);

export default router;
