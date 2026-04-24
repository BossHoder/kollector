import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProcessingQuotaBanner } from '@/components/subscription/ProcessingQuotaBanner';

describe('ProcessingQuotaBanner', () => {
  it('shows near-limit messaging with the upcoming reset date while usage remains', () => {
    render(
      <ProcessingQuotaBanner
        processingUsed={18}
        processingLimit={20}
        nextResetAt="2026-05-01T00:00:00.000Z"
        tier="free"
        onAction={() => {}}
      />
    );

    expect(screen.getByText(/2 processing uses left/i)).toBeInTheDocument();
    expect(screen.getByText(/resets may 1, 2026/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze asset/i })).toBeEnabled();
  });

  it('shows blocked messaging at the limit and routes to the upgrade CTA', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <ProcessingQuotaBanner
        processingUsed={20}
        processingLimit={20}
        nextResetAt="2026-05-01T00:00:00.000Z"
        tier="free"
        onAction={onAction}
      />
    );

    expect(screen.getByText(/monthly processing quota reached/i)).toBeInTheDocument();
    expect(screen.getByText(/resets may 1, 2026/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /upgrade to vip/i }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
