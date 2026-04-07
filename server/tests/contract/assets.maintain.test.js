const request = require('supertest');
const { app } = require('../../src/app');
const User = require('../../src/models/User');
const Asset = require('../../src/models/Asset');
const authService = require('../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../src/config/database');

function buildActiveAsset(overrides = {}) {
  return {
    category: 'sneaker',
    status: 'active',
    version: 1,
    condition: {
      health: 50,
      decayRate: 2,
      lastDecayDate: null,
      lastMaintenanceDate: null,
      maintenanceCount: 0,
    },
    visualLayers: ['dust_medium'],
    images: {
      original: {
        url: 'https://example.com/original.jpg',
        uploadedAt: new Date(),
      },
    },
    ...overrides,
  };
}

async function withFixedSystemDate(fixedNow, callback) {
  const RealDate = Date;

  class FixedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        return new RealDate(fixedNow);
      }

      return new RealDate(...args);
    }

    static now() {
      return fixedNow.getTime();
    }
  }

  global.Date = FixedDate;

  try {
    return await callback();
  } finally {
    global.Date = RealDate;
  }
}

describe('POST /api/assets/:assetId/maintain', () => {
  let accessToken;
  let userId;
  let otherAccessToken;
  let otherUserId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Asset.deleteMany({});

    const user = await authService.register('maintain-user@example.com', 'TestPass123');
    accessToken = user.accessToken;
    userId = user.user.id;

    const otherUser = await authService.register('maintain-other@example.com', 'TestPass123');
    otherAccessToken = otherUser.accessToken;
    otherUserId = otherUser.user.id;
  });

  it('registers the maintain contract path globally', () => {
    expect(app.locals.openApiContracts?.gamification?.paths?.['/api/assets/{assetId}/maintain']).toBeDefined();
  });

  it('returns the strict success payload and persists maintenance side effects', async () => {
    const asset = await Asset.create(buildActiveAsset({ userId, version: 3 }));

    const response = await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 3,
        cleanedPercentage: 88,
        durationMs: 2100,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({
      previousHealth: 50,
      newHealth: 75,
      xpAwarded: 10,
      streakDays: 1,
      badgesUnlocked: ['FIRST_CLEAN'],
    });

    const updatedAsset = await Asset.findById(asset._id).lean();
    const updatedUser = await User.findById(userId).lean();

    expect(updatedAsset.condition.health).toBe(75);
    expect(updatedAsset.visualLayers).toEqual(['dust_light']);
    expect(updatedAsset.condition.maintenanceCount).toBe(1);
    expect(updatedAsset.version).toBe(4);
    expect(updatedAsset.maintenanceLogs).toHaveLength(1);
    expect(updatedAsset.maintenanceLogs[0]).toMatchObject({
      previousHealth: 50,
      newHealth: 75,
      healthRestored: 25,
      xpAwarded: 10,
    });

    expect(updatedUser.gamification.totalXp).toBe(10);
    expect(updatedUser.gamification.maintenanceStreak).toBe(1);
    expect(updatedUser.gamification.badges).toContain('FIRST_CLEAN');
  });

  it('strips yellowing when maintenance pushes health above 20', async () => {
    const asset = await Asset.create(buildActiveAsset({
      userId,
      version: 5,
      condition: {
        health: 10,
        decayRate: 2,
        lastDecayDate: null,
        lastMaintenanceDate: null,
        maintenanceCount: 0,
      },
      visualLayers: ['dust_heavy', 'yellowing'],
    }));

    const response = await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 5,
        cleanedPercentage: 92,
        durationMs: 2400,
      })
      .expect(200);

    expect(response.body.newHealth).toBe(35);

    const updatedAsset = await Asset.findById(asset._id).lean();
    expect(updatedAsset.visualLayers).toEqual(['dust_heavy']);
  });

  it('returns 400 when cleanedPercentage is below 80', async () => {
    const asset = await Asset.create(buildActiveAsset({ userId }));

    const response = await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        cleanedPercentage: 79,
        durationMs: 2200,
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when duration is below 2 seconds', async () => {
    const asset = await Asset.create(buildActiveAsset({ userId }));

    const response = await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        cleanedPercentage: 90,
        durationMs: 1999,
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when maintenance is not required', async () => {
    const asset = await Asset.create(buildActiveAsset({
      userId,
      condition: {
        health: 80,
        decayRate: 2,
        lastDecayDate: null,
        lastMaintenanceDate: null,
        maintenanceCount: 0,
      },
      visualLayers: [],
    }));

    const response = await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        cleanedPercentage: 90,
        durationMs: 2200,
      })
      .expect(400);

    expect(response.body.error.code).toBe('MAINTENANCE_NOT_REQUIRED');
  });

  it('returns 403 when the asset belongs to another user', async () => {
    const asset = await Asset.create(buildActiveAsset({ userId: otherUserId }));

    const response = await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        cleanedPercentage: 90,
        durationMs: 2200,
      })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 when the asset does not exist', async () => {
    const response = await request(app)
      .post('/api/assets/507f1f77bcf86cd799439011/maintain')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        cleanedPercentage: 90,
        durationMs: 2200,
      })
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when the asset is not active', async () => {
    const asset = await Asset.create(buildActiveAsset({
      userId,
      status: 'draft',
    }));

    const response = await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        cleanedPercentage: 90,
        durationMs: 2200,
      })
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 409 when the provided version is stale', async () => {
    const asset = await Asset.create(buildActiveAsset({
      userId,
      version: 7,
    }));

    const response = await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 6,
        cleanedPercentage: 90,
        durationMs: 2200,
      })
      .expect(409);

    expect(response.body.error.code).toBe('VERSION_CONFLICT');
  });

  it('returns 429 when the asset was already maintained today', async () => {
    const fixedNow = new Date();
    fixedNow.setUTCHours(12, 0, 0, 0);

    await withFixedSystemDate(fixedNow, async () => {
      const asset = await Asset.create(buildActiveAsset({
        userId,
        condition: {
          health: 50,
          decayRate: 2,
          lastDecayDate: null,
          lastMaintenanceDate: new Date(),
          maintenanceCount: 1,
        },
        version: 2,
      }));

      const response = await request(app)
        .post(`/api/assets/${asset._id}/maintain`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          version: 2,
          cleanedPercentage: 90,
          durationMs: 2200,
        })
        .expect(429);

      expect(response.body.error.code).toBe('MAINTENANCE_COOLDOWN');
    });
  });

  it('returns 401 without authentication', async () => {
    const asset = await Asset.create(buildActiveAsset({ userId }));

    await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .send({
        version: 1,
        cleanedPercentage: 90,
        durationMs: 2200,
      })
      .expect(401);
  });

  it('returns 401 with an invalid token', async () => {
    const asset = await Asset.create(buildActiveAsset({ userId }));

    await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', 'Bearer invalid-token')
      .send({
        version: 1,
        cleanedPercentage: 90,
        durationMs: 2200,
      })
      .expect(401);
  });

  it('allows a different user to receive a 403 instead of being masked as not found', async () => {
    const asset = await Asset.create(buildActiveAsset({ userId }));

    const response = await request(app)
      .post(`/api/assets/${asset._id}/maintain`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({
        version: 1,
        cleanedPercentage: 90,
        durationMs: 2200,
      })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
