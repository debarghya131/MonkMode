const stores = new Map();

const getClientKey = (req) => req.user?.id || req.user?._id?.toString?.() || req.ip || "anonymous";

export const createRateLimiter = ({
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
      return next();
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
      return res.status(429).json({ message });
    }

    entry.count += 1;
    store.set(key, entry);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

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
