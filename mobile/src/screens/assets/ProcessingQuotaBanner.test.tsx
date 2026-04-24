import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import ProcessingQuotaBanner from '../../components/subscription/ProcessingQuotaBanner';

describe('ProcessingQuotaBanner (mobile)', () => {
  it('shows near-limit messaging and keeps the processing action enabled before the cap', () => {
    const onAction = jest.fn();

    render(
      <ProcessingQuotaBanner
        processingUsed={18}
        processingLimit={20}
        nextResetAt="2026-05-01T00:00:00.000Z"
        tier="free"
        onAction={onAction}
      />
    );

    expect(screen.getByText(/2 processing uses left/i)).toBeTruthy();
    expect(screen.getByText(/resets may 1, 2026/i)).toBeTruthy();

    const button = screen.getByTestId('processing-quota-action');
    fireEvent.press(button);

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('shows blocked state at the cap and still offers the upgrade CTA', () => {
    const onAction = jest.fn();

    render(
      <ProcessingQuotaBanner
        processingUsed={20}
        processingLimit={20}
        nextResetAt="2026-05-01T00:00:00.000Z"
        tier="free"
        onAction={onAction}
      />
    );

    expect(screen.getByText(/monthly processing quota reached/i)).toBeTruthy();
    expect(screen.getByText(/resets may 1, 2026/i)).toBeTruthy();

    const button = screen.getByTestId('processing-quota-action');
    fireEvent.press(button);

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
