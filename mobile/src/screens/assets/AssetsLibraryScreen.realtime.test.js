import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AssetsLibraryScreen from './AssetsLibraryScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as apiClient from '../../services/apiClient';

jest.mock('../../contexts/AuthContext');
jest.mock('../../services/apiClient');

let mockSocketState = { isConnected: false };

jest.mock('../../contexts/SocketContext', () => ({
  useSocket: jest.fn(() => ({
    onAssetProcessed: jest.fn(() => () => {}),
    isConnected: mockSocketState.isConnected,
  })),
}));

jest.mock('../../contexts/PendingUploadContext', () => ({
  usePendingUploadContext: jest.fn(() => ({
    pendingUploads: [],
    retryPendingUpload: jest.fn(),
  })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

describe('AssetsLibraryScreen realtime fallback freshness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSocketState = { isConnected: false };

    useAuth.mockReturnValue({ user: { id: 'user-1' }, isAuthenticated: true });
    useNavigation.mockReturnValue({ navigate: jest.fn() });
    apiClient.apiRequest.mockResolvedValue({
      assets: [],
      pagination: { nextCursor: null, hasMore: false, limit: 20 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('polls every fallback interval while disconnected and stops on reconnect', async () => {
    const { rerender } = render(<AssetsLibraryScreen />);

    await waitFor(() => {
      expect(apiClient.apiRequest).toHaveBeenCalled();
    });

    apiClient.apiRequest.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(24000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(apiClient.apiRequest.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    mockSocketState = { isConnected: true };
    rerender(<AssetsLibraryScreen />);

    apiClient.apiRequest.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(24000);
      await Promise.resolve();
    });

    expect(apiClient.apiRequest).not.toHaveBeenCalled();
  });
});
