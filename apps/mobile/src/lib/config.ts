export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? '',
};

export const isConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey && config.webUrl);
