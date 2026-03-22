import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AssetCard, { getPreviewImageUri } from './AssetCard';

describe('AssetCard', () => {
  it('prioritizes the processed image over the original image for library thumbnails', () => {
    const asset = {
      id: 'asset-1',
      title: 'Processed asset',
      status: 'active',
      processedImageUrl: 'https://example.com/processed.png',
      primaryImage: { url: 'https://example.com/original.png' },
      images: {
        original: { url: 'https://example.com/original.png' },
      },
    };

    expect(getPreviewImageUri(asset)).toBe('https://example.com/processed.png');
  });

  it('renders the processed image when both processed and original images exist', () => {
    render(
      <AssetCard
        asset={{
          id: 'asset-2',
          title: 'Rendered asset',
          status: 'active',
          processedImageUrl: 'https://example.com/processed.png',
          primaryImage: { url: 'https://example.com/original.png' },
          images: {
            original: { url: 'https://example.com/original.png' },
          },
        }}
      />
    );

    expect(screen.getByTestId('asset-card-image').props.source.uri).toBe(
      'https://example.com/processed.png'
    );
  });
});
