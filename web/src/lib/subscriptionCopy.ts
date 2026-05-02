export const subscriptionCopy = Object.freeze({
  softLaunch: {
    title: 'Subscription preview',
    body: 'Usage counters are visible while hard limits remain disabled during rollout.',
  },
  quotaWarnings: {
    asset90: 'You are close to your asset cap. Upgrade to VIP before create actions are blocked.',
    processing80: 'You have used 80% of this month\'s processing quota.',
    processing90: 'You have used 90% of this month\'s processing quota.',
  },
  quotaBlocked: {
    asset: 'Asset creation is blocked for your current tier. Existing assets remain available.',
    processing: 'Processing is blocked until the next UTC monthly reset or a VIP upgrade.',
  },
  themeLocks: {
    free: 'Free accounts can apply only the default and light presets.',
    vip: 'VIP unlocks the full preset catalog and 3x maintenance EXP.',
  },
});

export default subscriptionCopy;
