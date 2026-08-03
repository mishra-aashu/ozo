import { describe, it, expect } from 'vitest';
import { getOptimizedImageUrl } from './imageOptimizer';

describe('imageOptimizer - getOptimizedImageUrl', () => {
  it('should return empty string if url is missing', () => {
    expect(getOptimizedImageUrl(null)).toBe('');
    expect(getOptimizedImageUrl(undefined)).toBe('');
    expect(getOptimizedImageUrl('')).toBe('');
  });

  it('should return the original url if it starts with data: or blob:', () => {
    expect(getOptimizedImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(getOptimizedImageUrl('blob:http://localhost/xyz')).toBe('blob:http://localhost/xyz');
  });

  it('should return the original url if it already contains wsrv.nl', () => {
    expect(getOptimizedImageUrl('https://wsrv.nl/?url=someurl')).toBe('https://wsrv.nl/?url=someurl');
  });

  it('should return the original url if it is an SVG', () => {
    expect(getOptimizedImageUrl('https://example.com/icon.svg')).toBe('https://example.com/icon.svg');
  });

  it('should return the original url if it is a dicebear or githubusercontent url', () => {
    expect(getOptimizedImageUrl('https://api.dicebear.com/7.x/identicon/svg')).toBe('https://api.dicebear.com/7.x/identicon/svg');
    expect(getOptimizedImageUrl('https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shopping-cart.svg')).toBe('https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shopping-cart.svg');
  });

  it('should convert standard http/https URLs into optimized wsrv.nl URLs', () => {
    const originalUrl = 'https://example.com/products/apple.png';
    const optimized = getOptimizedImageUrl(originalUrl, { width: 300, quality: 80 });
    expect(optimized).toContain('wsrv.nl');
    expect(optimized).toContain(encodeURIComponent(originalUrl));
    expect(optimized).toContain('w=300');
    expect(optimized).toContain('q=80');
    expect(optimized).toContain('output=webp');
  });
});
