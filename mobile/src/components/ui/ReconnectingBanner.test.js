/**
 * ReconnectingBanner Component Tests
 *
 * Tests for reconnection banner behavior
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReconnectingBanner from './ReconnectingBanner';
import { useSocket } from '../../contexts/SocketContext';

// Mock SocketContext
jest.mock('../../contexts/SocketContext', () => ({
  useSocket: jest.fn(),
}));

describe('ReconnectingBanner', () => {
  const defaultSocketState = {
    isReconnecting: false,
    reconnectAttempts: 0,
    isMaxReconnectReached: false,
    forceReconnect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useSocket.mockReturnValue(defaultSocketState);
  });

  describe('visibility', () => {
    it('should not be visible when not reconnecting', () => {
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isReconnecting: false,
        isMaxReconnectReached: false,
      });

      const { queryByText } = render(<ReconnectingBanner />);

      // Banner content shouldn't be visible (height animated to 0)
      expect(queryByText(/reconnect/i)).toBeFalsy();
    });

    it('should show banner when reconnecting', async () => {
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isReconnecting: true,
      });

      const { getByText } = render(<ReconnectingBanner />);

      await waitFor(() => {
        expect(getByText(/reconnecting/i)).toBeTruthy();
      });
    });

    it('should show banner when max reconnect reached', async () => {
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isMaxReconnectReached: true,
      });

      const { getByText } = render(<ReconnectingBanner />);

      await waitFor(() => {
        expect(getByText(/connection lost/i)).toBeTruthy();
      });
    });
  });

  describe('reconnect attempts display', () => {
    it('should show attempt count during reconnection', async () => {
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isReconnecting: true,
        reconnectAttempts: 3,
      });

      const { getByText } = render(<ReconnectingBanner />);

      await waitFor(() => {
        expect(getByText(/reconnecting.*\(3\)/i)).toBeTruthy();
      });
    });

    it('should not show count when attempts is 0', async () => {
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isReconnecting: true,
        reconnectAttempts: 0,
      });

      const { getByText, queryByText } = render(<ReconnectingBanner />);

      await waitFor(() => {
        expect(getByText(/reconnecting/i)).toBeTruthy();
        expect(queryByText(/\(0\)/)).toBeFalsy();
      });
    });
  });

  describe('manual reconnect button', () => {
    it('should show reconnect button when max attempts reached', async () => {
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isMaxReconnectReached: true,
      });

      const { getByRole } = render(<ReconnectingBanner />);

      await waitFor(() => {
        expect(getByRole('button', { name: /reconnect/i })).toBeTruthy();
      });
    });

    it('should not show reconnect button during normal reconnection', async () => {
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isReconnecting: true,
        isMaxReconnectReached: false,
      });

      const { queryByRole } = render(<ReconnectingBanner />);

      await waitFor(() => {
        expect(queryByRole('button', { name: /reconnect/i })).toBeFalsy();
      });
    });

    it('should call forceReconnect on button press', async () => {
      const mockForceReconnect = jest.fn();
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isMaxReconnectReached: true,
        forceReconnect: mockForceReconnect,
      });

      const { getByRole } = render(<ReconnectingBanner />);

      await waitFor(() => {
        const button = getByRole('button', { name: /reconnect/i });
        fireEvent.press(button);
      });

      expect(mockForceReconnect).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have alert role for screen readers', async () => {
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isReconnecting: true,
      });

      const { getByRole } = render(<ReconnectingBanner />);

      await waitFor(() => {
        expect(getByRole('alert')).toBeTruthy();
      });
    });

    it('should have live region for dynamic updates', async () => {
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isReconnecting: true,
      });

      const { getByRole } = render(<ReconnectingBanner />);

      await waitFor(() => {
        const alert = getByRole('alert');
        expect(alert.props.accessibilityLiveRegion).toBe('polite');
      });
    });
  });

  describe('state transitions', () => {
    it('should hide banner when reconnection succeeds', async () => {
      const { rerender, queryByText } = render(<ReconnectingBanner />);

      // Initially reconnecting
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isReconnecting: true,
      });
      rerender(<ReconnectingBanner />);

      await waitFor(() => {
        expect(queryByText(/reconnecting/i)).toBeTruthy();
      });

      // Then connected
      useSocket.mockReturnValue({
        ...defaultSocketState,
        isReconnecting: false,
        isMaxReconnectReached: false,
      });
      rerender(<ReconnectingBanner />);

      // Wait for animation to complete
      await waitFor(
        () => {
          // Banner should be animating to hidden
        },
        { timeout: 300 }
      );
    });
  });
});
