import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAssets } from '@/hooks/useAssets';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('assets filter canonicalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ assets: [], total: 0 });
  });

  it('sends canonical category query when alias is provided', async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    renderHook(() => useAssets({ category: 'shoes' as any }), { wrapper });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });

    const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
    expect(calledUrl).toContain('category=sneaker');
  });
});
