const createRateLimiter = (options = {}) => {
  const windowMs = Number(options.windowMs) || 15 * 60 * 1000;
  const max = Number(options.max) || 20;
  const message = options.message || "Too many authentication attempts. Please try again later.";
  const keyGenerator = options.keyGenerator || ((req) => req.ip || req.socket?.remoteAddress || "unknown");

  const hits = new Map();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }, Math.max(windowMs, 60000));

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const middleware = (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const timestamps = hits.get(key) || [];
    const valid = timestamps.filter((t) => now - t < windowMs);

    if (valid.length >= max) {
      const oldest = valid[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil((oldest + windowMs) / 1000)));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    valid.push(now);
    hits.set(key, valid);

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - valid.length)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));

    next();
  };

  middleware.reset = () => {
    hits.clear();
  };

  middleware.destroy = () => {
    clearInterval(cleanupInterval);
    hits.clear();
  };

  return middleware;
};

module.exports = {
  createRateLimiter,
};
