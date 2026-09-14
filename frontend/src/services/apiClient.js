const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const timeoutMs = options.timeoutMs || 30000;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `HTTP ${response.status}: Request failed`;
      try {
        const parsed = JSON.parse(errorBody);
        if (typeof parsed.detail === 'string') {
          errorMessage = parsed.detail;
        } else if (Array.isArray(parsed.detail)) {
          errorMessage = parsed.detail.map(item => item.msg || JSON.stringify(item)).join('; ');
        } else if (parsed.message) {
          errorMessage = parsed.message;
        } else if (parsed.error) {
          errorMessage = parsed.error;
        }
      } catch {
        if (errorBody && errorBody.length < 300) {
          errorMessage = errorBody;
        }
      }
      const err = new Error(errorMessage);
      err.status = response.status;
      throw err;
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  }
}

export { API_BASE_URL };
