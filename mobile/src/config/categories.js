export const CANONICAL_CATEGORIES = ['sneaker', 'lego', 'camera', 'other'];

// Display labels — must stay in sync with web/src/components/forms/UploadForm.tsx
export const CATEGORY_LABELS = {
  sneaker: 'Giày Sneaker',
  lego: 'LEGO',
  camera: 'Máy Ảnh',
  other: 'Khác',
};

export const CATEGORY_ALIASES = {
  shoes: 'sneaker',
  sneakers: 'sneaker',
  sneaker: 'sneaker',
  legos: 'lego',
  lego: 'lego',
  photography: 'camera',
  cameras: 'camera',
  camera: 'camera',
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

export const CATEGORY_FALLBACK = 'all';

export const DEFAULT_CATEGORY_OPTIONS = CANONICAL_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value] || value,
  allowCustomValue: value === 'other',
}));
