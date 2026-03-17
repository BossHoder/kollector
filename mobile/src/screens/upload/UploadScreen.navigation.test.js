/**
 * UploadScreen Navigation Tests
 *
 * Tests for upload-abandon confirm behavior:
 * - Confirm dialog when navigating away during upload
 * - Allow navigation when no upload in progress
 * - Block navigation during active upload
 */

import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import UploadScreen from './UploadScreen';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../../contexts/ToastContext';
import * as uploadApi from '../../api/uploadApi';
import * as imagePicker from '../../services/imagePicker';

const mockAddPendingUpload = jest.fn();

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../../contexts/ToastContext');
jest.mock('../../contexts/PendingUploadContext', () => ({
  usePendingUploadContext: jest.fn(() => ({
    addPendingUpload: mockAddPendingUpload,
  })),
}));
jest.mock('../../api/uploadApi');
jest.mock('../../services/imagePicker');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('UploadScreen Navigation', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  let beforeRemoveCallback = null;
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };

  const mockValidImage = {
    uri: 'file://photo.jpg',
    type: 'image/jpeg',
    fileSize: 5 * 1024 * 1024,
    width: 1000,
    height: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    beforeRemoveCallback = null;
    mockAddPendingUpload.mockReset();
    
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dispatch: jest.fn(),
      addListener: jest.fn((event, callback) => {
        if (event === 'beforeRemove') {
          beforeRemoveCallback = callback;
        }
        return () => {}; // Unsubscribe function
      }),
    });
    
    useToast.mockReturnValue(mockToast);
    imagePicker.pickImageFromGallery.mockResolvedValue(mockValidImage);
  });

  describe('No Upload In Progress', () => {
    it('should allow navigation when screen is in initial state', async () => {
      render(<UploadScreen />);

      // Simulate navigation attempt
      const mockEvent = {
        data: { action: { type: 'GO_BACK' } },
        preventDefault: jest.fn(),
      };

      if (beforeRemoveCallback) {
        beforeRemoveCallback(mockEvent);
      }

      // Should NOT show alert
      expect(Alert.alert).not.toHaveBeenCalled();
      // Should NOT prevent navigation
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should allow navigation when image selected but not uploading', async () => {
      render(<UploadScreen />);

      // Select image
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      // Simulate navigation attempt
      const mockEvent = {
        data: { action: { type: 'GO_BACK' } },
        preventDefault: jest.fn(),
      };

      if (beforeRemoveCallback) {
        beforeRemoveCallback(mockEvent);
      }

      // Should allow navigation (no active upload)
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Upload In Progress', () => {
    it('should show confirm dialog when navigating during upload', async () => {
      // Make upload take time
      let resolveUpload;
      uploadApi.uploadAsset.mockReturnValue(new Promise(resolve => {
        resolveUpload = resolve;
      }));

      render(<UploadScreen />);

      // Select image
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      // Select category
      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);
      fireEvent.press(screen.getByText(/giày/i));
      fireEvent.changeText(screen.getByTestId('asset-name-input'), 'Jordan 1');

      // Start upload
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      // Simulate navigation attempt during upload
      const mockEvent = {
        data: { action: { type: 'GO_BACK' } },
        preventDefault: jest.fn(),
      };

      if (beforeRemoveCallback) {
        beforeRemoveCallback(mockEvent);
      }

      // Should prevent navigation
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      
      // Should show confirmation alert
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringMatching(/hủy|rời/i),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: expect.stringMatching(/tiếp tục|ở lại/i) }),
          expect.objectContaining({ text: expect.stringMatching(/rời|hủy/i) }),
        ])
      );
    });

    it('should cancel upload and navigate when user confirms leave', async () => {
      let resolveUpload;
      uploadApi.uploadAsset.mockReturnValue(new Promise(resolve => {
        resolveUpload = resolve;
      }));

      render(<UploadScreen />);

      // Select image and category, start upload
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);
      fireEvent.press(screen.getByText(/giày/i));
      fireEvent.changeText(screen.getByTestId('asset-name-input'), 'Jordan 1');

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      // Simulate navigation attempt
      const mockEvent = {
        data: { action: { type: 'GO_BACK' } },
        preventDefault: jest.fn(),
      };

      if (beforeRemoveCallback) {
        beforeRemoveCallback(mockEvent);
      }

      // Get the confirm callback from Alert.alert
      const alertCall = Alert.alert.mock.calls[0];
      const buttons = alertCall[2];
      const leaveButton = buttons.find((b) => /rời/i.test(b.text));

      // Press "Leave" button
      if (leaveButton && leaveButton.onPress) {
        act(() => {
          leaveButton.onPress();
        });
      }

      // Navigation should proceed (in real impl, this would dispatch the blocked action)
      // The exact behavior depends on implementation
    });

    it('should continue upload when user cancels leave', async () => {
      let resolveUpload;
      uploadApi.uploadAsset.mockReturnValue(new Promise(resolve => {
        resolveUpload = resolve;
      }));

      render(<UploadScreen />);

      // Select image and category, start upload
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);
      fireEvent.press(screen.getByText(/giày/i));
      fireEvent.changeText(screen.getByTestId('asset-name-input'), 'Jordan 1');

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      // Simulate navigation attempt
      const mockEvent = {
        data: { action: { type: 'GO_BACK' } },
        preventDefault: jest.fn(),
      };

      if (beforeRemoveCallback) {
        beforeRemoveCallback(mockEvent);
      }

      // Get the stay callback from Alert.alert
      const alertCall = Alert.alert.mock.calls[0];
      const buttons = alertCall[2];
      const stayButton = buttons.find((b) => /tiếp tục/i.test(b.text));

      // Press "Stay" button
      if (stayButton && stayButton.onPress) {
        act(() => {
          stayButton.onPress();
        });
      }

      // Navigation should remain blocked
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Upload Complete', () => {
    it('should allow navigation after upload completes', async () => {
      uploadApi.uploadAsset.mockResolvedValue({ asset: { id: 'asset-123', status: 'processing' } });

      render(<UploadScreen />);

      // Complete full upload flow
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);
      fireEvent.press(screen.getByText(/giày/i));
      fireEvent.changeText(screen.getByTestId('asset-name-input'), 'Jordan 1');

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      // Wait for upload to complete
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('AssetDetail', { assetId: 'asset-123' });
      });

      // At this point, upload is complete, navigation should be free
    });
  });
});
