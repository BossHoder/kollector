const User = require('../../../src/models/User');

describe('User asset theme schema', () => {
  it('defines settings.preferences.assetTheme.defaultThemeId', () => {
    expect(User.schema.path('settings.preferences.assetTheme.defaultThemeId')).toBeDefined();
  });

  it('defaults assetTheme.defaultThemeId to null', () => {
    const user = new User({
      email: 'test@example.com',
      passwordHash: 'TestPass123',
      profile: {
        displayName: 'Test User',
      },
    });

    expect(user.settings.preferences.assetTheme.defaultThemeId).toBeNull();
  });
});
