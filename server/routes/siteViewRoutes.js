import express from "express";
import { getSiteViewCount, recordSiteView } from "../controllers/siteViewController.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();
const siteViewLimiter = createRateLimiter({
  keyPrefix: "site-view",
  windowMs: 60_000,
  max: 30,
  message: "Too many view requests. Please try again shortly.",
});

router.get("/", siteViewLimiter, getSiteViewCount);
router.post("/", siteViewLimiter, recordSiteView);

export default router;
