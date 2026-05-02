import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscriptionStateBadge } from '@/components/subscription/SubscriptionStateBadge';

describe('SubscriptionStateBadge', () => {
  it('renders renewal pending copy for grace subscriptions', () => {
    render(<SubscriptionStateBadge status="grace_pending_renewal" />);
    expect(screen.getByText(/renewal pending/i)).toBeInTheDocument();
  });

  it('renders expired copy for expired subscriptions', () => {
    render(<SubscriptionStateBadge status="expired" />);
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });
});
