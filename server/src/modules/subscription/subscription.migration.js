const User = require('../../models/User');
const Subscription = require('../../models/Subscription');
const {
  SUBSCRIPTION_PAYMENT_CHANNELS,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIERS,
} = require('./subscription.constants');

async function initializeFreeSubscriptionsForExistingUsers() {
  const users = await User.find({}, { _id: 1 }).lean();

  if (users.length === 0) {
    return {
      scannedUsers: 0,
      createdSubscriptions: 0,
    };
  }

  const existingSubscriptions = await Subscription.find(
    { userId: { $in: users.map((user) => user._id) } },
    { userId: 1 }
  ).lean();

  const existingUserIds = new Set(existingSubscriptions.map((subscription) => String(subscription.userId)));
  const missingUsers = users.filter((user) => !existingUserIds.has(String(user._id)));

  if (missingUsers.length > 0) {
    await Subscription.insertMany(
      missingUsers.map((user) => ({
        userId: user._id,
        tier: SUBSCRIPTION_TIERS.FREE,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        paymentChannel: SUBSCRIPTION_PAYMENT_CHANNELS.MANUAL_BANK,
      }))
    );
  }

  return {
    scannedUsers: users.length,
    createdSubscriptions: missingUsers.length,
  };
}

module.exports = {
  initializeFreeSubscriptionsForExistingUsers,
};
