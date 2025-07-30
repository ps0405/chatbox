import React, { createContext, useState, useEffect } from "react";

// Create the context
export const StoreContext = createContext();

// StoreContext Provider component
export const StoreContextProvider = ({ children }) => {
  // Base configuration
  const baseUrl = process.env.REACT_APP_API_URL || "https://api.yourapp.com/";
  const GLOBLEURLFORS3 = process.env.REACT_APP_S3_URL || "https://s3.yourapp.com/";

  // Global state
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cookie management functions
  const setCookie = (name, value, days = 7) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  };

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

  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  // Initialize authentication state
  useEffect(() => {
    const initAuth = () => {
      const isLoggedIn = getCookie("isLoggedIn");
      const userData = getCookie("userData");
      
      if (isLoggedIn === "true" && userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          setUser(parsedUserData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Error parsing user data:", error);
          // Clear invalid cookies
          deleteCookie("isLoggedIn");
          deleteCookie("userData");
          deleteCookie("userToken");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Utility functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return re.test(password);
  };

  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const logout = () => {
    deleteCookie("isLoggedIn");
    deleteCookie("userData");
    deleteCookie("userToken");
    setUser(null);
    setIsAuthenticated(false);
  };

  // Theme management
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme || "light";
  });

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    // Apply theme to document
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Apply theme on mount
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Notification system
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = generateId();
    const newNotification = {
      id,
      type: "info",
      title: "",
      message: "",
      duration: 5000,
      ...notification,
      timestamp: new Date().toISOString(),
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove notification
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Context value
  const contextValue = {
    // Configuration
    baseUrl,
    GLOBLEURLFORS3,

    // Authentication
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    loading,
    logout,

    // Cookie management
    setCookie,
    getCookie,
    deleteCookie,

    // Utility functions
    formatCurrency,
    formatDate,
    formatDateTime,
    truncateText,
    generateId,
    validateEmail,
    validatePassword,
    debounce,

    // Theme
    theme,
    toggleTheme,

    // Notifications
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,

    // Constants
    USER_ROLES: {
      ADMIN: "admin",
      MODERATOR: "moderator",
      USER: "user",
    },

    GAME_CATEGORIES: [
      "Action",
      "Adventure",
      "Puzzle",
      "Strategy",
      "Sports",
      "Racing",
      "Card",
      "Board",
      "Trivia",
      "Other",
    ],

    CONTEST_STATUS: {
      DRAFT: "draft",
      UPCOMING: "upcoming",
      LIVE: "live",
      ENDED: "ended",
      CANCELLED: "cancelled",
    },

    NOTIFICATION_TYPES: {
      INFO: "info",
      SUCCESS: "success",
      WARNING: "warning",
      ERROR: "error",
    },

    // API Status codes
    HTTP_STATUS: {
      OK: 200,
      CREATED: 201,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      INTERNAL_SERVER_ERROR: 500,
    },
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
};