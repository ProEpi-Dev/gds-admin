export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/v1';

export const APP_NAME = 'Guardiões da Saúde';

/** App móvel oficial (Google Play) — usado após confirmação de email, etc. */
export const GUARDIOES_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.guardioesapp&pcampaignid=web_share';

export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 20,
  maxPageSize: 100,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
};

