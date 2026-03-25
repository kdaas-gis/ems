import { BASE_PATH } from './constants';

/**
 * Wrapper around the native fetch API to automatically prepend the base path
 * for relative API requests.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlObj = typeof input === 'string' ? new URL(input, typeof window !== 'undefined' ? window.location.origin : 'http://localhost') : (input instanceof URL ? input : new URL(input.url));
  let url = urlObj.pathname + urlObj.search;

  // Prepend BASE_PATH if it's a relative API route starting with /api
  if (url.startsWith('/api')) {
    url = `${BASE_PATH}${url}`;
  }

  return fetch(url, init);
}
