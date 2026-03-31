const authService = require('../../../src/modules/auth/auth.service');

describe('AuthService.toPublicUser', () => {
  it('fills in assetTheme.defaultThemeId when it is missing from stored settings', () => {
    const publicUser = authService.toPublicUser({
      _id: {
        toString: () => '507f1f77bcf86cd799439011',
      },
      email: 'collector@example.com',
      profile: {
        displayName: 'collector',
      },
      gamification: {
        totalXp: 0,
      },
      settings: {
        preferences: {
          theme: 'system',
          language: 'vi',
          currency: 'USD',
        },
      },
      createdAt: new Date('2026-03-31T00:00:00.000Z'),
      updatedAt: new Date('2026-03-31T00:00:00.000Z'),
    });

    expect(publicUser.settings.preferences.assetTheme).toEqual({
      defaultThemeId: null,
    });
  });
});
