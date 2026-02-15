const isDev = process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENV === 'development';

export const FeatureFlags = {
  SHOW_TEST_LOGIN: isDev,
  SHOW_DEBUG_INFO: isDev,
  ENABLE_AI_SEARCH: true,
} as const;

export const isDevMode = (): boolean => isDev;
