const Asset = require('../../../src/models/Asset');

describe('Asset enhancement schema', () => {
  it('defines additive enhanced image fields and enhancement state', () => {
    expect(Asset.schema.path('images.enhanced.url')).toBeDefined();
    expect(Asset.schema.path('images.enhanced.width')).toBeDefined();
    expect(Asset.schema.path('images.enhanced.height')).toBeDefined();
    expect(Asset.schema.path('images.enhanced.generatedAt')).toBeDefined();

    expect(Asset.schema.path('enhancement.status').enumValues).toEqual(
      expect.arrayContaining(['idle', 'queued', 'processing', 'succeeded', 'failed'])
    );
    expect(Asset.schema.path('enhancement.attemptCount')).toBeDefined();
    expect(Asset.schema.path('presentation.themeOverrideId')).toBeDefined();
  });

  it('marks original image fields immutable while leaving enhancement additive', () => {
    expect(Asset.schema.path('images.original.url').options.immutable).toBe(true);
    expect(Asset.schema.path('images.original.publicId').options.immutable).toBe(true);
    expect(Asset.schema.path('images.original.uploadedAt').options.immutable).toBe(true);
    expect(Asset.schema.path('images.enhanced.url').options.immutable).not.toBe(true);
  });

  it('creates a default idle enhancement state for new assets', () => {
    const asset = new Asset({
      userId: '507f1f77bcf86cd799439011',
      category: 'sneaker',
      images: {
        original: {
          url: 'https://example.com/original.jpg',
        },
      },
    });

    expect(asset.enhancement.status).toBe('idle');
    expect(asset.enhancement.attemptCount).toBe(0);
  });
});
