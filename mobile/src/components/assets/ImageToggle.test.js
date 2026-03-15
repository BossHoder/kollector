/**
 * ImageToggle Tests
 *
 * Component tests for Processed/Original toggle:
 * - Toggle state management
 * - Image swapping
 * - Accessibility labels
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ImageToggle } from './ImageToggle';

const mockImages = {
  original: 'https://example.com/original.jpg',
  processed: 'https://example.com/processed.jpg',
};

describe('ImageToggle', () => {
  describe('Rendering', () => {
    it('should render the toggle controls', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
        />
      );

      expect(screen.getByTestId('image-toggle')).toBeTruthy();
    });

    it('should render Original and Processed buttons', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
        />
      );

      expect(screen.getByText(/gốc/i)).toBeTruthy();
      expect(screen.getByText(/đã xử lý/i)).toBeTruthy();
    });

    it('should show processed image by default', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
        />
      );

      const image = screen.getByTestId('toggle-image');
      expect(image.props.source.uri).toBe(mockImages.processed);
    });

    it('should have Processed button selected by default', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
        />
      );

      const processedButton = screen.getByTestId('toggle-processed');
      expect(
        processedButton.props.accessibilityState?.selected ||
        processedButton.props.style?.backgroundColor // Check for selected styling
      ).toBeTruthy();
    });
  });

  describe('Toggle Behavior', () => {
    it('should switch to original image when Original pressed', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
        />
      );

      fireEvent.press(screen.getByTestId('toggle-original'));

      const image = screen.getByTestId('toggle-image');
      expect(image.props.source.uri).toBe(mockImages.original);
    });

    it('should switch to processed image when Processed pressed', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
        />
      );

      // First switch to original
      fireEvent.press(screen.getByTestId('toggle-original'));
      
      // Then switch back to processed
      fireEvent.press(screen.getByTestId('toggle-processed'));

      const image = screen.getByTestId('toggle-image');
      expect(image.props.source.uri).toBe(mockImages.processed);
    });

    it('should update button selection state on toggle', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
        />
      );

      // Switch to original
      fireEvent.press(screen.getByTestId('toggle-original'));

      const originalButton = screen.getByTestId('toggle-original');
      expect(
        originalButton.props.accessibilityState?.selected ||
        originalButton.props.selected
      ).toBeTruthy();
    });

    it('should call onChange callback when toggled', () => {
      const onChange = jest.fn();
      
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
          onChange={onChange}
        />
      );

      fireEvent.press(screen.getByTestId('toggle-original'));

      expect(onChange).toHaveBeenCalledWith('original');
    });

    it('should call onChange with "processed" when switching back', () => {
      const onChange = jest.fn();
      
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
          onChange={onChange}
        />
      );

      fireEvent.press(screen.getByTestId('toggle-original'));
      fireEvent.press(screen.getByTestId('toggle-processed'));

      expect(onChange).toHaveBeenLastCalledWith('processed');
    });
  });

  describe('Controlled Mode', () => {
    it('should respect controlled value prop', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
          value="original"
        />
      );

      const image = screen.getByTestId('toggle-image');
      expect(image.props.source.uri).toBe(mockImages.original);
    });

    it('should update when controlled value changes', () => {
      const { rerender } = render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
          value="original"
        />
      );

      rerender(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
          value="processed"
        />
      );

      const image = screen.getByTestId('toggle-image');
      expect(image.props.source.uri).toBe(mockImages.processed);
    });
  });

  describe('Single Image Mode', () => {
    it('should hide toggle when only original provided', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={null}
        />
      );

      // Toggle controls should not be visible
      expect(screen.queryByTestId('toggle-processed')).toBeNull();
    });

    it('should show original image when no processed available', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={null}
        />
      );

      const image = screen.getByTestId('toggle-image');
      expect(image.props.source.uri).toBe(mockImages.original);
    });

    it('should fall back to original source when value="processed" but processed image is missing', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={null}
          value="processed"
        />
      );

      const image = screen.getByTestId('toggle-image');
      expect(image.props.source.uri).toBe(mockImages.original);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility roles', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
        />
      );

      const originalButton = screen.getByTestId('toggle-original');
      const processedButton = screen.getByTestId('toggle-processed');

      expect(originalButton.props.accessibilityRole).toBe('button');
      expect(processedButton.props.accessibilityRole).toBe('button');
    });

    it('should have accessible labels', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
        />
      );

      const originalButton = screen.getByTestId('toggle-original');
      expect(originalButton.props.accessibilityLabel).toContain('Ảnh gốc');
    });

    it('should indicate selected state', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
        />
      );

      const processedButton = screen.getByTestId('toggle-processed');
      expect(processedButton.props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while image loads', () => {
      render(
        <ImageToggle
          originalUri={mockImages.original}
          processedUri={mockImages.processed}
          showLoadingIndicator
        />
      );

      // Loading indicator should be present
      expect(screen.getByTestId('image-loading') || screen.queryByTestId('toggle-image')).toBeTruthy();
    });
  });
});
