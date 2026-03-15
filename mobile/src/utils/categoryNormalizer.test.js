import { normalizeCategory, normalizeCategoryOrAll } from './categoryNormalizer';

describe('categoryNormalizer', () => {
  it('returns canonical category as-is', () => {
    expect(normalizeCategory('sneaker')).toBe('sneaker');
  });

  it('maps aliases to canonical categories', () => {
    expect(normalizeCategory('shoes')).toBe('sneaker');
    expect(normalizeCategory('photography')).toBe('camera');
  });

  it('falls back to all for invalid categories', () => {
    expect(normalizeCategory('invalid-category')).toBeNull();
    expect(normalizeCategoryOrAll('invalid-category')).toBe('all');
  });
});
