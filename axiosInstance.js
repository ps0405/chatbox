import axios from "axios";
import { toast } from "react-toastify";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://api.yourapp.com/",
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Helper function to get cookie
const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

// Helper function to delete cookie
const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token to requests
    const token = getCookie("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add timestamp to prevent caching
    if (config.method === "get") {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    // Log request in development
    if (process.env.NODE_ENV === "development") {
      console.log("🚀 API Request:", {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
        params: config.params,
      });
    }

    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === "development") {
      console.log("✅ API Response:", {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }

    return response;
  },
  (error) => {
    // Log error in development
    if (process.env.NODE_ENV === "development") {
      console.error("❌ API Error:", {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          // Bad Request
          if (data.message) {
            toast.error(data.message);
          } else {
            toast.error("Invalid request. Please check your input.");
          }
          break;

        case 401:
          // Unauthorized - redirect to login
          toast.error("Session expired. Please log in again.");
          
          // Clear auth cookies
          deleteCookie("isLoggedIn");
          deleteCookie("userToken");
          deleteCookie("userData");
          
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
          break;

        case 403:
          // Forbidden
          toast.error("You don't have permission to perform this action.");
          break;

        case 404:
          // Not Found
          toast.error("The requested resource was not found.");
          break;

        case 422:
          // Validation Error
          if (data.errors) {
            // Handle validation errors
            Object.keys(data.errors).forEach((field) => {
              const messages = data.errors[field];
              if (Array.isArray(messages)) {
                messages.forEach((message) => toast.error(message));
              } else {
                toast.error(messages);
              }
            });
          } else if (data.message) {
            toast.error(data.message);
          } else {
            toast.error("Validation failed. Please check your input.");
          }
          break;

        case 429:
          // Too Many Requests
          toast.error("Too many requests. Please try again later.");
          break;

        case 500:
          // Internal Server Error
          toast.error("Server error. Please try again later.");
          break;

        case 502:
          // Bad Gateway
          toast.error("Server is temporarily unavailable. Please try again later.");
          break;

        case 503:
          // Service Unavailable
          toast.error("Service is temporarily unavailable. Please try again later.");
          break;

        default:
          // Other errors
          if (data.message) {
            toast.error(data.message);
          } else {
            toast.error(`An error occurred (${status}). Please try again.`);
          }
      }
    } else if (error.request) {
      // Network error
      toast.error("Network error. Please check your internet connection.");
    } else {
      // Other errors
      toast.error("An unexpected error occurred. Please try again.");
    }

    return Promise.reject(error);
  }
);

// Utility functions for common API patterns
export const apiUtils = {
  // GET request with error handling
  get: async (url, config = {}) => {
    try {
      const response = await axiosInstance.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // POST request with error handling
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await axiosInstance.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PUT request with error handling
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await axiosInstance.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // PATCH request with error handling
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await axiosInstance.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // DELETE request with error handling
  delete: async (url, config = {}) => {
    try {
      const response = await axiosInstance.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // File upload helper
  uploadFile: async (url, file, onProgress = null) => {
    const formData = new FormData();
    formData.append("file", file);

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }

    try {
      const response = await axiosInstance.post(url, formData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Multiple file upload helper
  uploadFiles: async (url, files, onProgress = null) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }

    try {
      const response = await axiosInstance.post(url, formData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Download file helper
  downloadFile: async (url, filename) => {
    try {
      const response = await axiosInstance.get(url, {
        responseType: "blob",
      });

      // Create blob link to download
      const blob = new Blob([response.data]);
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      // Clean up
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      throw error;
    }
  },
};

export default axiosInstance;