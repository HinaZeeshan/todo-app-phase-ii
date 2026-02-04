import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'; // turbo-ignore
import { getAuthToken, getRefreshToken, setAuthToken, removeAuthToken } from './auth';
import { TodoItem } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create Axios instance
console.log('API_BASE_URL:', API_BASE_URL); // Debug logging
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Refresh
interface RetryQueueItem {
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}

let isRefreshing = false;
let failedQueue: RetryQueueItem[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        removeAuthToken();
        // optionally redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Use a separate instance or direct fetch to avoid interceptor loop
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;

        setAuthToken(access_token, newRefreshToken);

        if (apiClient.defaults.headers.common) {
          apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        }

        processQueue(null, access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        removeAuthToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Wrapper to maintain compatibility with existing code structure if needed
// Or we can export the apiClient directly
export { apiClient };

// Authentication API functions
export const authApi = {
  signup: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/signup', { email, password });
    return { data: response.data };
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return { data: response.data };
  },

  logout: async () => {
    removeAuthToken();
    return { data: { success: true } };
  }
};

// Todo API functions
export const todoApi = {
  getAll: async () => {
    const response = await apiClient.get<{ todos: TodoItem[] }>('/todos');
    return { data: response.data };
  },

  getById: async (id: string) => {
    const response = await apiClient.get<{ todo: TodoItem }>(`/todos/${id}`);
    return { data: response.data };
  },

  create: async (todo: { title: string; description?: string | null; completed?: boolean }) => {
    const response = await apiClient.post<{ todo: TodoItem }>('/todos', todo);
    return { data: response.data };
  },

  update: async (id: string, todo: { title?: string; description?: string | null; completed?: boolean }) => {
    const response = await apiClient.put<{ todo: TodoItem }>(`/todos/${id}`, todo);
    return { data: response.data };
  },

  toggleCompletion: async (id: string) => {
    const response = await apiClient.patch<{ todo: TodoItem }>(`/todos/${id}/toggle`);
    return { data: response.data };
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<{ success: boolean }>(`/todos/${id}`);
    return { data: response.data };
  }
};

export default apiClient;