import { CANONICAL_CATEGORIES, CATEGORY_ALIASES, CATEGORY_FALLBACK, type CanonicalCategory } from './categories';

export function normalizeCategory(rawCategory?: string | null): CanonicalCategory | null {
  if (!rawCategory) {
    return null;
  }

  const key = rawCategory.trim().toLowerCase();
  if (!key || key === 'all') {
    return null;
  }

  if ((CANONICAL_CATEGORIES as readonly string[]).includes(key)) {
    return key as CanonicalCategory;
  }

  return CATEGORY_ALIASES[key] ?? null;
}

export function normalizeCategoryOrAll(rawCategory?: string | null): CanonicalCategory | 'all' {
  return normalizeCategory(rawCategory) ?? CATEGORY_FALLBACK;
}
