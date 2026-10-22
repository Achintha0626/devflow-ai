const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter } = require("../src/middleware/rateLimiter");

describe("Authentication Rate Limiting", () => {
  const createMockReqRes = (ip = "192.168.1.100") => {
    const req = {
      ip,
      socket: { remoteAddress: ip },
    };
    const headers = {};
    let statusCode = 200;
    let jsonBody = null;

    const res = {
      setHeader: (key, val) => {
        headers[key.toLowerCase()] = val;
      },
      getHeader: (key) => headers[key.toLowerCase()],
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (body) => {
        jsonBody = body;
        return res;
      },
      _getHeaders: () => headers,
      _getStatusCode: () => statusCode,
      _getJsonBody: () => jsonBody,
    };

    return { req, res };
  };

  test("allows requests up to configured maximum within window", () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      max: 3,
      message: "Rate limit exceeded",
    });

    for (let i = 0; i < 3; i++) {
      const { req, res } = createMockReqRes();
      let nextCalled = false;
      limiter(req, res, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true);
      assert.equal(res._getStatusCode(), 200);
      assert.equal(res.getHeader("x-ratelimit-remaining"), String(2 - i));
      assert.equal(res.getHeader("x-ratelimit-limit"), "3");
    }

    limiter.destroy();
  });

  test("returns 429 and rate limit headers when limit is exceeded", () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      max: 2,
      message: "Too many login attempts. Please try again later.",
    });

    for (let i = 0; i < 2; i++) {
      const { req, res } = createMockReqRes();
      limiter(req, res, () => {});
    }

    const { req: blockedReq, res: blockedRes } = createMockReqRes();
    let nextCalled = false;
    limiter(blockedReq, blockedRes, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(blockedRes._getStatusCode(), 429);
    assert.deepEqual(blockedRes._getJsonBody(), {
      success: false,
      message: "Too many login attempts. Please try again later.",
    });
    assert.equal(blockedRes.getHeader("x-ratelimit-remaining"), "0");
    assert.equal(blockedRes.getHeader("x-ratelimit-limit"), "2");
    assert.ok(Number(blockedRes.getHeader("retry-after")) >= 1);
    assert.ok(Number(blockedRes.getHeader("x-ratelimit-reset")) > 0);

    limiter.destroy();
  });

  test("tracks different client IPs independently", () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      max: 1,
    });

    const client1 = createMockReqRes("10.0.0.1");
    let next1 = false;
    limiter(client1.req, client1.res, () => {
      next1 = true;
    });
    assert.equal(next1, true);

    const client1Again = createMockReqRes("10.0.0.1");
    let next1Again = false;
    limiter(client1Again.req, client1Again.res, () => {
      next1Again = true;
    });
    assert.equal(next1Again, false);
    assert.equal(client1Again.res._getStatusCode(), 429);

    const client2 = createMockReqRes("10.0.0.2");
    let next2 = false;
    limiter(client2.req, client2.res, () => {
      next2 = true;
    });
    assert.equal(next2, true);
    assert.equal(client2.res._getStatusCode(), 200);

    limiter.destroy();
  });

  test("reset clears tracked request counts", () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      max: 1,
    });

    const client = createMockReqRes("192.168.1.50");
    limiter(client.req, client.res, () => {});

    const blocked = createMockReqRes("192.168.1.50");
    limiter(blocked.req, blocked.res, () => {});
    assert.equal(blocked.res._getStatusCode(), 429);

    limiter.reset();

    const allowedAfterReset = createMockReqRes("192.168.1.50");
    let called = false;
    limiter(allowedAfterReset.req, allowedAfterReset.res, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal(allowedAfterReset.res._getStatusCode(), 200);

    limiter.destroy();
  });
});
