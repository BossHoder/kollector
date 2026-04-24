import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetCapBanner } from '@/components/subscription/AssetCapBanner';

describe('AssetCapBanner', () => {
  it('shows near-limit messaging when only two slots remain', () => {
    render(
      <AssetCapBanner
        assetUsed={18}
        assetLimit={20}
        tier="free"
        onCreate={() => {}}
      />
    );

    expect(screen.getByText(/2 slots left/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create asset/i })).toBeEnabled();
  });

  it('shows hard-stop messaging at the cap and routes users to upgrade CTA', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <AssetCapBanner
        assetUsed={20}
        assetLimit={20}
        tier="free"
        onCreate={onCreate}
      />
    );

    expect(screen.getByText(/asset limit reached/i)).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /upgrade to vip/i });
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onCreate).not.toHaveBeenCalled();
  });
});
