/**
 * UploadScreen Tests
 *
 * Component tests for upload screen:
 * - Submit button enabled rules (image + category required)
 * - Validation error display
 * - Loading state during upload
 * - Success navigation
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
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

describe('UploadScreen', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };

  const mockValidImage = {
    uri: 'file://photo.jpg',
    type: 'image/jpeg',
    fileSize: 5 * 1024 * 1024, // 5MB
    width: 1000,
    height: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddPendingUpload.mockReset();
    
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      addListener: jest.fn(() => () => {}),
    });
    
    useToast.mockReturnValue(mockToast);
    
    imagePicker.pickImageFromGallery.mockResolvedValue(mockValidImage);
    imagePicker.pickImageFromCamera.mockResolvedValue(mockValidImage);
    uploadApi.uploadAsset.mockResolvedValue({ asset: { id: 'asset-123', status: 'processing' } });
  });

  describe('Initial State', () => {
    it('should render upload screen with image selection', () => {
      render(<UploadScreen />);
      
      expect(screen.getByTestId('select-image-button') || screen.getByText(/chọn.*ảnh/i)).toBeTruthy();
    });

    it('should have submit button disabled initially', () => {
      render(<UploadScreen />);
      
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton.props.accessibilityState?.disabled || submitButton.props.disabled).toBeTruthy();
    });

    it('should render category selector', () => {
      render(<UploadScreen />);
      
      expect(screen.getByTestId('category-selector')).toBeTruthy();
    });
  });

  describe('Submit Button Enabled Rules', () => {
    it('should keep submit disabled when only image is selected', async () => {
      render(<UploadScreen />);
      
      // Select image
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        // Image should be displayed
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      // Submit should still be disabled (no category)
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton.props.accessibilityState?.disabled || submitButton.props.disabled).toBeTruthy();
    });

    it('should keep submit disabled when only category is selected', async () => {
      render(<UploadScreen />);
      
      // Select category
      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);
      fireEvent.press(screen.getByText('Giày'));

      // Submit should still be disabled (no image)
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton.props.accessibilityState?.disabled || submitButton.props.disabled).toBeTruthy();
    });

    it('should enable submit when both image AND category are selected', async () => {
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
      fireEvent.press(screen.getByText('Giày'));

      await waitFor(() => {
        const submitButton = screen.getByTestId('submit-button');
        expect(submitButton.props.accessibilityState?.disabled).toBeFalsy();
      });
    });
  });

  describe('Image Selection', () => {
    it('should show image source options (camera/gallery)', () => {
      render(<UploadScreen />);
      
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);

      expect(screen.getByTestId('source-camera')).toBeTruthy();
      expect(screen.getByTestId('source-gallery')).toBeTruthy();
    });

    it('should call gallery picker when gallery option selected', async () => {
      render(<UploadScreen />);
      
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(imagePicker.pickImageFromGallery).toHaveBeenCalled();
      });
    });

    it('should call camera picker when camera option selected', async () => {
      render(<UploadScreen />);
      
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByTestId('source-camera'));

      await waitFor(() => {
        expect(imagePicker.pickImageFromCamera).toHaveBeenCalled();
      });
    });

    it('should display selected image thumbnail', async () => {
      render(<UploadScreen />);
      
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });
    });

    it('should allow changing selected image', async () => {
      render(<UploadScreen />);
      
      // Select first image
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      // Change image - opens source picker, then pick gallery again
      const changeButton = screen.getByTestId('change-image-button');
      fireEvent.press(changeButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(imagePicker.pickImageFromGallery).toHaveBeenCalledTimes(2);
      });
    });

    it('should create failed placeholder when upload fails after camera selection', async () => {
      uploadApi.uploadAsset.mockRejectedValue(new Error('Camera upload failed'));

      render(<UploadScreen />);

      fireEvent.press(screen.getByTestId('select-image-button'));
      fireEvent.press(screen.getByTestId('source-camera'));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Giày'));
      fireEvent.press(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockAddPendingUpload).toHaveBeenCalledWith(expect.objectContaining({
          imageUri: mockValidImage.uri,
          category: 'sneaker',
          status: 'failed_upload',
        }));
      });
    });
  });

  describe('Validation Errors', () => {
    it('should show error for oversized file', async () => {
      const oversizedImage = {
        ...mockValidImage,
        fileSize: 15 * 1024 * 1024, // 15MB
      };
      imagePicker.pickImageFromGallery.mockResolvedValue(oversizedImage);
      
      render(<UploadScreen />);
      
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('10MB'));
      });
    });

    it('should show error for invalid file type', async () => {
      const invalidImage = {
        ...mockValidImage,
        type: 'application/pdf',
      };
      imagePicker.pickImageFromGallery.mockResolvedValue(invalidImage);
      
      render(<UploadScreen />);
      
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('không được hỗ trợ'));
      });
    });
  });

  describe('Upload Submission', () => {
    it('should call upload API on submit', async () => {
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
      fireEvent.press(screen.getByText('Giày'));

      // Submit
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(uploadApi.uploadAsset).toHaveBeenCalled();
      });
    });

    it('should show loading state during upload', async () => {
      let resolveUpload;
      uploadApi.uploadAsset.mockReturnValue(new Promise(resolve => {
        resolveUpload = resolve;
      }));
      
      render(<UploadScreen />);
      
      // Select image and category
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);
      fireEvent.press(screen.getByText('Giày'));

      // Submit
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      // Should show loading
      await waitFor(() => {
        expect(submitButton.props.accessibilityState?.disabled || submitButton.props.disabled).toBeTruthy();
      });
    });

    it('should navigate to AssetDetail on successful upload', async () => {
      render(<UploadScreen />);
      
      // Select image and category
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);
      fireEvent.press(screen.getByText('Giày'));

      // Submit
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('AssetDetail', { assetId: 'asset-123' });
      });
    });

    it('should show success toast on upload', async () => {
      render(<UploadScreen />);
      
      // Select image and category
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);
      fireEvent.press(screen.getByText('Giày'));

      // Submit
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it('should show error toast on upload failure', async () => {
      uploadApi.uploadAsset.mockRejectedValue(new Error('Upload failed'));
      
      render(<UploadScreen />);
      
      // Select image and category
      const selectButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectButton);
      fireEvent.press(screen.getByText(/thư viện/i));

      await waitFor(() => {
        expect(screen.getByTestId('selected-image')).toBeTruthy();
      });

      const categorySelector = screen.getByTestId('category-selector');
      fireEvent.press(categorySelector);
      fireEvent.press(screen.getByText('Giày'));

      // Submit
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('failed'));
      });
    });
  });
});
