import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import AssetCapBanner from '../../components/subscription/AssetCapBanner';

describe('AssetCapBanner (mobile)', () => {
  it('shows near-limit warning while creation is still allowed', () => {
    const onCreate = jest.fn();

    render(
      <AssetCapBanner
        assetUsed={18}
        assetLimit={20}
        tier="free"
        onCreate={onCreate}
      />
    );

    expect(screen.getByText(/2 slots left/i)).toBeTruthy();

    const createButton = screen.getByTestId('asset-cap-create');
    fireEvent.press(createButton);

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('shows blocked state at cap and keeps create action disabled', () => {
    const onCreate = jest.fn();

    render(
      <AssetCapBanner
        assetUsed={20}
        assetLimit={20}
        tier="free"
        onCreate={onCreate}
      />
    );

    expect(screen.getByText(/asset limit reached/i)).toBeTruthy();

    const createButton = screen.getByTestId('asset-cap-create');
    expect(createButton.props.accessibilityState.disabled).toBe(true);
  });
});
