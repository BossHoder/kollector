import { CANONICAL_CATEGORIES, CATEGORY_ALIASES, CATEGORY_FALLBACK } from '../config/categories';

export function normalizeCategory(rawCategory) {
  if (!rawCategory) {
    return null;
  }

  const key = String(rawCategory).trim().toLowerCase();
  if (!key || key === 'all') {
    return null;
  }

  if (CANONICAL_CATEGORIES.includes(key)) {
    return key;
  }

  return CATEGORY_ALIASES[key] || null;
}

export function normalizeCategoryOrAll(rawCategory) {
  return normalizeCategory(rawCategory) || CATEGORY_FALLBACK;
}
