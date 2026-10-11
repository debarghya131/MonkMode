const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"];

export function createCorsOptions(env = process.env) {
  const production = env.NODE_ENV === "production";
  const configured = (env.CORS_ORIGINS || "").split(",").map(origin => origin.trim()).filter(Boolean);
  const allowed = new Set(production ? configured : [...DEV_ORIGINS, ...configured]);
  const local = origin => {
    if (production) return false;
    try {
      const { hostname, protocol } = new URL(origin);
      return protocol === "http:" && (hostname === "localhost" || hostname === "127.0.0.1");
    } catch { return false; }
  };
  return {
    origin(origin, callback) {
      if (!origin || allowed.has(origin) || local(origin)) return callback(null, true);
      callback(Object.assign(new Error("CORS origin not allowed"), { code: "CORS_ORIGIN_DENIED" }));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}

export function corsErrorHandler(error, _req, res, next) {
  if (error?.code !== "CORS_ORIGIN_DENIED" || res.headersSent) return next(error);
  return res.status(403).json({ message: "CORS origin not allowed" });
}
