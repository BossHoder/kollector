import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImageToggle } from '@/components/assets/ImageToggle';

describe('ImageToggle', () => {
  it('does not render img when both URLs are empty', () => {
    render(<ImageToggle originalUrl="" processedUrl="" alt="asset" />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders image when original URL exists', () => {
    render(<ImageToggle originalUrl="https://example.com/a.jpg" processedUrl={null} alt="asset" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});