/**
 * Checks if a product is missing its main image/photo.
 * A photo is considered missing if:
 * 1. The image_url is empty/null/undefined.
 * 2. The image_url points to a GitHub raw placeholder.
 * 3. The image_url points to the default transparent logo.
 * 
 * @param {object} product - The product object to validate
 * @returns {boolean} True if the image is missing, false otherwise
 */
export const isProductImageMissing = (product) => {
  if (!product) return true;
  const url = product.image_url;
  return (
    !url ||
    url.includes('raw.githubusercontent.com') ||
    url.includes('logo_transparent.png')
  );
};
