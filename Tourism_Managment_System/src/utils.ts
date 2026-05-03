import { API_BASE } from './config';

/**
 * Resolves an image path to a full URL.
 * Handles full URLs, relative paths with leading slash, and relative paths without leading slash.
 * @param path The image path or URL from the database
 * @returns A full URL string or null if path is missing
 */
export const resolveImageUrl = (path?: string): string | null => {
  if (!path) return null;
  
  // If it's already a full URL or a Base64 data URI, return it as is
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  
  // Ensure we don't have double slashes when joining with API_BASE
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // If API_BASE has a trailing slash, remove it to avoid double slashes
  const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  
  return `${baseUrl}${cleanPath}`;
};
