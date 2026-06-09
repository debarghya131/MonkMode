import SiteMetric from "../models/SiteMetric.js";
import SiteVisitor from "../models/SiteVisitor.js";

const TOTAL_VIEWS_KEY = "total-site-views";
const VISITOR_ID_PATTERN = /^[a-zA-Z0-9-]{16,120}$/;

const getCurrentCount = async () => {
  const metric = await SiteMetric.findOne({ key: TOTAL_VIEWS_KEY }).lean();
  return metric?.count ?? 0;
};

export const getSiteViewCount = async (_req, res) => {
  try {
    res.status(200).json({ count: await getCurrentCount() });
  } catch (error) {
    res.status(500).json({
      message: "Unable to load site views",
      error: error.message,
    });
  }
};

export const recordSiteView = async (req, res) => {
  try {
    const visitorId = String(req.body?.visitorId || "").trim();

    if (!VISITOR_ID_PATTERN.test(visitorId)) {
      return res.status(400).json({ message: "A valid visitor ID is required" });
    }

    try {
      await SiteVisitor.create({ visitorId });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(200).json({
          count: await getCurrentCount(),
          counted: false,
        });
      }

      throw error;
    }

    const metric = await SiteMetric.findOneAndUpdate(
      { key: TOTAL_VIEWS_KEY },
      {
        $inc: { count: 1 },
        $setOnInsert: { key: TOTAL_VIEWS_KEY },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    res.status(200).json({ count: metric.count, counted: true });
  } catch (error) {
    res.status(500).json({
      message: "Unable to record site view",
      error: error.message,
    });
  }
};
