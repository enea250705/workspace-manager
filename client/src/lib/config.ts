/**
 * Configuration file for environment-specific settings
 */

// API URL - Use environment variable if available, otherwise default to local development URL
export const API_URL = import.meta.env.VITE_API_URL || '';

// WebSocket URL - Use environment variable if available, otherwise default to local development URL
export const WS_URL = import.meta.env.VITE_WS_URL || '';

// Function to get the full API endpoint URL
export function getApiUrl(endpoint: string): string {
  // If the endpoint already starts with http, return it as is (absolute URL)
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // If the endpoint already starts with /api, just append it to the base URL
  if (endpoint.startsWith('/api')) {
    return `${API_URL}${endpoint}`;
  }
  
  // Otherwise, ensure it has the /api prefix
  return `${API_URL}/api/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
}

// Function to get the WebSocket URL
export function getWsUrl(userId: number): string {
  return `${WS_URL}?userId=${userId}`;
}

// Check if we're in production environment
export const isProduction = import.meta.env.PROD === true;

// Check if we're in development environment
export const isDevelopment = import.meta.env.DEV === true;