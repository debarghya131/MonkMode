import arcjet, { fixedWindow } from "@arcjet/node";

const stores = new Map();
let cachedArcjetConfigSignature = "";
let cachedArcjetClient = null;

const getClientKey = (req) => req.user?.id || req.user?._id?.toString?.() || req.ip || "anonymous";
const getArcjetUserId = (req) => req.user?.clerkId || req.user?.id || req.user?._id?.toString?.() || undefined;

const normalizeArcjetMode = (value) => (String(value || "").trim().toUpperCase() === "DRY_RUN" ? "DRY_RUN" : "LIVE");

const toArcjetWindow = (windowMs) => {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    return "60s";
  }

  if (windowMs % 86_400_000 === 0) {
    return `${windowMs / 86_400_000}d`;
  }

  if (windowMs % 3_600_000 === 0) {
    return `${windowMs / 3_600_000}h`;
  }

  if (windowMs % 60_000 === 0) {
    return `${windowMs / 60_000}m`;
  }

  if (windowMs % 1_000 === 0) {
    return `${windowMs / 1_000}s`;
  }

  return `${Math.max(1, Math.ceil(windowMs / 1_000))}s`;
};

const getArcjetBaseClient = () => {
  const arcjetKey = process.env.ARCJET_KEY?.trim();

  if (!arcjetKey) {
    cachedArcjetConfigSignature = "";
    cachedArcjetClient = null;
    return null;
  }

  const proxyList = (process.env.ARCJET_PROXIES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const configSignature = `${arcjetKey}:${proxyList.join(",")}`;

  if (cachedArcjetClient && cachedArcjetConfigSignature === configSignature) {
    return cachedArcjetClient;
  }

  cachedArcjetConfigSignature = configSignature;
  cachedArcjetClient = arcjet({
    key: arcjetKey,
    characteristics: ["userId"],
    ...(proxyList.length ? { proxies: proxyList } : {}),
    rules: [],
  });

  return cachedArcjetClient;
};

const createLocalRateLimiter = ({
  windowMs = 60_000,
  max = 10,
  keyPrefix = "rate-limit",
  message = "Too many requests. Please try again shortly.",
} = {}) => {
  const storeKey = `${keyPrefix}:${windowMs}:${max}`;
  const store = stores.get(storeKey) || new Map();
  stores.set(storeKey, store);

  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${getClientKey(req)}`;
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - 1)));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));
      res.setHeader("X-RateLimit-Provider", "local");
      return next();
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
      res.setHeader("X-RateLimit-Provider", "local");
      return res.status(429).json({ message });
    }

    entry.count += 1;
    store.set(key, entry);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    res.setHeader("X-RateLimit-Provider", "local");

    if (store.size > 5000) {
      for (const [storedKey, storedEntry] of store.entries()) {
        if (storedEntry.resetAt <= now) {
          store.delete(storedKey);
        }
      }
    }

    next();
  };
};

export const createRateLimiter = ({
  windowMs = 60_000,
  max = 10,
  keyPrefix = "rate-limit",
  message = "Too many requests. Please try again shortly.",
} = {}) => {
  const localLimiter = createLocalRateLimiter({ windowMs, max, keyPrefix, message });
  const arcjetMode = normalizeArcjetMode(process.env.ARCJET_MODE);
  const arcjetWindow = toArcjetWindow(windowMs);
  let routeArcjetClient = null;
  let routeArcjetSignature = "";

  return async (req, res, next) => {
    const baseArcjetClient = getArcjetBaseClient();

    if (!baseArcjetClient) {
      return localLimiter(req, res, next);
    }

    const currentSignature = `${cachedArcjetConfigSignature}:${keyPrefix}:${arcjetWindow}:${max}:${arcjetMode}`;

    if (!routeArcjetClient || routeArcjetSignature !== currentSignature) {
      routeArcjetClient = baseArcjetClient.withRule(
        fixedWindow({
          mode: arcjetMode,
          window: arcjetWindow,
          max,
        }),
      );
      routeArcjetSignature = currentSignature;
    }

    try {
      const userId = getArcjetUserId(req);
      const decision = await routeArcjetClient.protect(req, userId ? { userId } : {});

      if (decision.isErrored()) {
        console.error(`Arcjet rate-limit error on ${keyPrefix}:`, decision.reason.message);
        return localLimiter(req, res, next);
      }

      if (decision.isDenied()) {
        res.setHeader("X-RateLimit-Provider", "arcjet");
        return res.status(429).json({ message });
      }

      res.setHeader("X-RateLimit-Provider", "arcjet");
      next();
    } catch (error) {
      console.error(`Arcjet middleware failure on ${keyPrefix}:`, error.message);
      return localLimiter(req, res, next);
    }
  };
};

export const createRateLimiterChain = (configs = []) => {
  const middlewares = configs.map((config) => createRateLimiter(config));

  return async (req, res, next) => {
    let index = 0;

    const run = async () => {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index];
      index += 1;

      return middleware(req, res, (error) => {
        if (error) {
          return next(error);
        }
        return run();
      });
    };

    return run();
  };
};
