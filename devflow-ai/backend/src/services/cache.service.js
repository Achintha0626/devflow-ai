const Redis = require("ioredis");
const { getDashboard } = require("../modules/dashboard/dashboard.service");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const DASHBOARD_CACHE_TTL = 60;
const RECONNECT_COOLDOWN_MS = 10000;
const ERROR_LOG_WINDOW_MS = 10000;

const SET_IF_GEN_MATCHES_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  redis.call('set', KEYS[2], ARGV[2], 'EX', ARGV[3])
  return 1
else
  return 0
end
`;

let cacheClient = null;
let lastFailureAt = 0;
let lastErrorLogAt = 0;

const logCacheError = (prefix, error) => {
  const now = Date.now();
  if (now - lastErrorLogAt >= ERROR_LOG_WINDOW_MS) {
    lastErrorLogAt = now;
    console.error(`[Cache] ${prefix}:`, error?.message || error);
  }
};

const getCacheClient = () => {
  if (cacheClient && (cacheClient.status === "end" || cacheClient.status === "close")) {
    try {
      cacheClient.removeAllListeners();
      cacheClient.disconnect();
    } catch {}
    cacheClient = null;
  }

  if (!cacheClient) {
    const now = Date.now();
    if (now - lastFailureAt < RECONNECT_COOLDOWN_MS) {
      return null;
    }

    try {
      const client = new Redis(REDIS_URL, {
        connectTimeout: 2000,
        commandTimeout: 2000,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (attempt) => {
          if (attempt > 3) {
            lastFailureAt = Date.now();
            return null;
          }
          return Math.min(attempt * 100, 1000);
        },
      });

      client.on("error", (error) => {
        if (cacheClient !== client) return;
        lastFailureAt = Date.now();
        logCacheError("Redis error", error);
      });

      client.on("end", () => {
        if (cacheClient !== client) return;
        lastFailureAt = Date.now();
      });

      client.on("close", () => {
        if (cacheClient !== client) return;
        lastFailureAt = Date.now();
      });

      client.on("ready", () => {
        if (cacheClient !== client) return;
        lastFailureAt = 0;
      });

      cacheClient = client;
    } catch (error) {
      lastFailureAt = Date.now();
      logCacheError("Failed to initialize client", error);
      return null;
    }
  }

  return cacheClient;
};

const getHealthyClient = () => {
  const client = getCacheClient();
  if (!client || client.status !== "ready") {
    return null;
  }
  return client;
};

const getDashboardGenKey = (projectId) => `devflow:dashboard:v1:${projectId}:gen`;

const getDashboardDataKey = (workspaceId, projectId, generation) =>
  `devflow:dashboard:v1:${workspaceId}:${projectId}:${generation}`;

const getOrInitGeneration = async (client, projectId) => {
  try {
    const genKey = getDashboardGenKey(projectId);
    let gen = await client.get(genKey);
    if (!gen) {
      await client.set(genKey, "1", "NX");
      gen = await client.get(genKey);
    }
    return gen || null;
  } catch (error) {
    lastFailureAt = Date.now();
    logCacheError("Generation error", error);
    return null;
  }
};

const get = async (key) => {
  if (!key) return null;
  const client = getHealthyClient();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch (error) {
    lastFailureAt = Date.now();
    logCacheError("Get error", error);
    return null;
  }
};

const set = async (key, value, ttlSeconds) => {
  if (!key) return false;
  const client = getHealthyClient();
  if (!client) return false;
  try {
    if (typeof ttlSeconds === "number" && ttlSeconds > 0) {
      await client.set(key, value, "EX", ttlSeconds);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    lastFailureAt = Date.now();
    logCacheError("Set error", error);
    return false;
  }
};

const invalidate = async (key) => {
  if (!key) return false;
  const client = getHealthyClient();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch (error) {
    lastFailureAt = Date.now();
    logCacheError("Invalidate error", error);
    return false;
  }
};

const invalidateProjectDashboard = async (projectId) => {
  if (!projectId) return;
  const client = getHealthyClient();
  if (!client) return;
  try {
    const genKey = getDashboardGenKey(projectId);
    await client.incr(genKey);
  } catch (error) {
    lastFailureAt = Date.now();
    logCacheError("Invalidation error", error);
  }
};

const getDashboardCached = async ({ workspaceId, projectId }) => {
  let capturedGeneration = null;
  let client = getHealthyClient();

  if (client) {
    capturedGeneration = await getOrInitGeneration(client, projectId);
  }

  if (client && capturedGeneration) {
    const dataKey = getDashboardDataKey(workspaceId, projectId, capturedGeneration);
    try {
      const cached = await client.get(dataKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            return parsed;
          }
        } catch (parseError) {
          logCacheError("Malformed JSON in cache", parseError);
        }
      }
    } catch (error) {
      lastFailureAt = Date.now();
      logCacheError("Read error", error);
    }
  }

  const freshData = await getDashboard(projectId);
  if (!freshData) {
    return freshData;
  }

  client = getHealthyClient();
  if (client && capturedGeneration) {
    try {
      const genKey = getDashboardGenKey(projectId);
      const dataKey = getDashboardDataKey(workspaceId, projectId, capturedGeneration);
      const serialized = JSON.stringify(freshData);

      await client.eval(
        SET_IF_GEN_MATCHES_SCRIPT,
        2,
        genKey,
        dataKey,
        capturedGeneration,
        serialized,
        DASHBOARD_CACHE_TTL
      );
    } catch (error) {
      lastFailureAt = Date.now();
      logCacheError("Write error", error);
    }
  }

  return freshData;
};

const closeCacheClient = async () => {
  if (!cacheClient) return;
  const client = cacheClient;
  cacheClient = null;
  lastFailureAt = 0;

  try {
    client.removeAllListeners();
  } catch {}

  let quitTimer = null;
  try {
    if (client.status === "ready") {
      await Promise.race([
        client.quit(),
        new Promise((_, reject) => {
          quitTimer = setTimeout(() => reject(new Error("Quit timeout")), 1000);
        }),
      ]);
    } else {
      client.disconnect();
    }
  } catch {
    try {
      client.disconnect();
    } catch {}
  } finally {
    if (quitTimer) clearTimeout(quitTimer);
  }
};

module.exports = {
  get,
  set,
  invalidate,
  invalidateProjectDashboard,
  getDashboardCached,
  getCacheClient,
  closeCacheClient,
};
