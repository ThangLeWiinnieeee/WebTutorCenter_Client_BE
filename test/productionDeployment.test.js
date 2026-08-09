const { test } = require("node:test");
const assert = require("node:assert/strict");

const loadFreshWithEnv = (modulePath, values) => {
  const resolved = require.resolve(modulePath);
  const previous = {};

  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  delete require.cache[resolved];
  try {
    return require(resolved);
  } finally {
    delete require.cache[resolved];
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

const checkOrigin = (corsOptions, origin) => {
  let result;
  corsOptions.origin(origin, (error, allowed) => {
    result = { allowed, error };
  });
  return result;
};

test("cookie production giữ first-party qua Vercel proxy", () => {
  const tokenUtils = loadFreshWithEnv("../src/utils/token", {
    NODE_ENV: "production",
    COOKIE_DOMAIN: undefined,
  });
  let cookie;

  const data = tokenUtils.sendRefreshToken(
    { get: () => undefined },
    { cookie: (name, value, options) => (cookie = { name, options, value }) },
    "refresh-token",
  );

  assert.deepEqual(data, {});
  assert.equal(cookie.name, "refreshToken");
  assert.equal(cookie.value, "refresh-token");
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.secure, true);
  assert.equal(cookie.options.sameSite, "lax");
  assert.equal(cookie.options.domain, undefined);
  assert.equal(cookie.options.path, "/");
  assert.equal(
    tokenUtils.REFRESH_TOKEN_CLEAR_OPTIONS.sameSite,
    cookie.options.sameSite,
  );
  assert.equal(
    tokenUtils.REFRESH_TOKEN_CLEAR_OPTIONS.secure,
    cookie.options.secure,
  );
});

test("CORS production chỉ nhận origin Vercel trong allowlist và cache preflight", () => {
  const corsOptions = loadFreshWithEnv("../src/configs/cors", {
    NODE_ENV: "production",
    CLIENT_URL: "https://web-tutor.vercel.app/, https://app.example.com",
  });

  assert.deepEqual(checkOrigin(corsOptions, "https://web-tutor.vercel.app"), {
    allowed: true,
    error: null,
  });
  assert.equal(
    checkOrigin(corsOptions, "https://evil.vercel.app").allowed,
    undefined,
  );
  assert.equal(
    checkOrigin(corsOptions, "https://evil.vercel.app").error.statusCode,
    403,
  );
  assert.equal(checkOrigin(corsOptions, undefined).allowed, true);
  assert.equal(corsOptions.credentials, true);
  assert.equal(corsOptions.maxAge, 600);
});

test("CORS production fail-fast khi thiếu CLIENT_URL", () => {
  assert.throws(
    () =>
      loadFreshWithEnv("../src/configs/cors", {
        NODE_ENV: "production",
        CLIENT_URL: undefined,
      }),
    /CLIENT_URL là bắt buộc/,
  );
});
