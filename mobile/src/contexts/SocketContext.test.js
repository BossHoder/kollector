import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SocketProvider, useSocket } from './SocketContext';
import { socketService } from '../services/socketService';

jest.mock('./AuthContext', () => ({
  useAuth: jest.fn(() => ({ isAuthenticated: true })),
}));

jest.mock('../services/socketService', () => ({
  socketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    onStateChange: jest.fn(),
    getReconnectAttempts: jest.fn(() => 0),
    isMaxReconnectReached: jest.fn(() => false),
    forceReconnect: jest.fn(),
    on: jest.fn(() => () => {}),
  },
}));

function Probe() {
  const socket = useSocket();
  return <Text testID="probe">{socket.isFallbackActive ? 'fallback-on' : 'fallback-off'}</Text>;
}

describe('SocketContext failover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketService.onStateChange.mockImplementation((cb) => {
      cb('connected');
      return () => {};
    });
  });

  it('exposes fallback inactive while connected', async () => {
    const { getByTestId } = render(
      <SocketProvider>
        <Probe />
      </SocketProvider>
    );

    await waitFor(() => {
      expect(getByTestId('probe').props.children).toBe('fallback-off');
    });
  });

  it('switches to fallback active when socket state becomes disconnected', async () => {
    socketService.onStateChange.mockImplementation((cb) => {
      cb('disconnected');
      return () => {};
    });

    const { getByTestId } = render(
      <SocketProvider>
        <Probe />
      </SocketProvider>
    );

    await waitFor(() => {
      expect(getByTestId('probe').props.children).toBe('fallback-on');
    });
  });
});
