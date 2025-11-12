export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/v1';

export const APP_NAME = 'Guardiões da Saúde - Admin';

export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 20,
  maxPageSize: 100,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
};

