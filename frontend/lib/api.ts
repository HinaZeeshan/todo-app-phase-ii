import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}

// Generic API request function with JWT authentication and retry logic
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 3
): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get auth token if available
  const token = getAuthToken();

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, config);

      // Handle different response statuses
      if (!response.ok) {
        if (response.status === 401) {
          // Remove invalid token
          import('./auth').then(({ removeAuthToken }) => removeAuthToken());
        }

        const errorData = await response.json().catch(() => ({}));
        return {
          error: errorData.error || `HTTP error! status: ${response.status}`,
          code: errorData.code || `HTTP_${response.status}`
        };
      }

      // For 204 No Content responses, don't try to parse JSON
      if (response.status === 204) {
        return { data: undefined as unknown as T };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error(`API request failed (attempt ${attempt}/${retries}): ${url}`, error);

      // If this was the last attempt, return the error
      if (attempt === retries) {
        return {
          error: error instanceof Error ? error.message : 'Network error occurred',
          code: 'NETWORK_ERROR'
        };
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  // This should never be reached, but included for type safety
  return {
    error: 'Request failed after all retries',
    code: 'RETRY_ERROR'
  };
};

// Authentication API functions
export const authApi = {
  signup: async (email: string, password: string) => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  login: async (email: string, password: string) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  logout: async () => {
    // Client-side logout only - no API call needed
    return { data: { success: true } };
  }
};

// Todo API functions
export const todoApi = {
  getAll: async () => {
    return apiRequest('/todos');
  },

  getById: async (id: string) => {
    return apiRequest(`/todos/${id}`);
  },

  create: async (todo: { title: string; description?: string; completed?: boolean }) => {
    return apiRequest('/todos', {
      method: 'POST',
      body: JSON.stringify(todo)
    });
  },

  update: async (id: string, todo: { title?: string; description?: string; completed?: boolean }) => {
    return apiRequest(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(todo)
    });
  },

  toggleCompletion: async (id: string) => {
    return apiRequest(`/todos/${id}/toggle`, {
      method: 'PATCH'
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/todos/${id}`, {
      method: 'DELETE'
    });
  }
};

export default apiRequest;