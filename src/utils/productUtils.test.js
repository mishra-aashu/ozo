import { describe, it, expect } from 'vitest';
import { isProductImageMissing } from './productUtils';

describe('productUtils - isProductImageMissing', () => {
  it('should return true if product is null or undefined', () => {
    expect(isProductImageMissing(null)).toBe(true);
    expect(isProductImageMissing(undefined)).toBe(true);
  });

  it('should return true if image_url is empty, null, or undefined', () => {
    expect(isProductImageMissing({})).toBe(true);
    expect(isProductImageMissing({ image_url: '' })).toBe(true);
    expect(isProductImageMissing({ image_url: null })).toBe(true);
  });

  it('should return true if image_url points to a GitHub placeholder', () => {
    expect(isProductImageMissing({ image_url: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shopping-cart.svg' })).toBe(true);
  });

  it('should return true if image_url contains logo_transparent.png', () => {
    expect(isProductImageMissing({ image_url: '/logo_transparent.png' })).toBe(true);
  });

  it('should return false if image_url is valid and not a placeholder', () => {
    expect(isProductImageMissing({ image_url: 'https://ik.imagekit.io/ozo/products/123456.jpg' })).toBe(false);
  });
});
