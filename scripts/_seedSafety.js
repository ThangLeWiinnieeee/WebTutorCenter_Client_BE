const assertSeedAllowed = (scriptName, env = process.env) => {
  if (String(env.NODE_ENV || "").toLowerCase() === "production") {
    throw new Error(`${scriptName} bị chặn trong NODE_ENV=production.`);
  }
  if (env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error(
      `${scriptName} chỉ được chạy khi ALLOW_DESTRUCTIVE_SEED=true.`,
    );
  }
};

module.exports = { assertSeedAllowed };
