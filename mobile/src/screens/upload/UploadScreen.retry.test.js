import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import UploadScreen from './UploadScreen';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../../contexts/ToastContext';
import * as uploadApi from '../../api/uploadApi';
import * as imagePicker from '../../services/imagePicker';

const mockAddPendingUpload = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));

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

describe('UploadScreen retry from placeholder', () => {
  const mockNavigate = jest.fn();
  const mockToast = { success: jest.fn(), error: jest.fn() };

  const mockImage = {
    uri: 'file://retry.jpg',
    type: 'image/jpeg',
    fileSize: 1024 * 1024,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigation.mockReturnValue({
      navigate: mockNavigate,
      addListener: jest.fn(() => () => {}),
      goBack: jest.fn(),
    });

    useToast.mockReturnValue(mockToast);
    imagePicker.pickImageFromGallery.mockResolvedValue(mockImage);
  });

  it('shows Retry Upload after failed submit and succeeds on retry', async () => {
    uploadApi.uploadAsset
      .mockRejectedValueOnce(new Error('first upload failed'))
      .mockResolvedValueOnce({ asset: { id: 'asset-retry-ok' } });

    render(<UploadScreen />);

    fireEvent.press(screen.getByTestId('select-image-button'));
    fireEvent.press(screen.getByTestId('source-gallery'));

    await waitFor(() => {
      expect(screen.getByTestId('selected-image')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Giày'));
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('retry-upload-button')).toBeTruthy();
      expect(mockAddPendingUpload).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByTestId('retry-upload-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('AssetDetail', { assetId: 'asset-retry-ok' });
    });
  });
});
