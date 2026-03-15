export const CANONICAL_CATEGORIES = ['sneaker', 'lego', 'camera', 'other'] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

export const CATEGORY_ALIASES: Record<string, CanonicalCategory> = {
  shoes: 'sneaker',
  sneakers: 'sneaker',
  sneaker: 'sneaker',
  legos: 'lego',
  lego: 'lego',
  photography: 'camera',
  camera: 'camera',
  cameras: 'camera',
  collectible: 'other',
  collectibles: 'other',
  art: 'other',
  stamps: 'other',
  cards: 'other',
  coins: 'other',
  toys: 'other',
  memorabilia: 'other',
  other: 'other',
};

export const CATEGORY_FALLBACK = 'all' as const;
