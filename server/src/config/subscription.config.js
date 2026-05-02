function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

const subscriptionConfig = Object.freeze({
  enforcementEnabled: parseBoolean(process.env.SUBSCRIPTION_ENFORCEMENT_ENABLED, true),
  softLaunchMode: parseBoolean(process.env.SUBSCRIPTION_SOFT_LAUNCH_MODE, false),
  warningsEnabled: parseBoolean(process.env.SUBSCRIPTION_WARNINGS_ENABLED, true),
});

function shouldEnforceSubscriptionLimits() {
  return subscriptionConfig.enforcementEnabled && !subscriptionConfig.softLaunchMode;
}

module.exports = {
  parseBoolean,
  shouldEnforceSubscriptionLimits,
  subscriptionConfig,
};
